import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';

export const app = express();

const localhostOriginPattern = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === env.FRONTEND_ORIGIN || localhostOriginPattern.test(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Not allowed by CORS'));
    },
  }),
);
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);

app.use(errorMiddleware);
