// 로컬 개발 진입점 — Express 앱을 포트 3001에서 실행한다.
// (Vercel 배포는 app.listen 없이 api/index.js가 app을 serverless 핸들러로 export한다.)
import app from './app.js'

const port = Number(process.env.PORT) || 3001

app.listen(port, () => {
  console.log(`http://localhost:${port} 에서 실행 중`)  // 접두사는 concurrently가 [api]로 붙여줌
})
