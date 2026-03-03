import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function runOpenAIModeration(text) {
  try {
    const res = await openai.moderations.create({
      model: "omni-moderation-latest",
      input: text,
    });

    const flagged = res.results[0].flagged;

    if (flagged) {
      return { decision: "BLOCK", reason: "openai_moderation" };
    }

    return { decision: "ALLOW", reason: "openai_moderation" };
  } catch (err) {
    console.error("❌ OpenAI moderation error:", err.message);
    return { decision: "REVIEW", reason: "openai_error" };
  }
}
