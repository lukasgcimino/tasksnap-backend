import OpenAI from "openai";

const openai = new OpenAI({
  // Stays as a Vercel environment variable — never hardcode this.
  apiKey: process.env.OPENAI_API_KEY,
});

export default async (req, res) => {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { choreName, imageBase64 } = req.body;
    if (!choreName || !imageBase64) {
      return res
        .status(400)
        .json({ error: "Missing choreName or imageBase64" });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 120,
      messages: [
        {
          role: "system",
          content:
            `You are a lenient task-verification assistant for a chore app. ` +
            `Look at the image and decide whether it shows the chore "${choreName}" is ` +
            `MOSTLY done. Be generous: if the space or task looks roughly 70% or more ` +
            `complete, or shows clear genuine effort toward "${choreName}", mark it verified. ` +
            `Do NOT demand perfection — a little mess left, a few stray items, or imperfect ` +
            `framing is fine. Only mark it NOT verified if the image clearly shows the chore ` +
            `was not attempted, is unrelated to "${choreName}", or is an obvious attempt to ` +
            `trick you (a blank wall, a random unrelated object, a screenshot). ` +
            `Respond with ONLY a JSON object: {"verified": true/false, "reason": "brief explanation"}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Is the chore "${choreName}" mostly done here? Be lenient. JSON only.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`,
                detail: "low",
              },
            },
          ],
        },
      ],
    });

    let content = response.choices[0].message.content.trim();
    content = content.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(content);

    return res.status(200).json({
      verified: parsed.verified === true,
      reason: parsed.reason || "",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      error: error.message || "Verification failed",
    });
  }
};
