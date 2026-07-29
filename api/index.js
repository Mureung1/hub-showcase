// Vercel serverless 진입점 — Express 앱을 그대로 핸들러로 내보낸다.
// 브라우저는 같은 오리진의 /api/* 를 호출하고, vercel.json 리라이트가 이 함수로 넘긴다.
import app from '../server/app.js'

export default app
