// src/services/riskEngine.js

export function calculateRisk(data) {
  let score = 0;
  const reasons = [];

  // Feature extraction (safe defaults)
  const features = {
    amount: data.amount ?? 0,
    velocity_hits: data.velocity_hits ?? 0,
    device_hits: data.device_hits ?? 0,
    country_mismatch:
      data.ip_country &&
      data.shipping_country &&
      data.ip_country !== data.shipping_country
        ? 1
        : 0
  };

  // Weights (acts like a simple linear ML model)
  const WEIGHTS = {
    amount: 0.04,
    velocity_hits: 8,
    device_hits: 10,
    country_mismatch: 20
  };

  // Weighted score
  let mlScore = 0;
  mlScore += features.amount * WEIGHTS.amount;
  mlScore += features.velocity_hits * WEIGHTS.velocity_hits;
  mlScore += features.device_hits * WEIGHTS.device_hits;
  mlScore += features.country_mismatch * WEIGHTS.country_mismatch;

  score = Math.round(mlScore);

  // Reason tagging (explainability)
  if (features.velocity_hits >= 5) reasons.push("velocity_detected");
  if (features.device_hits >= 3) reasons.push("device_reuse");
  if (features.country_mismatch) reasons.push("shipping_mismatch");
  if (features.amount >= 500) reasons.push("high_amount");

  // Decision thresholds
  const decision =
    score >= 80 ? "block" :
    score >= 40 ? "review" :
    "approve";

  return {
    risk_score: score,
    decision,
    reasons
  };
}
