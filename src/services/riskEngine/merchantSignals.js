export function merchantSignals(event) {

  let score = 0;
  const reasons = [];

  const merchantRiskTable = {
    electronics: 20,
    giftcards: 35,
    digital_goods: 30,
    fashion: 15,
    unknown: 10
  };

  if (event.merchant_category) {
    score += merchantRiskTable[event.merchant_category] || 10;
    reasons.push("merchant_risk_profile");
  }

  return { score, reasons };
}
