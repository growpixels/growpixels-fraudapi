import {
  canCallGPT,
  recordGPTCall,
} from "./gptRateLimiter.js";

/**
 * GPT-OSS-120B escalation tier
 * Last resort only
 */
export async function runGPTOSS({ text, metadata, priorSignals }) {
  // 🛑 Hard stop if limit reached
  if (!canCallGPT()) {
    return {
      decision: "REVIEW",
      reason: "gpt_daily_limit_reached",
    };
  }

  // 🛑 Proxy not configured
  if (!global.gptOSSProxy || typeof global.gptOSSProxy.run !== "function") {
    return {
      decision: "REVIEW",
      reason: "gpt_proxy_not_configured",
    };
  }

  try {
    recordGPTCall();

    const res = await global.gptOSSProxy.run({
      text,
      metadata,
      signals: priorSignals,
    });

    // 🔒 Normalize response
    return {
      decision:
        res?.decision === "ALLOW" ||
        res?.decision === "BLOCK" ||
        res?.decision === "REVIEW"
          ? res.decision
          : "REVIEW",
      risk_score:
        typeof res?.risk_score === "number" ? res.risk_score : null,
      reason: "gpt_oss",
    };
  } catch (err) {
    console.error("❌ GPT-OSS error:", err.message);

    return {
      decision: "REVIEW",
      reason: "gpt_oss_error",
    };
  }
}
