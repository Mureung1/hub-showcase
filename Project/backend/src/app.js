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
app.use(cors({ origin: true, credentials: true }));
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

