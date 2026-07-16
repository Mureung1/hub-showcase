import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import documentsRouter from './routes/documents.js'
import { supabase } from './lib/supabase.js'

const app = express()
const port = process.env.PORT || 4000

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

// 종단 에러 미들웨어 — 라우트에서 던진 에러를 JSON으로.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message })
})

app.listen(port, () => {
  console.log(`core-loop-builder-backend listening on http://localhost:${port}`)
})
