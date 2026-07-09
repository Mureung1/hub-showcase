// 로컬 개발 전용 실행기. Vercel에는 배포되지 않는다 (api/ 바깥에 있어서 별도 서버리스 함수로 잡히지 않음).
// 실행: node --env-file=.env.local scripts/dev-server.js (또는 npm run dev:api)
import app from '../server/app.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`[dev-server] Express 로컬 서버 실행 중: http://localhost:${PORT}`)
})
