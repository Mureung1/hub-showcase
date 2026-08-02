import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import authRouter from './routes/auth.js';
import chatRouter from './routes/chat.js';
import logsRouter from './routes/logs.js';
import { initDb } from './data/db.js';
import { seedDemoUser } from './data/seed.js';
import { errorHandler } from './utils/errors.js';

const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.use('/v1/auth', authRouter);
app.use('/v1/chat', chatRouter);
app.use('/v1/logs', logsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;

// DB(스키마) 준비가 끝난 뒤에 서버를 연다. 초기화 실패 시 그대로 종료해 원인을 드러낸다.
initDb()
  .then(() => seedDemoUser())
  .then(() => {
    app.listen(PORT, () => {
      console.log(`gateway server listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('DB 초기화 실패:', err);
    process.exit(1);
  });
