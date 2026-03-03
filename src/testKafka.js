// src/testKafka.ts
// Tests the REAL Kafka producer abstraction

import dotenv from 'dotenv';
import { sendFraudEvent } from './kafka/producer.js';

dotenv.config();

async function run() {
  await sendFraudEvent({
    merchantId: 'm_test_001',
    transactionId: 'txn_test_123',
    userId: 'user_test',
    amount: 999,
    score: 87,
    decision: 'block',
    reasons: ['velocity_high', 'ip_risk'],
    timestamp: Date.now(),
  });

  console.log('✅ sendFraudEvent() works');
}

run().catch(err => {
  console.error('❌ Test failed', err);
});
