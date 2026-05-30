const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const chatRoutes = require('./routes/chat');
const weatherRoutes = require('./routes/weather');
const diseaseRoutes = require('./routes/disease');
const pricesRoutes = require('./routes/prices');

app.use('/api/chat', chatRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/prices', pricesRoutes);

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

/**
 * Try to start server on a port, if it is taken try next port up to attempts.
 * This helps avoid EADDRINUSE crashes during development.
 */
function startServer(port = DEFAULT_PORT, attempts = 5) {
  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`Agri-Chatbot backend running on port ${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempts > 0) {
      console.warn(`Port ${port} in use, trying port ${port + 1}...`);
      setTimeout(() => startServer(port + 1, attempts - 1), 300);
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

startServer();
