const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');

const app = express();
const PORT = 3000;

app.use(cors());           // 다른 주소에서 오는 요청 허용
app.use(express.json());   // 요청에 담긴 JSON 데이터 읽기

app.get('/', (req, res) => {
  res.send('팀플 올인원 서버가 실행 중입니다!');
});

// 테스트용 API
app.get('/api/test', (req, res) => {
  res.json({ message: '서버 연결 성공!', time: new Date().toISOString() });
});

app.use('/api/tasks', taskRoutes);
app.use('/api/members', memberRoutes);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});