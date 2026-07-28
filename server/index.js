import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tideChecksRouter from './routes/tideChecks.js';
import messagesRouter from './routes/messages.js';

const app = express();
const PORT = process.env.PORT || 4000;

// 배포 후에는 Render 환경변수 FRONTEND_URL에 Vercel 주소를 넣는다.
// 로컬 개발 중엔 값이 없으니 모든 origin을 허용한다.
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

// 배포 후 서버가 살아있는지 확인하는 상태 체크 API
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tide-checks', tideChecksRouter);
app.use('/api/messages', messagesRouter);

app.listen(PORT, () => {
  console.log(`TideNote API listening on http://localhost:${PORT}`);
});
