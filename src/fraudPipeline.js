import { thresholdDecision } from "../services/thresholdEngine.js";
import { fuseScores } from "../services/scoreFusion.js";
import { runLLM } from "../services/llmAdapter.js";
import { logDecisionTrace } from "../services/telemetry.js";
import { calculateRiskScore } from "../services/riskEngine.js";

export async function runFraudPipeline(event) {
  const decisionTrace = [];

  const baseScore = calculateRiskScore(event);

  decisionTrace.push({
    tier: "risk_engine",
    score: baseScore,
  });

  let llmScore = null;

  if (baseScore >= 40) {
    try {
      const llmResponse = await runLLM({ payload: event });
      llmScore = llmResponse?.score || null;

      decisionTrace.push({
        tier: "llm",
        score: llmScore,
      });
    } catch (err) {
      decisionTrace.push({
        tier: "llm",
        error: err.message,
      });
    }
  }

  const finalScore = fuseScores({ baseScore, llmScore });
  const finalDecision = thresholdDecision(finalScore);

  decisionTrace.push({
    tier: "final",
    score: finalScore,
    decision: finalDecision,
  });

  logDecisionTrace(decisionTrace);

  return {
    final_score: finalScore,
    final_decision: finalDecision,
    decision_trace: decisionTrace,
  };
}
