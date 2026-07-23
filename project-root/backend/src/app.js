const express = require('express');
const cors = require('cors');
const createLecturesRouter = require('./routes/lectures');
const createTimetablesRouter = require('./routes/timetables');
const createPreferencesRouter = require('./routes/preferences');
const supabase = require('./db/db');

// GEMINI_API_KEY가 .env에 없으면 geminiClient.js가 require 시점에 에러를 던진다.
// 자유 텍스트 조건 해석 기능만 없이 나머지 서버는 정상 기동되도록 여기서 흡수한다.
let gemini = null;
try {
  gemini = require('./llm/geminiClient');
} catch (err) {
  console.warn('자유 텍스트 조건 해석 기능이 비활성화됩니다:', err.message);
}

// supabase/gemini 클라이언트를 파라미터로 받아 앱을 조립한다. 기본값은 실제 클라이언트이고,
// 테스트에서는 mock 클라이언트를 넘겨서 네트워크 없이 라우트를 검증할 수 있다.
module.exports = function createApp(injectedSupabase = supabase, injectedGemini = gemini) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.send('Server is running!');
  });

  // 헬스체크 엔드포인트
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/lectures', createLecturesRouter(injectedSupabase));
  app.use('/api/timetables', createTimetablesRouter(injectedSupabase));
  app.use('/api/preferences', createPreferencesRouter(injectedGemini));

  return app;
};
