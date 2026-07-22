const express = require('express');
const cors = require('cors');
require('dotenv').config();

const apiRouter = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', apiRouter);

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: "dropcast consensus backend engine operational." });
});

const { initCrawlerCron } = require('./cron/crawlerJob');
const { initSettlementCron } = require('./cron/settlementJob');

// Start Server
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  // Initialize KREAM sync & settlement schedulers
  initCrawlerCron();
  initSettlementCron();
});
