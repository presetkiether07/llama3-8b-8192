const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

const memoryFile = 'chatmemory.json';
let memory = {};

// Load memory on startup
if (fs.existsSync(memoryFile)) {
  memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
}

// Save memory to file
function saveMemory() {
  fs.writeFileSync(memoryFile, JSON.stringify(memory, null, 2));
}

// Simple memory logic
function buildPrompt(uid, message) {
  if (memory[uid]) {
    return `Ang topic natin ay ${memory[uid]}.\nUser: ${message}\nAI:`;
  } else {
    // Set this message as topic
    memory[uid] = message;
    saveMemory();
    return `Ang bagong topic natin ay ${message}.\nUser: ${message}\nAI:`;
  }
}

// Route to handle chat
app.get('/ask', async (req, res) => {
  const { uid, message } = req.query;

  if (!uid || !message) {
    return res.status(400).json({ error: 'Missing uid or message' });
  }

  const prompt = buildPrompt(uid, message);

  try {
    const llamaRes = await axios.post('http://localhost:11434/api/generate', {
      model: 'llama3',
      prompt,
      stream: false,
    });

    res.json({ response: llamaRes.data.response });
  } catch (err) {
    console.error('❌ LLaMA error:', err.message);
    res.status(500).json({ error: 'Failed to connect to LLaMA' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`);
});
