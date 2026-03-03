import "dotenv/config";
import { kafka } from "./kafka/client.js";

const producer = kafka.producer();

await producer.connect();

const event = {
  event_id: "test_opus_001",
  user_id: "user_456",
  amount: 1850,
  currency: "USD",
  text: "Hi, I'm having trouble completing my purchase and the system asked me to confirm some information. Can you help me proceed?",
  ip: "8.8.4.4",
  email: "buyer@example.com",
};

await producer.send({
  topic: process.env.KAFKA_INPUT_TOPIC,
  messages: [
    {
      key: event.user_id,
      value: JSON.stringify(event),
    },
  ],
});

console.log("✅ Test event sent");

await producer.disconnect();
process.exit(0);
