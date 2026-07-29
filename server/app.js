// Express 앱 구성 — 로컬 개발(server/index.js)과 Vercel serverless(api/index.js)가 공유한다.
// 여기서는 app.listen을 하지 않는다(진입점이 각자 처리).
import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'
import { auth } from './routes/auth.js'
import { me } from './routes/me.js'
import { projects } from './routes/projects.js'
import { join } from './routes/join.js'

const app = express()

// 프론트와 API가 같은 오리진(Vercel 한 프로젝트)이라 CORS는 불필요하다.
app.use(express.json())
app.use(cookieParser())
app.use(auth)
app.use(me)
app.use(projects)
app.use(join)

// 서버 생존 확인 + 필수 환경변수 로드 여부 (값 자체는 절대 노출하지 않음)
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    env: {
      supabaseUrl: Boolean(process.env.SUPABASE_URL),
      supabaseSecretKey: Boolean(process.env.SUPABASE_SECRET_KEY),
      jwtSecret: Boolean(process.env.JWT_SECRET),
      anthropicApiKey: Boolean(process.env.ANTHROPIC_API_KEY),
    },
  })
})

export default app
