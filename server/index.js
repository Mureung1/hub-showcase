import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import repositoriesRouter from './routes/repositories.js';
import interviewsRouter from './routes/interviews.js';

const app = express();
const PORT = process.env.PORT || 4000;

// CORS_ORIGIN 미설정 시(로컬 개발) 전체 허용, 설정 시(운영) 콤마로 구분된 origin만 허용
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true;
app.use(cors({ origin: corsOrigin }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/v1', repositoriesRouter); //candidates에 있는 내용을 받음
app.use('/api/v1', interviewsRouter);

app.listen(PORT, () => {
  console.log(`Portfolio Zero-to-One Builder server (Day 1 stub) listening on http://localhost:${PORT}`);
});
