export function accountSignals(event) {

  let score = 0;
  const reasons = [];

  if (event.account_age_minutes !== undefined && event.account_age_minutes < 10) {
    score += 25;
    reasons.push("new_account");
  }

  if (event.previous_chargebacks > 0) {
    score += 35;
    reasons.push("past_chargeback_history");
  }

  return { score, reasons };
}
