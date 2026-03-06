class LLMCircuitBreaker {
  constructor({ failureThreshold = 3, resetTimeout = 30000 }) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.failures = 0;
    this.state = "CLOSED";
    this.lastFailureTime = null;
  }

  async execute(fn) {
    if (this.state === "OPEN") {
      if (Date.now() - this.lastFailureTime > this.resetTimeout) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit breaker OPEN");
      }
    }

    try {
      const result = await fn();
      this.success();
      return result;
    } catch (err) {
      this.failure();
      throw err;
    }
  }

  success() {
    this.failures = 0;
    this.state = "CLOSED";
  }

  failure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      this.state = "OPEN";
    }
  }
}

export const circuitBreaker = new LLMCircuitBreaker({});
