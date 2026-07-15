import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import repositoriesRouter from './routes/repositories.js';
import interviewsRouter from './routes/interviews.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); //모든 출처 허용
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', repositoriesRouter); //candidates에 있는 내용을 받음
app.use('/api/v1', interviewsRouter);

app.listen(PORT, () => {
  console.log(`Portfolio Zero-to-One Builder server (Day 1 stub) listening on http://localhost:${PORT}`);
});
