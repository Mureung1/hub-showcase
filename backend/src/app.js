const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Basic test route
app.get('/', (req, res) => {
  res.json({ message: "dropcast consensus backend engine operational." });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
