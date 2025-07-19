const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const MEMORY_FILE = "./chatmemory.json";

// Load memory from file
function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE));
  } catch {
    return {};
  }
}

// Save memory to file
function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

// Shared Groq calling function
async function getGroqLlamaResponse(messages) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-8b-8192",
      messages,
      temperature: 0.7,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.choices[0].message.content;
}

/**
 * POST /api/llama - for Postman or UI
 */
app.post("/api/llama", async (req, res) => {
  const { prompt, uid = "user" } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt." });

  const memory = loadMemory();
  const history = memory[uid] || [];

  const messages = [...history, { role: "user", content: prompt }];

  try {
    const reply = await getGroqLlamaResponse(messages);
    const updatedHistory = [...messages, { role: "assistant", content: reply }];

    memory[uid] = updatedHistory.slice(-20); // Keep last 20 exchanges only
    saveMemory(memory);

    res.json({ uid, prompt, response: reply });
  } catch (err) {
    console.error("❌ LLaMA API failed:", err.message);
    res.status(500).json({ error: "LLaMA API call failed." });
  }
});

/**
 * GET /api/llama?prompt=hello&uid=test - for browser access
 */
app.get("/api/llama", async (req, res) => {
  const prompt = req.query.prompt;
  const uid = req.query.uid || "browser";

  if (!prompt) return res.status(400).json({ error: "Missing prompt." });

  const memory = loadMemory();
  const history = memory[uid] || [];

  const messages = [...history, { role: "user", content: prompt }];

  try {
    const reply = await getGroqLlamaResponse(messages);
    const updatedHistory = [...messages, { role: "assistant", content: reply }];

    memory[uid] = updatedHistory.slice(-20); // Keep last 20 turns
    saveMemory(memory);

    res.json({ uid, prompt, response: reply });
  } catch (err) {
    console.error("❌ LLaMA API failed:", err.message);
    res.status(500).json({ error: "LLaMA API call failed." });
  }
});

/**
 * POST /api/reset - reset memory for a specific uid
 */
app.post("/api/reset", (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: "Missing uid." });

  const memory = loadMemory();
  delete memory[uid];
  saveMemory(memory);

  res.json({ message: `Memory reset for ${uid}` });
});

/**
 * GET /api/memory?uid=test - (optional) view current memory for a uid
 */
app.get("/api/memory", (req, res) => {
  const uid = req.query.uid;
  if (!uid) return res.status(400).json({ error: "Missing uid in query." });

  const memory = loadMemory();
  res.json({ uid, memory: memory[uid] || [] });
});

app.listen(PORT, () => {
  console.log(`✅ LLaMA API server running on http://localhost:${PORT}`);
});
