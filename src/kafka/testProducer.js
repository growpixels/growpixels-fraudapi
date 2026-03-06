// src/kafka/testProducer.js
import { Kafka, logLevel } from "kafkajs";
import dotenv from "dotenv";

dotenv.config();

// -----------------------------
// Validate ENV
// -----------------------------
if (!process.env.KAFKA_BROKERS) {
  console.error("❌ Missing KAFKA_BROKERS in .env");
  process.exit(1);
}

if (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD) {
  console.error("❌ Missing KAFKA_USERNAME or KAFKA_PASSWORD");
  process.exit(1);
}

// -----------------------------
// Kafka Setup
// -----------------------------
const kafka = new Kafka({
  clientId: "fraud-test-producer",
  brokers: process.env.KAFKA_BROKERS.split(","),

  ssl: true,

  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },

  logLevel: logLevel.NOTHING,
});

const producer = kafka.producer();

// -----------------------------
// Produce Test Event
// -----------------------------
async function produceTestEvent() {
  try {
    console.log("📡 Connecting producer to Kafka...");

    await producer.connect();

    console.log("✅ Producer connected");

    // -----------------------------
    // Fraud Simulation Event
    // -----------------------------
    const testEvent = {
      event_id: "gpt_test_event_" + Date.now(),

      // Transaction
      amount: 5200,
      quantity: 3,
      currency: "USD",

      // Velocity
      velocity_hits: 6,
      txn_last_1min: 7,
      txn_last_10min: 18,

      // Device
      device_id: "device_98123",
      device_hits: 3,
      device_new: true,
      device_trust_score: 0.22,

      // Geo
      ip: "102.89.12.44",
      ip_country: "NG",
      shipping_country: "US",

      // BIN
      bin: "559999",
      bin_country: "US",
      card_type: "prepaid",

      // Email
      email: "john+fraud@gmail.com",
      email_domain: "gmail.com",

      // Account
      account_id: "acct_92391",
      account_age_minutes: 4,
      previous_chargebacks: 0,

      // Merchant
      merchant_id: "merchant_123",
      merchant_category: "electronics",

      // Network
      vpn_detected: true,
      proxy_detected: false,

      timestamp: new Date().toISOString(),
    };

    // -----------------------------
    // Send Event
    // -----------------------------
    await producer.send({
      topic: process.env.KAFKA_TOPIC || "fraud.events",
      messages: [
        {
          key: testEvent.event_id,
          value: JSON.stringify(testEvent),
        },
      ],
    });

    console.log("📦 Event sent:", testEvent.event_id);

    await producer.disconnect();

    console.log("🔌 Producer disconnected");
  } catch (err) {
    console.error("❌ Producer error:", err.message);
    process.exit(1);
  }
}

produceTestEvent();
