const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 테스트용 기본 라우트
app.get('/', (req, res) => {
  res.send('서버 정상 동작 중');
});

const recordRoutes = require('./routes/recordRoutes');
app.use('/api', recordRoutes);

const basketRoutes = require('./routes/basketRoutes');
app.use('/api', basketRoutes);

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다`);
});