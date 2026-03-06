export function deviceSignals(event) {

  let score = 0;
  const reasons = [];

  if (event.device_new === true) {
    score += 10;
    reasons.push("new_device");
  }

  if (event.device_hits >= 2) {
    score += 15;
    reasons.push("multi_device_usage");
  }

  if (event.device_trust_score !== undefined && event.device_trust_score < 0.4) {
    score += 20;
    reasons.push("low_device_trust");
  }

  if (event.headless_browser === true) {
    score += 25;
    reasons.push("headless_browser_detected");
  }

  return { score, reasons };
}
