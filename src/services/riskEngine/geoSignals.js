export function geoSignals(event) {

  let score = 0;
  const reasons = [];

  if (
    event.ip_country &&
    event.shipping_country &&
    event.ip_country !== event.shipping_country
  ) {
    score += 25;
    reasons.push("geo_mismatch");
  }

  if (event.vpn_detected === true) {
    score += 20;
    reasons.push("vpn_detected");
  }

  if (event.proxy_detected === true) {
    score += 20;
    reasons.push("proxy_detected");
  }

  return { score, reasons };
}
