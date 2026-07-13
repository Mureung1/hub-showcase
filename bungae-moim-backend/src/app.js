require('dotenv').config();

const express = require('express');
const pool = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const sessionMiddleware = require('./config/session');

const app = express();
app.use(sessionMiddleware);

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
