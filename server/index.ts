import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import itemsRouter from './routes/items';
import briefingRouter from './routes/briefing';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/items', itemsRouter);
app.use('/api/briefing', briefingRouter);

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
});
