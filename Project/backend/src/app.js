const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const devAuthRoutes = require('./routes/devAuth.routes');
const groupPurchaseRoutes = require('./routes/groupPurchase.routes');
const notificationRoutes = require('./routes/notification.routes');
const userRoutes = require('./routes/user.routes');
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
// Images are currently sent as data URLs. Allow up to five 1 MB files after
// Base64 encoding while keeping a bounded request size for the API.
app.use(express.json({ limit: '8mb' }));

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' }, error: null });
});

if (env.enableDevLogin) {
  app.use('/auth', devAuthRoutes);
}

app.use('/group-purchases', groupPurchaseRoutes);
app.use('/notifications', notificationRoutes);
app.use('/users', userRoutes);

app.use(errorHandler);

module.exports = app;

