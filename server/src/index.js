const express = require('express')
const { aggregate } = require('./stats')
const { getPostings } = require('./db')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// 1차 슬라이스: 통계 엔드포인트. 샘플 공고를 rule로 집계해 계약(4.2) 형태로 응답한다.
app.get('/api/stats', async (req, res) => {
  const job = req.query.job
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  try {
    const postings = await getPostings()
    res.json(aggregate(postings))
  } catch (e) {
    res.status(503).json({
      job,
      error: { code: 'DB_UNAVAILABLE', message: e.message },
    })
  }
})

// 에이전트 중계: React → Express → FastAPI(8000).
// 프론트는 Express 하나만 바라보고, 에이전트 교체·오류 처리는 여기서 담당한다.
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'

app.post('/api/extract', async (req, res) => {
  try {
    const r = await fetch(`${AGENT_URL}/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })
    const data = await r.json()
    res.status(r.status).json(data)
  } catch {
    res.status(502).json({
      error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
    })
  }
})

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
