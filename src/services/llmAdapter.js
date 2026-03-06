import { runGptOss } from "./gptTier2.js";
import { circuitBreaker } from "./llmCircuitBreaker.js";

export async function runLLM({ payload }) {
  const provider = process.env.LLM_PROVIDER || "gpt-oss";

  console.log("🧠 LLM Adapter → Provider:", provider);

  switch (provider) {
    case "gpt-oss":
      return await circuitBreaker.execute(() =>
        runGptOss({ payload })
      );

    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
