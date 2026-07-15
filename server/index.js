import 'dotenv/config'
import express from 'express'
import cookieParser from 'cookie-parser'

const app = express()

app.use(express.json())
app.use(cookieParser())

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

const port = Number(process.env.PORT) || 3001

app.listen(port, () => {
  console.log(`[api] http://localhost:${port} 에서 실행 중`)
})
