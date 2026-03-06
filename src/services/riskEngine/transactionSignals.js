export function transactionSignals(event) {

  let score = 0;
  const reasons = [];

  if (event.amount >= 1000) {
    score += 20;
    reasons.push("high_amount");
  }

  if (event.amount >= 5000) {
    score += 25;
    reasons.push("very_high_amount");
  }

  if (event.amount <= 2) {
    score += 15;
    reasons.push("card_testing_small_amount");
  }

  if (event.quantity && event.quantity >= 5) {
    score += 10;
    reasons.push("bulk_purchase");
  }

  return { score, reasons };
}
