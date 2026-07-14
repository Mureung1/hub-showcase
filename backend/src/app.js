const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { dumpKreamPrices, triggerKreamCrawler } = require('./controllers/adminController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: "dropcast consensus backend engine operational." });
});

// Admin Routes
app.post('/api/admin/kream-dump', dumpKreamPrices);
app.post('/api/admin/kream-trigger', triggerKreamCrawler);

const { initCrawlerCron } = require('./cron/crawlerJob');

// Start Server
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  // Initialize KREAM sync scheduler
  initCrawlerCron();
});
