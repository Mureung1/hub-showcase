import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import aiRouter from './routes/ai.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true, service: '한끼바꿈 server' }));
app.use('/api/ai', aiRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🍚 한끼바꿈 server: http://localhost:${PORT}`));
