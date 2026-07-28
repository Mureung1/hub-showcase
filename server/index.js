require('dotenv').config({ path: '.env.local' });
const express = require('express'); // express()로 앱 객체 생성
const cors = require('cors'); // 모든 요청에 CORS 허용 헤더 붙이기
const supabase = require('./services/supabase');
const keywordsRouter = require('./routes/keywords');
const profileRouter = require('./routes/profile');
const articlesRouter = require('./routes/articles');
const bookmarksRouter = require('./routes/bookmarks');
const insightsRouter = require('./routes/insights');
const reportsRouter = require('./routes/reports');

const app = express();
app.use(cors()); // 모든 도메인 허용
app.use(express.json()); // 요청 body가 JSON일 때 자동으로 파싱해서 req.body로 쓸 수 있게 해준다

app.use('/api/keywords', keywordsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/bookmarks', bookmarksRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/reports', reportsRouter);

app.get('/api/health', async (req, res) => {
  const { count, error } = await supabase
    .from('keywords')
    .select('*', { count: 'exact', head: true });

  if (error) {
    return res.status(500).json({ error: 'db_connection_failed' });
  }

  res.json({ status: 'ok', keywords_count: count });
});

const PORT = process.env.PORT || 3001;
// .env.local에 PORT를 안 정해놨으면 기본값 3001 사용

if (require.main === module) { // 이 파일이 직접 실행됐을 때만 서버를 띄워라 (node index.js)
// vercel에 배포하면 이 파일을 직접 실행하는게 아니라 다른 곳에서 require해서 서버리스 함수로 쓰기 대문에 그럴 땐 app.listen() 실행되면 안됨
// 즉 이 조건문은 로컬 개발용 실행과 vercel 배포용 실행을 구분하기 위해서 넣은 것 
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
// express 앱을 vercel 서버리스 핸들러로 export 하는 부분