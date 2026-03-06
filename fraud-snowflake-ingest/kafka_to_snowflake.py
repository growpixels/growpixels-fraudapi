import os
import json
import signal
from dotenv import load_dotenv

from confluent_kafka import Consumer
import snowflake.connector

# =============================================================================
# ENV
# =============================================================================
load_dotenv()

REQUIRED_ENV = [
    "KAFKA_BROKERS",
    "KAFKA_USERNAME",
    "KAFKA_PASSWORD",
    "SNOWFLAKE_ACCOUNT",
    "SNOWFLAKE_USER",
    "SNOWFLAKE_ROLE",
    "SNOWFLAKE_WAREHOUSE",
    "SNOWFLAKE_DATABASE",
    "SNOWFLAKE_SCHEMA",
    "SNOWFLAKE_PRIVATE_KEY_PATH",
]

missing = [k for k in REQUIRED_ENV if not os.environ.get(k)]
if missing:
    raise RuntimeError(f"Missing env vars: {missing}")

# =============================================================================
# KAFKA CONFIG
# =============================================================================
KAFKA_CONF = {
    "bootstrap.servers": os.environ["KAFKA_BROKERS"],
    "security.protocol": "SASL_SSL",
    "sasl.mechanisms": "PLAIN",
    "sasl.username": os.environ["KAFKA_USERNAME"],
    "sasl.password": os.environ["KAFKA_PASSWORD"],
    "group.id": "fraud-snowflake-consumer",
    "auto.offset.reset": "earliest",
    "enable.auto.commit": False,
}

TOPIC = "fraud.enriched"

# =============================================================================
# SNOWFLAKE CONNECTION
# =============================================================================
with open(os.environ["SNOWFLAKE_PRIVATE_KEY_PATH"], "rb") as f:
    PRIVATE_KEY = f.read()

sf_conn = snowflake.connector.connect(
    account=os.environ["SNOWFLAKE_ACCOUNT"],
    user=os.environ["SNOWFLAKE_USER"],
    private_key=PRIVATE_KEY,
    role=os.environ["SNOWFLAKE_ROLE"],
    warehouse=os.environ["SNOWFLAKE_WAREHOUSE"],
    database=os.environ["SNOWFLAKE_DATABASE"],
    schema=os.environ["SNOWFLAKE_SCHEMA"],
)

sf_cursor = sf_conn.cursor()

print("[Snowflake] Connected")

# =============================================================================
# MERGE SQL (IDEMPOTENT)
# =============================================================================
MERGE_SQL = """
MERGE INTO FRAUD_DB.FRAUD.ENRICHED t
USING (
  SELECT
    %(event_id)s                     AS EVENT_ID,
    %(event_type)s                   AS EVENT_TYPE,
    TO_TIMESTAMP_NTZ(%(event_ts)s)   AS EVENT_TS,
    %(merchant_id)s                  AS MERCHANT_ID,
    %(user_id)s                      AS USER_ID,
    PARSE_JSON(%(raw_event)s)        AS RAW_EVENT,
    PARSE_JSON(%(features)s)         AS FEATURES,
    %(decision)s                     AS DECISION,
    %(decided_by)s                   AS DECIDED_BY,
    PARSE_JSON(%(decision_trace)s)   AS DECISION_TRACE,
    PARSE_JSON(%(cost_guard)s)       AS COST_GUARD,
    TO_TIMESTAMP_NTZ(%(enriched_at)s) AS ENRICHED_AT,
    %(partition)s                    AS KAFKA_PARTITION,
    %(offset)s                       AS KAFKA_OFFSET
) s
ON t.EVENT_ID = s.EVENT_ID
WHEN NOT MATCHED THEN INSERT (
  EVENT_ID, EVENT_TYPE, EVENT_TS,
  MERCHANT_ID, USER_ID,
  RAW_EVENT, FEATURES,
  DECISION, DECIDED_BY,
  DECISION_TRACE, COST_GUARD,
  ENRICHED_AT,
  KAFKA_PARTITION, KAFKA_OFFSET
)
VALUES (
  s.EVENT_ID, s.EVENT_TYPE, s.EVENT_TS,
  s.MERCHANT_ID, s.USER_ID,
  s.RAW_EVENT, s.FEATURES,
  s.DECISION, s.DECIDED_BY,
  s.DECISION_TRACE, s.COST_GUARD,
  s.ENRICHED_AT,
  s.KAFKA_PARTITION, s.KAFKA_OFFSET
);
"""

# =============================================================================
# KAFKA CONSUMER
# =============================================================================
consumer = Consumer(KAFKA_CONF)
consumer.subscribe([TOPIC])

print("[Kafka] Consumer started")

running = True


def shutdown(sig, frame):
    global running
    running = False
    print("Shutting down...")


signal.signal(signal.SIGINT, shutdown)
signal.signal(signal.SIGTERM, shutdown)

# =============================================================================
# MAIN LOOP
# =============================================================================
while running:
    msg = consumer.poll(1.0)
    if msg is None:
        continue

    if msg.error():
        print("Kafka error:", msg.error())
        continue

    try:
        payload = json.loads(msg.value().decode("utf-8"))

        # Hard guard: event_id is mandatory
        if not payload.get("event_id"):
            print("❌ Missing event_id, skipping message")
            consumer.commit(msg)
            continue

        record = {
            "event_id": payload["event_id"],
            "event_type": payload.get("event_type"),
            "event_ts": payload.get("event_ts"),
            "merchant_id": payload.get("merchant_id"),
            "user_id": payload.get("user_id"),
            "raw_event": json.dumps(payload.get("raw_event", payload)),
            "features": json.dumps(payload.get("features", {})),
            "decision": payload.get("decision"),
            "decided_by": payload.get("decided_by"),
            "decision_trace": json.dumps(payload.get("decision_trace", [])),
            "cost_guard": json.dumps(payload.get("cost_guard", {})),
            "enriched_at": payload.get("enriched_at"),
            "partition": msg.partition(),
            "offset": msg.offset(),
        }

        sf_cursor.execute(MERGE_SQL, record)
        sf_conn.commit()
        consumer.commit(msg)

        print(f"✅ Upserted event {record['event_id']}")

    except Exception as e:
        print("❌ Failed to process message:", e)
        print("Payload:", msg.value())

# =============================================================================
# CLEANUP
# =============================================================================
consumer.close()
sf_cursor.close()
sf_conn.close()
print("Shutdown complete")
