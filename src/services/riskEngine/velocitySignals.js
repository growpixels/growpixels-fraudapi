export function velocitySignals(event) {

  let score = 0;
  const reasons = [];

  if (event.velocity_hits >= 3) {
    score += 20;
    reasons.push("high_velocity");
  }

  if (event.velocity_hits >= 5) {
    score += 25;
    reasons.push("extreme_velocity");
  }

  if (event.txn_last_1min >= 5) {
    score += 30;
    reasons.push("card_testing_attack");
  }

  if (event.txn_last_10min >= 12) {
    score += 20;
    reasons.push("transaction_burst");
  }

  return { score, reasons };
}
