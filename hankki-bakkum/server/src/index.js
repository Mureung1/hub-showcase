import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import aiRouter from './routes/ai.js';
import confirmRouter from './routes/confirm.js';
import redeemRouter from './routes/redeem.js';
import pinRouter from './routes/pin.js';          // ← 추가

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: '한끼바꿈 server' }));
app.use('/api/ai', aiRouter);
app.use(confirmRouter);
app.use(redeemRouter);
app.use(pinRouter);                                // ← 추가 (경로는 pin.js 안에 있음)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🍚 한끼바꿈 server: http://localhost:${PORT}`));
