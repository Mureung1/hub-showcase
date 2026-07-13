import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import repositoriesRouter from './routes/repositories.js';
import interviewsRouter from './routes/interviews.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/v1', repositoriesRouter);
app.use('/api/v1', interviewsRouter);

app.listen(PORT, () => {
  console.log(`Portfolio Zero-to-One Builder server (Day 1 stub) listening on http://localhost:${PORT}`);
});
