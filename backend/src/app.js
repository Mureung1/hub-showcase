import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import documentsRouter from './routes/documents.js'
import profileRouter from './routes/profile.js'
import { supabase } from './lib/supabase.js'

// 앱 구성만 담당하고 listen은 index.js가 한다 — 테스트(supertest)가 포트를 열지 않고
// app을 직접 주입받을 수 있게 하기 위함.
const app = express()

app.use(cors())
app.use(express.json())

// DB 연결 상태까지 포함한 헬스체크
app.get('/api/health', async (req, res) => {
  const { error } = await supabase.from('documents').select('id', { count: 'exact', head: true })
  res.json({
    status: 'ok',
    service: 'core-loop-builder-backend',
    db: error ? 'error' : 'ok',
  })
})

app.use('/api/documents', documentsRouter)
app.use('/api/profile', profileRouter)

// 종단 에러 미들웨어 — 라우트에서 던진 에러를 JSON으로.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message })
})

export default app
