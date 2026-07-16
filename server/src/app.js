const path = require('path');
const express = require('express');
const cors = require('cors');

const db = require('./db');
const taskRoutes = require('./routes/taskRoutes');
const memberRoutes = require('./routes/memberRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');

// DB 파일은 열리지만 테이블이 없을 수 있음(경로가 꼬여 엉뚱한 빈 파일을 열었을 때도 포함).
// 조용히 새로 만들지 않고, 없으면 안내 후 바로 종료한다.
const REQUIRED_TABLES = ['teams', 'members', 'tasks', 'activity_logs'];
const existingTables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
  .all()
  .map((row) => row.name);
const missingTables = REQUIRED_TABLES.filter((name) => !existingTables.includes(name));

if (missingTables.length > 0) {
  console.error('❌ DB 테이블이 없습니다: ' + missingTables.join(', '));
  console.error('   DB 경로: ' + db.name);
  console.error('   먼저 다음 명령으로 테이블을 만들어주세요: cd server && npm run init-db');
  process.exit(1);
}

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