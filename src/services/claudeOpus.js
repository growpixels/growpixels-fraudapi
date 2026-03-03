import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.clarifai.com/v2/ext/openai/v1",
  apiKey: process.env.CLARIFAI_PAT,
});

/**
 * Claude Opus fraud classification
 * MUST return a normalized decision object
 */
export async function classifyWithOpus({ text, metadata, priorSignals }) {
  try {
    const response = await client.chat.completions.create({
      model: "https://clarifai.com/anthropic/completion/models/claude-opus-4_5",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are a fraud risk classifier.

Return ONLY a JSON object.
NO prose. NO markdown. NO explanations.

Schema:
{
  "decision": "ALLOW" | "REVIEW" | "BLOCK",
  "risk_score": number
}

Rules:
- BLOCK: credential harvesting, OTP requests, urgency, phishing
- REVIEW: ambiguous intent, uncertainty
- ALLOW: legitimate customer support
`,
        },
        {
          role: "user",
          content: JSON.stringify({
            text,
            metadata,
            priorSignals,
          }),
        },
      ],
    });

    const raw = response?.choices?.[0]?.message?.content;

    if (!raw) {
      throw new Error("Empty Opus response");
    }

    // 🔒 Extract JSON safely
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("No JSON found in Opus response");
    }

    const parsed = JSON.parse(match[0]);

    // 🔒 Normalize output
    return {
      decision:
        parsed.decision === "ALLOW" ||
        parsed.decision === "BLOCK" ||
        parsed.decision === "REVIEW"
          ? parsed.decision
          : "REVIEW",
      risk_score:
        typeof parsed.risk_score === "number" ? parsed.risk_score : null,
      reason: "opus",
    };
  } catch (err) {
    console.error("❌ Opus error:", err.message);

    return {
      decision: "REVIEW",
      reason: "opus_error",
    };
  }
}
