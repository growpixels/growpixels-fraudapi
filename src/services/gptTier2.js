import axios from "axios";

export async function runGptOss({ payload }) {
  const endpoint = process.env.LLM_ENDPOINT;

  if (!endpoint) {
    throw new Error("LLM_ENDPOINT is missing");
  }

  console.log("🚀 Calling Proxy Worker:", endpoint);

  const response = await axios.post(
    endpoint,
    {
      model: process.env.LLM_MODEL || "gpt-oss-120b",
      messages: [
        {
          role: "system",
          content:
            "You are a fraud detection engine. Respond ONLY in JSON: { \"score\": number between 0 and 100 }"
        },
        {
          role: "user",
          content: JSON.stringify(payload)
        }
      ],
      stream: false,
      max_tokens: 1000,
      temperature: 0.2
    },
    {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 20000
    }
  );

  const content = response.data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Invalid LLM response structure");
  }

  try {
    const parsed = JSON.parse(content);
    return parsed;
  } catch {
    throw new Error("LLM returned non-JSON content");
  }
}
