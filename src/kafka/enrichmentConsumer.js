// src/kafka/enrichmentConsumer.js

import { Kafka, logLevel } from "kafkajs";
import dotenv from "dotenv";
import { runFraudPipeline } from "../pipeline/fraudPipeline.js";

dotenv.config();

// ----------------------------
// Validate ENV
// ----------------------------
if (!process.env.KAFKA_BROKERS) {
  console.error("❌ Missing KAFKA_BROKERS in .env");
  process.exit(1);
}

if (!process.env.KAFKA_USERNAME || !process.env.KAFKA_PASSWORD) {
  console.error("❌ Missing KAFKA_USERNAME or KAFKA_PASSWORD");
  process.exit(1);
}

// ----------------------------
// Kafka Setup (Confluent Cloud)
// ----------------------------
const kafka = new Kafka({
  clientId: "fraud-enrichment-service",
  brokers: process.env.KAFKA_BROKERS.split(","),
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
  logLevel: logLevel.NOTHING, // prevent kafkajs spam
});

const consumer = kafka.consumer({
  groupId:
    process.env.KAFKA_GROUP_ID || "fraud-enrichment-group",
});

// ----------------------------
// Start Consumer
// ----------------------------
async function start() {
  try {
    console.log("🚀 Fraud Enrichment Service Booting...");
    console.log("🌍 Environment:", process.env.NODE_ENV || "dev");

    console.log("🔌 Connecting to Kafka...");
    await consumer.connect();
    console.log("✅ Connected to Kafka");

    await consumer.subscribe({
      topic: process.env.KAFKA_TOPIC || "fraud.events",
      fromBeginning: false,
    });

    console.log("📡 Subscribed to topic:", process.env.KAFKA_TOPIC || "fraud.events");
    console.log("👂 Listening for events...");
    console.log("=====================================");

    await consumer.run({
      eachMessage: async ({ message }) => {
        try {
          const event = JSON.parse(message.value.toString());

          console.log("📩 NEW EVENT RECEIVED");
          console.log("Event ID:", event.event_id);

          const result = await runFraudPipeline(event);

          console.log("📌 FINAL DECISION:", result.final_decision);
          console.log("📌 FINAL SCORE:", result.final_score);
          console.log("🧠 DECIDED BY:", result.decided_by);
          console.log("=====================================");

        } catch (err) {
          console.error("❌ Event processing error:", err.message);
        }
      },
    });

  } catch (err) {
    console.error("❌ Kafka startup error:", err.message);
    process.exit(1);
  }
}

// ----------------------------
// Graceful Shutdown
// ----------------------------
async function shutdown() {
  console.log("🛑 Shutting down gracefully...");

  try {
    await consumer.disconnect();
    console.log("✅ Kafka consumer disconnected");
  } catch (err) {
    console.error("⚠️ Error during disconnect:", err.message);
  }

  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ----------------------------
start();
