import "dotenv/config";
import { kafka } from "./kafka/client.js";

const consumer = kafka.consumer({ groupId: "debug-reader" });

await consumer.connect();
await consumer.subscribe({
  topic: process.env.KAFKA_OUTPUT_TOPIC,
  fromBeginning: false,
});

await consumer.run({
  eachMessage: async ({ message }) => {
    console.log("📦 ENRICHED OUTPUT:", JSON.parse(message.value.toString()));
  },
});
