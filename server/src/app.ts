import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';

export const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});
