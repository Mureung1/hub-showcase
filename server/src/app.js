const express = require('express');
const cors = require('cors');

const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const teamRoutes = require('./routes/teamRoutes');

// 테이블 존재 확인(SQLite sqlite_master 조회)은 제거함.
// Supabase(Postgres) 테이블은 이미 만들어져 있으므로 매 시작마다 확인할 필요 없음.

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') || 'http://localhost:5173' }));
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
app.use('/api/availability', availabilityRoutes);
app.use('/api/teams', teamRoutes);

app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});