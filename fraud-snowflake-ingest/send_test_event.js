import { Kafka } from "kafkajs";
import { randomUUID } from "crypto";

/**
 * ⚠️ TEMPORARY HARDCODED VALUES
 * We are doing this ONLY to remove confusion.
 * You can move them back to .env later.
 */

const KAFKA_BROKERS = "pkc-j9v81q.us-east-2.aws.confluent.cloud:9092";
const KAFKA_USERNAME = "HDWI57CTHN6QLY55";
const KAFKA_PASSWORD = "cfltMCFLftvoVzPl+A7lkGyUdi3WfkEMsM9RvwoZJCPme1wiLo3fbJS6twmcTNUQ";

const kafka = new Kafka({
  clientId: "fraud-test-producer",
  brokers: [KAFKA_BROKERS],
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: KAFKA_USERNAME,
    password: KAFKA_PASSWORD,
  },
});

const producer = kafka.producer();

async function send() {
  await producer.connect();

  const event = {
    event_id: randomUUID(),
    event_type: "payment",
    event_ts: new Date().toISOString(),
    merchant_id: "merchant_demo",
    user_id: "user_123",

    raw_event: {
      message: "please verify otp 123456",
      amount: 4999,
      currency: "INR",
    },

    features: {
      ip_risk: "medium",
      device: "android",
    },
  };

  await producer.send({
    topic: "fraud.events",
    messages: [{ value: JSON.stringify(event) }],
  });

  console.log("✅ EVENT SENT:", event.event_id);

  await producer.disconnect();
}

send().catch((err) => {
  console.error("❌ FAILED TO SEND EVENT");
  console.error(err);
});
