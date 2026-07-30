import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import projectsRouter from './routes/projects';
import extractRouter from './routes/extract';
import shareRouter from './routes/share';

const app = express();
const port = process.env.PORT || 3000;

// Render/Vercel 같은 리버스 프록시 뒤에서 실행되므로, X-Forwarded-For의 첫 번째 값을
// req.ip로 신뢰한다. 이게 없으면 모든 요청이 프록시 자체의 IP로 잡혀서
// IP 단위 rate limit(middleware/geminiQuota.ts)이 전 세계 사용자를 한 버킷으로 묶어버린다.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

app.use('/api/projects', projectsRouter);
app.use('/api/extract', extractRouter);
app.use('/api/share', shareRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
