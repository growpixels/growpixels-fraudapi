import { transactionSignals } from "./transactionSignals.js";
import { velocitySignals } from "./velocitySignals.js";
import { deviceSignals } from "./deviceSignals.js";
import { geoSignals } from "./geoSignals.js";
import { binSignals } from "./binSignals.js";
import { accountSignals } from "./accountSignals.js";
import { merchantSignals } from "./merchantSignals.js";
import { emailSignals } from "./emailSignals.js";

export function calculateRiskScore(event) {

  let score = 0;
  const reasons = [];

  const modules = [
    transactionSignals,
    velocitySignals,
    deviceSignals,
    geoSignals,
    binSignals,
    accountSignals,
    merchantSignals,
    emailSignals
  ];

  for (const module of modules) {

    const result = module(event);

    if (!result) continue;

    score += result.score;

    if (result.reasons) {
      reasons.push(...result.reasons);
    }
  }

  score = Math.min(score, 100);

  return score;
}
