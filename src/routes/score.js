import express from "express";
import { calculateRisk } from "../services/riskEngine.js";
import { sendFraudEvent } from "../kafka/producer.js";

/**
 * Fraud scoring HTTP API
 * - synchronous risk scoring
 * - async Kafka event emission
 */

const router = express.Router();

function validateTransaction(txn) {
  const errors = [];

  if (!txn.transaction_id) errors.push("transaction_id missing");
  if (!txn.user_id) errors.push("user_id missing");
  if (typeof txn.amount !== "number") errors.push("amount invalid");

  return errors;
}

router.post("/score", async (req, res) => {
  const txn = req.body;

  const validationErrors = validateTransaction(txn);
  if (validationErrors.length) {
    return res.status(400).json({
      error: "Invalid transaction payload",
      details: validationErrors
    });
  }

  const risk = calculateRisk(txn);

  const fraudEvent = {
    event_type: "transaction_scored",
    transaction_id: txn.transaction_id,
    user_id: txn.user_id,
    amount: txn.amount,
    risk_score: risk.risk_score,
    decision: risk.decision,
    reasons: risk.reasons,
    model_version: "v1-linear",
    received_at: Date.now(),
    raw: txn
  };

  // Non-blocking Kafka
  sendFraudEvent(fraudEvent);

  return res.json({
    transaction_id: txn.transaction_id,
    risk_score: risk.risk_score,
    decision: risk.decision,
    reasons: risk.reasons
  });
});

export default router;
