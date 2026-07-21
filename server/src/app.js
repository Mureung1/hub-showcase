const cors = require('cors');
const express = require('express');

const applicationsRouter = require('./routes/applications.routes');
const authRouter = require('./routes/auth.routes');
const mentorsRouter = require('./routes/mentors.routes');
const { sendError } = require('./utils/apiError');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ data: { status: 'ok' } });
});

app.use('/api/auth', authRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/mentors', mentorsRouter);

app.use((req, res) => {
  sendError(res, 404, 'NOT_FOUND', '요청한 API 경로를 찾을 수 없습니다.');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  sendError(res, 500, 'INTERNAL_SERVER_ERROR', '서버 내부 오류가 발생했습니다.');
});

module.exports = app;
