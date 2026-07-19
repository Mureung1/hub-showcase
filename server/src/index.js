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

// 역산 중계: 통계 items(역산 입력 계약)를 계산해 첨부하고 에이전트에 전달한다.
app.post('/api/reverse', async (req, res) => {
  const { job, scope } = req.body || {}
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  if (!scope || !['overall', 'cluster', 'posting'].includes(scope.level)) {
    return res.status(400).json({
      job,
      error: { code: 'INVALID_SCOPE', message: 'scope.level 은 overall | cluster | posting 이어야 합니다' },
    })
  }
  try {
    const postings = await getPostings()
    const { items } = aggregate(postings)
    const r = await fetch(`${AGENT_URL}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, items, baseline: [] }),
    })
    const data = await r.json()
    // 공고 목록은 판단이 아니라 저장소 조회이므로 Express가 DB에서 합성한다.
    if (r.ok && (scope.level === 'cluster' || scope.level === 'posting') && scope.cluster_tag) {
      data.postings_in_cluster = postings
        .filter((p) => p.cluster_tag === scope.cluster_tag && p.snapshot === 'recent')
        .sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1))
        .map((p) => ({ posting_id: p.posting_id, company: p.company, title: p.title, posted_at: p.posted_at }))
    }
    res.status(r.status).json(data)
  } catch (e) {
    if (e.message && e.message.includes('postings')) {
      return res.status(503).json({ job, error: { code: 'DB_UNAVAILABLE', message: e.message } })
    }
    res.status(502).json({
      job,
      error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
    })
  }
})

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
