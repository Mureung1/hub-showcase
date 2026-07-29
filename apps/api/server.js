import express from 'express'
import cors from 'cors'
import { supabase } from './db.js'
import sessionsRouter from './routes/sessions.js'

const app = express()
const PORT = process.env.PORT || 3000

// CORS 설정 — 환경변수로 허용 도메인 설정
const allowedOrigins = [
  /http:\/\/localhost:517[0-9]/,  // 로컬 개발
]

// 배포된 FE 주소 추가 (Vercel)
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL)
}

app.use(cors({
  origin: (origin, callback) => {
    // 서버-서버 요청 (origin 없음) 허용
    if (!origin) return callback(null, true)

    // 정규식 또는 문자열 매칭
    const allowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) return allowed.test(origin)
      return allowed === origin
    })

    if (allowed) return callback(null, true)
    callback(new Error('CORS not allowed'))
  }
}))

app.use(express.json())

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ─────────────────────────────────────────────────────────────────────────────
// spaces 엔드포인트 — Supabase 왕복 테스트용
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/spaces — space 생성
app.post('/api/spaces', async (req, res) => {
  const { id, name, icon } = req.body

  if (!id || !name) {
    return res.status(400).json({ error: 'id and name are required' })
  }

  const { data, error } = await supabase
    .from('spaces')
    .insert({ id, name, icon })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.status(201).json(data)
})

// GET /api/spaces/:id — space 조회
app.get('/api/spaces/:id', async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabase
    .from('spaces')
    .select()
    .eq('id', id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Space not found' })
  }

  res.json(data)
})

// GET /api/spaces — space 목록 조회
app.get('/api/spaces', async (req, res) => {
  const { data, error } = await supabase
    .from('spaces')
    .select()
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  res.json(data)
})

// ─────────────────────────────────────────────────────────────────────────────
// sessions 라우터 마운트
// ─────────────────────────────────────────────────────────────────────────────
app.use('/api/sessions', sessionsRouter)

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
