import { kafka } from "./client.js";

/**
 * Kafka producer singleton
 * Fire-and-forget semantics
 */

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  idempotent: true,
  maxInFlightRequests: 5
});

let isConnected = false;
let isConnecting = false;

async function connectProducer() {
  if (isConnected || isConnecting) return;

  isConnecting = true;
  try {
    await producer.connect();
    isConnected = true;
    console.log("[Kafka] Producer connected");
  } catch (err) {
    console.error("[Kafka] Producer connection failed:", err.message);
  } finally {
    isConnecting = false;
  }
}

process.on("SIGTERM", async () => {
  if (isConnected) {
    await producer.disconnect();
    console.log("[Kafka] Producer disconnected");
  }
});

export async function sendFraudEvent(event) {
  try {
    await connectProducer();

    if (!isConnected) {
      console.warn("[Kafka] Producer not connected, event dropped");
      return;
    }

    await producer.send({
      topic: "fraud.events",
      messages: [
        {
          key: event.transaction_id,
          value: JSON.stringify(event),
          headers: {
            event_type: event.event_type
          }
        }
      ]
    });
  } catch (err) {
    console.error("[Kafka] Publish failed:", err.message);
  }
}
