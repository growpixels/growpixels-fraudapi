export function thresholdDecision(score) {

  if (score >= 80) {
    return "BLOCK";
  }

  if (score >= 60) {
    return "REVIEW";
  }

  return "ALLOW";
}
