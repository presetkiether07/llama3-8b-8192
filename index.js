const express = require('express');
const fs = require('fs');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const MEMORY_FILE = './chatmemory.json';
const LLAMA_API = 'http://localhost:11434/api/generate'; // Replace with actual LLaMA endpoint

app.use(express.json());

function loadMemory() {
  try {
    return JSON.parse(fs.readFileSync(MEMORY_FILE));
  } catch {
    return {};
  }
}

function saveMemory(data) {
  fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
}

app.post('/ask', async (req, res) => {
  const { uid, prompt } = req.body;
  if (!uid || !prompt) return res.status(400).json({ error: 'uid and prompt required' });

  const memory = loadMemory();
  const history = memory[uid] || '';
  const input = `${history}\nUser: ${prompt}\nAI:`;

  try {
    const response = await axios.post(LLAMA_API, {
      prompt: input,
      stream: false
    });

    const reply = response.data.response.trim();
    memory[uid] = `${input} ${reply}`;
    saveMemory(memory);

    res.json({ reply });
  } catch (err) {
    console.error('❌ LLaMA error:', err.message);
    res.status(500).json({ error: 'Failed to connect to LLaMA' });
  }
});

app.post('/reset', (req, res) => {
  const { uid } = req.body;
  if (!uid) return res.status(400).json({ error: 'uid is required' });

  const memory = loadMemory();
  delete memory[uid];
  saveMemory(memory);

  res.json({ message: `Memory reset for uid ${uid}` });
});

app.get('/', (req, res) => {
  res.send('🧠 Norch Memory API is running. Use POST /ask or /reset');
});


app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
