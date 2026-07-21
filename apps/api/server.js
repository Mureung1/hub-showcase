import express from 'express'
import { supabase } from './db.js'

const app = express()
const PORT = process.env.PORT || 3000

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

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
