const cors = require('cors');
const express = require('express');

const applicationsRouter = require('./routes/applications.routes');
const authRouter = require('./routes/auth.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: '요청한 API 경로를 찾을 수 없습니다.',
    },
  });
});

module.exports = app;
