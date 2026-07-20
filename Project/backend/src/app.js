const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const devAuthRoutes = require('./routes/devAuth.routes');
const groupPurchaseRoutes = require('./routes/groupPurchase.routes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    // Server-to-server requests have no Origin header; browsers must be allowlisted.
    if (!origin || env.corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

if (env.enableDevLogin) {
  app.use('/auth', devAuthRoutes);
}

app.use('/group-purchases', groupPurchaseRoutes);

app.use(errorHandler);

module.exports = app;

