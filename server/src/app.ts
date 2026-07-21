import cors from 'cors';
import express from 'express';
import { env } from './lib/env.js';
import { UPLOAD_DIR, UPLOAD_URL_PREFIX } from './lib/upload.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import { authRouter } from './routes/auth.routes.js';
import { challengeRouter } from './routes/challenge.routes.js';
import { recordRouter } from './routes/record.routes.js';

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
app.use(UPLOAD_URL_PREFIX, express.static(UPLOAD_DIR));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRouter);
app.use('/challenges', challengeRouter);
app.use('/records', recordRouter);

app.use(errorMiddleware);
