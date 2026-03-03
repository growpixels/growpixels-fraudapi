import "dotenv/config";
import { kafka } from "./client.js";

import { runOpenAIModeration } from "../services/openaiModeration.js";
import { runGPTOSS } from "../services/gptTier2.js";
import { classifyWithOpus } from "../services/claudeOpus.js";

/* -------------------------------------------------
 * Kafka config
 * ------------------------------------------------- */
const INPUT_TOPIC = process.env.KAFKA_INPUT_TOPIC;
const OUTPUT_TOPIC = process.env.KAFKA_OUTPUT_TOPIC;

if (!INPUT_TOPIC || !OUTPUT_TOPIC) {
  throw new Error("Kafka topics are not configured");
}

const consumer = kafka.consumer({ groupId: "fraud-enrichment-v3" });
const producer = kafka.producer();

/* -------------------------------------------------
 * Cost guards
 * ------------------------------------------------- */
const MAX_GPT_CALLS_PER_EVENT = 1;
const MAX_OPUS_CALLS_PER_EVENT = 1;

/* -------------------------------------------------
 * Tier 0 — Regex
 * ------------------------------------------------- */
function regexBlock(text = "") {
  return /(send\s*otp|cvv|card\s*number|verify\s*your\s*card|bank\s*details)/i.test(
    text
  );
}

/* -------------------------------------------------
 * Start consumer
 * ------------------------------------------------- */
async function start() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({
    topic: INPUT_TOPIC,
    fromBeginning: false,
  });

  console.log("[Kafka] Enrichment consumer connected");

  await consumer.run({
    eachMessage: async ({ message }) => {
      let payload;

      /* -----------------------------
       * Parse event
       * ----------------------------- */
      try {
        payload = JSON.parse(message.value.toString());
      } catch {
        return;
      }
      console.log("📥 Node received event:", payload.event_id);
      const receivedAt = Date.now();
      const text = payload.text || "";

      /* -----------------------------
       * Decision trace (CANONICAL)
       * ----------------------------- */
      const trace = {
        event_id: payload.event_id,
        final_decision: "REVIEW",
        final_tier: null,
        risk_score: null,

        tiers: [],

        cost: {
          openai_moderation: 0,
          gpt_oss: 0,
          claude_opus: 0,
        },

        timestamps: {
          received_at: new Date(receivedAt).toISOString(),
          decided_at: null,
        },
      };

      let gptCalls = 0;
      let opusCalls = 0;

      /* -----------------------------
       * Tier 0 — Regex
       * ----------------------------- */
      const t0 = Date.now();
      if (regexBlock(text)) {
        trace.tiers.push({
          tier: "regex",
          outcome: "block",
          reason: "regex_match",
          latency_ms: Date.now() - t0,
        });

        trace.final_decision = "BLOCK";
        trace.final_tier = "regex";
      }

      /* -----------------------------
       * Tier 1 — OpenAI moderation (best-effort)
       * ----------------------------- */
      if (!trace.final_tier) {
        const t1 = Date.now();
        try {
          const mod = await runOpenAIModeration(text);
          trace.cost.openai_moderation += 1;

          trace.tiers.push({
            tier: "openai_moderation",
            outcome: mod.decision.toLowerCase(),
            reason: mod.reason,
            latency_ms: Date.now() - t1,
          });

          if (mod.decision !== "REVIEW") {
            trace.final_decision = mod.decision;
            trace.final_tier = "openai_moderation";
          }
        } catch {
          trace.tiers.push({
            tier: "openai_moderation",
            outcome: "error",
            reason: "rate_limited",
          });
        }
      }

      /* -----------------------------
       * Tier 2 — GPT-OSS-120B (workhorse)
       * ----------------------------- */
      if (!trace.final_tier && gptCalls < MAX_GPT_CALLS_PER_EVENT) {
        const t2 = Date.now();
        gptCalls++;

        const gpt = await runGPTOSS({
          text,
          metadata: payload,
          priorSignals: trace.tiers,
        });

        trace.cost.gpt_oss += 1;
        trace.tiers.push({
          tier: "gpt_oss",
          outcome: gpt.decision.toLowerCase(),
          reason: gpt.reason,
          latency_ms: Date.now() - t2,
        });

        if (gpt.decision !== "REVIEW") {
          trace.final_decision = gpt.decision;
          trace.final_tier = "gpt_oss";
          trace.risk_score = gpt.risk_score ?? null;
        }
      }

      /* -----------------------------
       * Tier 3 — Claude Opus (FINAL JUDGE)
       * ----------------------------- */
      if (!trace.final_tier && opusCalls < MAX_OPUS_CALLS_PER_EVENT) {
        const t3 = Date.now();
        opusCalls++;

        const opus = await classifyWithOpus({
          text,
          metadata: payload,
          priorSignals: trace.tiers,
        });

        trace.cost.claude_opus += 1;
        trace.tiers.push({
          tier: "claude_opus",
          outcome: opus.decision.toLowerCase(),
          reason: opus.reason,
          latency_ms: Date.now() - t3,
        });

        trace.final_decision = opus.decision;
        trace.final_tier = "claude_opus";
        trace.risk_score = opus.risk_score ?? null;
      }

      /* -----------------------------
       * Finalize trace
       * ----------------------------- */
      trace.timestamps.decided_at = new Date().toISOString();

      console.log(
        `✅ FINAL DECISION: ${trace.final_decision} (by ${trace.final_tier})`
      );

      /* -----------------------------
       * Emit enriched event
       * ----------------------------- */
      await producer.send({
        topic: OUTPUT_TOPIC,
        messages: [
          {
            key: trace.event_id,
            value: JSON.stringify({
              ...payload,
              decision_trace: trace,
            }),
          },
        ],
      });
    },
  });
}

/* -------------------------------------------------
 * Boot
 * ------------------------------------------------- */
start().catch((err) => {
  console.error("❌ Enrichment consumer crashed:", err);
  process.exit(1);
});
