import "dotenv/config";
import { kafka } from "./client.js";

/**
 * Fraud Events Consumer
 * Purpose:
 * - verify Kafka ingestion
 * - foundation for rules / ML / alerts
 */

const consumer = kafka.consumer({
  groupId: "fraud-consumer-v1"
});

async function startConsumer() {
  await consumer.connect();
  console.log("[Kafka] Consumer connected");

  await consumer.subscribe({
    topic: "fraud.events",
    fromBeginning: false
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const value = message.value.toString();
        const event = JSON.parse(value);

        console.log("----- FRAUD EVENT RECEIVED -----");
        console.log("topic:", topic);
        console.log("partition:", partition);
        console.log("key:", message.key?.toString());
        console.log("event:", event);
        console.log("--------------------------------");
      } catch (err) {
        console.error("[Kafka] Failed to process message:", err.message);
      }
    }
  });
}

process.on("SIGINT", async () => {
  console.log("\n[Kafka] Consumer shutting down...");
  await consumer.disconnect();
  process.exit(0);
});

startConsumer().catch(err => {
  console.error("[Kafka] Consumer crashed:", err);
  process.exit(1);
});
