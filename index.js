const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

/**
 * POST endpoint: for use in UI or tools like Postman
 */
app.post("/api/llama", async (req, res) => {
  const { prompt, uid = "user", history = [] } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt." });

  try {
    const messages = [...history, { role: "user", content: prompt }];
    const reply = await getGroqLlamaResponse(messages);
    res.json({ uid, prompt, response: reply });
  } catch (err) {
    res.status(500).json({ error: "LLaMA API call failed." });
  }
});

/**
 * GET endpoint: for browser-friendly access via URL query
 * Example: /api/llama?prompt=hello&uid=test
 */
app.get("/api/llama", async (req, res) => {
  const prompt = req.query.prompt;
  const uid = req.query.uid || "browser";
  if (!prompt) return res.status(400).json({ error: "Missing prompt." });

  try {
    const messages = [{ role: "user", content: prompt }];
    const reply = await getGroqLlamaResponse(messages);
    res.json({ uid, prompt, response: reply });
  } catch (err) {
    res.status(500).json({ error: "LLaMA API call failed." });
  }
});

// Shared Groq calling function
async function getGroqLlamaResponse(messages) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      messages,
      temperature: 0.7
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content;
}
app.get("/", (req, res) => {
  res.status(200).send("🟢 LLaMA API is running.");
});
app.listen(PORT, () => {
  console.log(`✅ LLaMA API server running on http://localhost:${PORT}`);
});
