const express = require('express');
const cors = require('cors');
const lecturesRouter = require('./routes/lectures');
const timetablesRouter = require('./routes/timetables');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server is running!');
});

// 헬스체크 엔드포인트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/lectures', lecturesRouter);
app.use('/api/timetables', timetablesRouter);

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});