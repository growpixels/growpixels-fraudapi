import json
import os
import time
from dotenv import load_dotenv
from confluent_kafka import Producer

# -------------------------------------------------
# Load env
# -------------------------------------------------
load_dotenv()

KAFKA_BROKERS = os.getenv("KAFKA_BROKERS")
KAFKA_USERNAME = os.getenv("KAFKA_USERNAME")
KAFKA_PASSWORD = os.getenv("KAFKA_PASSWORD")

if not all([KAFKA_BROKERS, KAFKA_USERNAME, KAFKA_PASSWORD]):
    raise RuntimeError(
        "Missing Kafka env vars: "
        "KAFKA_BROKERS / KAFKA_USERNAME / KAFKA_PASSWORD"
    )

TOPIC = "fraud.events"

# -------------------------------------------------
# Kafka Producer (SASL username/password)
# -------------------------------------------------
producer = Producer({
    "bootstrap.servers": KAFKA_BROKERS,
    "security.protocol": "SASL_SSL",
    "sasl.mechanisms": "PLAIN",
    "sasl.username": KAFKA_USERNAME,
    "sasl.password": KAFKA_PASSWORD,
    "acks": "all",
    "linger.ms": 10,
})

# -------------------------------------------------
# Delivery callback
# -------------------------------------------------
def delivery_report(err, msg):
    if err:
        print(f"❌ Delivery failed: {err}")
    else:
        print(
            f"✅ Delivered {msg.key().decode()} "
            f"to {msg.topic()} [{msg.partition()}] @ {msg.offset()}"
        )

# -------------------------------------------------
# Test events
# -------------------------------------------------
events = [
    {
        "event_id": "test_001",
        "user_id": "user_123",
        "amount": 4999,
        "currency": "USD",
        "text": "please send otp and card number urgently",
        "ip": "8.8.8.8",
        "email": "test@example.com",
        "ts": int(time.time() * 1000),
    },
    {
        "event_id": "test_opus_001",
        "user_id": "user_456",
        "amount": 1850,
        "currency": "USD",
        "text": "Hi, I'm having trouble completing my purchase. Can you help me proceed?",
        "ip": "8.8.4.4",
        "email": "buyer@example.com",
        "ts": int(time.time() * 1000),
    },
]

# -------------------------------------------------
# Produce
# -------------------------------------------------
print("🚀 Producing test events...")

for event in events:
    producer.produce(
        topic=TOPIC,
        key=event["event_id"],
        value=json.dumps(event),
        on_delivery=delivery_report,
    )
    producer.poll(0)

producer.flush()
print("🎉 Done")
