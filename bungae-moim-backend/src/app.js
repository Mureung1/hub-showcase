require('dotenv').config();

const path = require('path');
const express = require('express');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const meetingsRoutes = require('./routes/meetings');

const app = express();

// 배포 환경(Render 등)은 TLS를 프록시에서 끊고 X-Forwarded-Proto로 알려준다.
// 이걸 신뢰해야 세션 쿠키의 secure:'auto'가 https를 https로 인식한다.
app.set('trust proxy', 1);

// FE 빌드 산출물을 같은 오리진에서 서빙한다(단일 오리진 배포).
// FE는 /api를 상대경로로 부르고 credentials:'same-origin'을 쓰므로, 같은 오리진이면 CORS가 필요 없다.
// dist가 없으면(빌드 전 로컬·테스트) 요청이 그냥 다음 미들웨어로 넘어가므로 무해하다.
// 세션 미들웨어보다 앞에 둔다 — 정적 파일 요청마다 세션을 만들 이유가 없다.
app.use(express.static(path.join(__dirname, '..', '..', 'bungae-moim', 'dist')));

app.use(sessionMiddleware);
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/meetings', meetingsRoutes);

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ data: { status: 'ok', db: 'connected' } });
  } catch (err) {
    res
      .status(500)
      .json({ error: { code: 'DB_CONNECTION_ERROR', message: err.message } });
  }
});

app.use(errorHandler);

// `node src/app.js`(또는 `npm start`)로 직접 실행됐을 때만 서버를 기동한다.
// Supertest 등에서 `require('./app')`로 앱만 가져다 쓸 때(Epic B의 테스트들)
// 임포트하는 것만으로 실제 포트를 점유해버리는 것을 방지하기 위함이다.
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
