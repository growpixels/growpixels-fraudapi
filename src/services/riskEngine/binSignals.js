export function binSignals(event) {

  let score = 0;
  const reasons = [];

  if (event.bin_country && event.ip_country) {
    if (event.bin_country !== event.ip_country) {
      score += 20;
      reasons.push("bin_ip_country_mismatch");
    }
  }

  if (event.card_type === "prepaid") {
    score += 20;
    reasons.push("prepaid_card");
  }

  return { score, reasons };
}
