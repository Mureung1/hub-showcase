const path = require('path');
const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

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
app.use('/api/activity-logs', activityLogRoutes);

// prototype 화면을 file://이 아니라 http://localhost:3000으로 열 수 있게 정적 서빙
// (file:// origin은 알림 권한이 제대로 저장되지 않는 브라우저 문제가 있어서 필요함)
// 위의 '/' 라우트보다 뒤에 둬서 index.html이 그 라우트를 가리지 않게 함
app.use(express.static(path.join(__dirname, '..', '..', 'prototype')));

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});