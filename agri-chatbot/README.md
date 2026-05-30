# Agri-Chatbot

Full-stack agricultural chatbot scaffold (Node.js backend + React frontend) with:

- Chatbot REST API (rule-based) with structure to plug AI models
- Weather endpoint (OpenWeatherMap integration)
- Crop disease detection endpoint (image upload + dummy model hook)
- React frontend with chat UI, voice features (TTS/STT), upload, and dashboard charts

Quick start

1. Backend

```powershell
cd digital-market-insights\agri-chatbot\backend
npm install
npm run dev
# server runs on http://localhost:5000
```

2. Frontend

```powershell
cd digital-market-insights\agri-chatbot\frontend
npm install
npm run dev
# frontend runs on http://localhost:3000
```

Notes

- Set `OPENWEATHER_API_KEY` in `backend/.env` to use weather endpoint.
- Disease detection currently uses a dummy model; integrate a real model by editing `backend/utils/dummyModel.js` or call an external ML service.
