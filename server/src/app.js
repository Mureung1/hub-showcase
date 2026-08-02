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

const isProd = process.env.NODE_ENV === 'production';

// Render 등 프록시(HTTPS 종단) 뒤에서 secure 쿠키가 정상 발급되도록 신뢰 프록시 설정.
app.set('trust proxy', 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 8,
      // 배포(HTTPS)에서는 secure 필수. 프론트/백 도메인이 달라도 쿠키가 실리도록 sameSite=none.
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    },
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
