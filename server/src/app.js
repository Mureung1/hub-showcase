require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./config/supabaseClient');

const app = express();
const PORT = process.env.PORT || 4000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());

// 테스트용 기본 라우트
app.get('/', (req, res) => {
  res.send('서버 정상 동작 중');
});

const basketRoutes = require('./routes/basketRoutes');
app.use('/api', basketRoutes);

const coursesRoutes = require('./routes/coursesRoutes');
app.use('/api', coursesRoutes);

const chatRoutes = require('./routes/chatRoutes');
app.use('/api', chatRoutes);

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버가 ${PORT}번 포트에서 실행 중입니다`);
});