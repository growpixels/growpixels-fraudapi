// src/pipeline/fraudPipeline.js

import { thresholdDecision } from "../services/thresholdEngine.js";
import { fuseScores } from "../services/scoreFusion.js";
import { runLLM } from "../services/llmAdapter.js";
import { logDecisionTrace } from "../services/telemetry.js";
import { calculateRiskScore } from "../services/riskEngine.js";

export async function runFraudPipeline(event) {
  const decisionTrace = [];

  // -----------------------------
  // Tier 1: Rule Engine
  // -----------------------------
  const baseScore = calculateRiskScore(event);

  decisionTrace.push({
    tier: "risk_engine",
    risk_score: baseScore,
  });

  // -----------------------------
  // Tier 2: LLM Escalation
  // -----------------------------
  let llmScore = null;

  if (baseScore >= 40) {
    try {
      const llmResponse = await runLLM({ payload: event });

      llmScore = llmResponse?.score ?? null;

      decisionTrace.push({
        tier: "llm",
        llm_score: llmScore,
      });

    } catch (err) {
      decisionTrace.push({
        tier: "llm",
        error: err.message,
      });
    }
  }

  // -----------------------------
  // Fusion
  // -----------------------------
  const finalScore = fuseScores({
    baseScore,
    llmScore,
  });

  const finalDecision = thresholdDecision(finalScore);

  decisionTrace.push({
    tier: "final",
    final_score: finalScore,
    final_decision: finalDecision,
  });

  logDecisionTrace(decisionTrace);

  return {
    final_score: finalScore,
    final_decision: finalDecision,
    decision_trace: decisionTrace,
    decided_by: llmScore ? "fusion_engine" : "risk_engine",
    timestamp: new Date().toISOString(),
  };
}
