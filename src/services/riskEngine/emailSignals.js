export function emailSignals(event) {

  let score = 0;
  const reasons = [];

  if (event.email && event.email.includes("+")) {
    score += 5;
    reasons.push("plus_alias_email");
  }

  const disposableDomains = [
    "mailinator.com",
    "10minutemail.com",
    "tempmail.com"
  ];

  if (event.email_domain && disposableDomains.includes(event.email_domain)) {
    score += 25;
    reasons.push("disposable_email");
  }

  return { score, reasons };
}
