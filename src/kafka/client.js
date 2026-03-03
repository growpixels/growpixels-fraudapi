import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
console.log("KAFKA_BROKERS =", process.env.KAFKA_BROKERS);
import { Kafka } from "kafkajs";

if (!process.env.KAFKA_BROKERS) {
  throw new Error("KAFKA_BROKERS is not set");
}

export const kafka = new Kafka({
  clientId: "fraud-detection-api",
  brokers: process.env.KAFKA_BROKERS.split(","),
  ssl: true,
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});
