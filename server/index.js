import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tideChecksRouter from './routes/tideChecks.js';
import messagesRouter from './routes/messages.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
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
