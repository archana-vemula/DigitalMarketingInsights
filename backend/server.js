// ===== server.js =====
const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// ===== API KEYS =====
const AGMARKNET_KEY = "YOUR_AGMARKNET_API_KEY"; // Your Agmarknet API
const OPENAI_KEY = "YOUR_OPENAI_API_KEY"; // Your OpenAI API Key
const PLANT_ID_KEY = "YOUR_PLANT_ID_API_KEY"; // Your Plant.ID API Key

// ===== Route: Live Crop Price =====
app.get("/crop-price", async (req, res) => {
  const { crop, state } = req.query;

  try {
    const apiUrl = `https://api.agmarknet.gov.in/AgmarknetAPI/commodity-price?commodity=${encodeURIComponent(crop)}&state=${encodeURIComponent(state)}&apikey=${AGMARKNET_KEY}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data && data.records && data.records.length > 0) {
      const latest = data.records[0]; // latest record
      const price = latest.modal_price || latest.max_price || latest.min_price;
      res.json({ price });
    } else {
      res.json({ price: null });
    }
  } catch (err) {
    console.error(err);
    res.json({ price: null });
  }
});

// ===== Route: AI Chat =====
app.post("/chat", async (req, res) => {
  const { text } = req.body;
  try {
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful agriculture assistant. Provide concise, accurate, and live farming advice." },
          { role: "user", content: text }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    });
    const data = await aiRes.json();
    const reply = data.choices[0].message.content;
    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.json({ reply: "⚠️ Error processing request" });
  }
});

// ===== Route: Plant Identification =====
app.post("/plant-id", async (req, res) => {
  const { imageBase64 } = req.body;
  try {
    const response = await fetch("https://api.plant.id/v3/identify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": PLANT_ID_KEY
      },
      body: JSON.stringify({
        images: [imageBase64],
        modifiers: ["crops_fast", "similar_images"],
        plant_details: ["common_names", "url", "wiki_description", "taxonomy"]
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.json({ error: "Plant.ID failed" });
  }
});

// ===== Start Server =====
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});