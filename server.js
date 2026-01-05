import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { SYSTEM_PROMPT } from "./prompt.js";

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

app.get("/", (_, res) => {
  res.send("BiteWise backend is running");
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

Help the user decide which is the safer or simpler default and why.
`;

    case "SINGLE_PRODUCT_RISK":
      return `
The user is unsure whether they should worry about a single food product.

Product:
${JSON.stringify(data.product, null, 2)}

Explain if anything matters here and in what situations.
`;

    case "INGREDIENT_EXPLAIN":
      return `
The user wants to understand a specific ingredient.

Ingredient:
${data.ingredient}

Explain what it is, why it is used, and when (if ever) it is worth worrying about.
`;

    case "FOLLOWUP_WHY":
      return `
Explain the reasoning behind your previous answer more clearly and simply.
`;

    case "FOLLOWUP_DAILY":
      return `
How does your previous advice change if this product or ingredient is consumed daily?
`;

    case "FOLLOWUP_SAFE":
      return `
Give a clear, practical safer default recommendation based on the discussion so far.
`;

    default:
      return `
Respond helpfully to the user's question using the previous context.
`;
  }
}

/* -------- PIPELINE ENDPOINT -------- */

app.post("/pipeline", async (req, res) => {
  try {
    const userMessage = buildUserMessage(req.body);

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage }
      ],
      temperature: 0.4,
      max_tokens: 400
    });

    const explanation =
      completion.choices?.[0]?.message?.content ||
      "The AI could not generate a response.";

    res.json({ explanation });

  } catch (err) {
    console.error("Groq error:", err);
    res.status(500).json({
      explanation: "Something went wrong while reasoning."
    });
  }
});

/* -------- SERVER -------- */

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
