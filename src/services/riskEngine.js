// src/services/riskEngine.js

import { calculateRiskScore as modularRiskEngine } from "./riskEngine/index.js";

export function calculateRiskScore(event) {
  return modularRiskEngine(event);
}
