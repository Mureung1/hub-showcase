import express from 'express'
import cors from 'cors'
import naverRouter from './routes/naver.js'
import recipesRouter from './routes/recipes.js'
import youtubeRouter from './routes/youtube.js'

const app = express()

// 배포된 FE(Vercel)가 절대주소로 이 서버를 직접 호출하는 구조라 CORS 허용이 필요하다.
// ALLOWED_ORIGIN이 없으면(로컬 개발) 모든 출처를 허용한다.
const allowedOrigin = process.env.ALLOWED_ORIGIN
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined))

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true })
})

app.use('/api/naver', naverRouter)
app.use('/api/recipes', recipesRouter)
app.use('/api/youtube', youtubeRouter)

export default app
