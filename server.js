import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import { SYSTEM_PROMPT } from "./prompt.js";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.send("AI Food Co-Pilot backend running");
});

/* -------- INTENT ROUTER -------- */

function buildUserMessage(payload) {
  const { intent, data } = payload;

  switch (intent) {

    case "COMPARE_PRODUCTS":
      return `
The user is choosing between two similar food products.

Product A:
${JSON.stringify(data.productA, null, 2)}

Product B:
${JSON.stringify(data.productB, null, 2)}

Help the user choose.
`;

    case "SINGLE_PRODUCT_RISK":
      return `
The user is looking at a single food product and is unsure if they should worry.

Product:
${JSON.stringify(data.product, null, 2)}

Help them understand if anything matters and when.
`;

    case "INGREDIENT_EXPLAIN":
      return `
The user is asking about a specific ingredient.

Ingredient:
${data.ingredient}

Explain whether it is worth worrying about and in what context.
`;

    /* ---------- FOLLOW-UPS ---------- */

    case "FOLLOWUP_WHY":
      return `
The user wants a deeper explanation of the previous recommendation.

Explain the reasoning more clearly without introducing new ingredients.
`;

    case "FOLLOWUP_DAILY":
      return `
The user is asking how the previous recommendation changes if this is eaten frequently.

Explain how frequency affects the decision.
`;

    case "FOLLOWUP_SAFE":
      return `
The user wants a clear safer default based on the previous discussion.

Give a concise recommendation and why.
`;

    default:
      return `
The user asked a follow-up question.

Respond helpfully using the previous context.
`;
  }
}

/* -------- PIPELINE ENDPOINT -------- */

app.post("/pipeline", async (req, res) => {
  try {
    const userMessage = buildUserMessage(req.body);

    const response = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3.1:8b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage }
        ],
        stream: false
      })
    });

    const data = await response.json();

    let explanation =
      "The AI could not generate a response. Try again.";

    if (data?.message?.content) {
      explanation = data.message.content;
    }

    res.json({ explanation });

  } catch (err) {
    console.error("Pipeline error:", err);
    res.status(500).json({
      explanation: "Something went wrong while reasoning."
    });
  }
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
