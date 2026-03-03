import { ClarifaiStub, grpc } from "clarifai-nodejs-grpc";

const stub = ClarifaiStub.grpc();

const metadata = new grpc.Metadata();
metadata.set("authorization", `Key ${process.env.CLARIFAI_PAT}`);

const USER_ID = "growpixels";
const APP_ID = "growpixels-fraudapi";
const WORKFLOW_ID = "multilingual-text-moderation-classifier";

/**
 * Tier-1 moderation gate
 * Returns: ALLOW | BLOCK | REVIEW
 */
export async function clarifaiTier1(text) {
  try {
    const response = await new Promise((resolve, reject) => {
      stub.PostWorkflowResults(
        {
          user_app_id: {
            user_id: USER_ID,
            app_id: APP_ID
          },
          workflow_id: WORKFLOW_ID,
          inputs: [
            {
              data: {
                text: { raw: text }
              }
            }
          ]
        },
        metadata,
        (err, res) => {
          if (err) reject(err);
          else resolve(res);
        }
      );
    });

    // ---- SAFE OUTPUT EXTRACTION ----
    const outputs = response.results?.[0]?.outputs ?? [];
    const moderationOutput = outputs.find(
      o => o?.data?.concepts
    );

    if (!moderationOutput) {
      // No harmful signals - safe
      return "ALLOW";
    }

    const concepts = moderationOutput.data.concepts;
    const scores = {};

    for (const c of concepts) {
      scores[c.name] = c.value;
    }

    // ---- HARD BLOCK RULES ----
    if (scores.severe_toxic >= 0.8) return "BLOCK";
    if (scores.identity_hate >= 0.8) return "BLOCK";
    if (scores.obscene >= 0.85) return "BLOCK";

    // ---- CLEAR ALLOW ----
    const allLow = Object.values(scores).every(v => v <= 0.2);
    if (allLow) return "ALLOW";

    return "REVIEW";

  } catch (err) {
    console.error("[Clarifai] error:", err.message);
    return "REVIEW";
  }
}
