const express = require('express')
const { aggregate } = require('./stats')
const { getPostings } = require('./db')

const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

function scopeValidationMessage(scope, postings) {
  if (!scope || !['overall', 'cluster', 'posting'].includes(scope.level)) {
    return 'scope.level 은 overall | cluster | posting 이어야 합니다'
  }
  if (scope.level !== 'overall' && !scope.cluster_tag) {
    return 'cluster와 posting 범위에는 scope.cluster_tag가 필요합니다'
  }
  if (scope.level === 'posting' && !scope.posting_id) {
    return 'posting 범위에는 scope.posting_id가 필요합니다'
  }
  if (!postings) return null
  if (scope.level !== 'overall' && !postings.some((posting) => posting.snapshot === 'recent' && posting.cluster_tag === scope.cluster_tag)) {
    return '최근 공고에 존재하지 않는 기업군입니다'
  }
  if (scope.level === 'posting' && !postings.some((posting) => (
    posting.snapshot === 'recent'
    && posting.cluster_tag === scope.cluster_tag
    && posting.posting_id === scope.posting_id
  ))) {
    return '선택한 기업군에 속하지 않는 공고입니다'
  }
  return null
}

function sendDataError(res, job, error) {
  if (error.code === 'DB_UNAVAILABLE') {
    return res.status(503).json({ job, error: { code: error.code, message: error.message } })
  }
  if (error.code === 'EMPTY_DATASET') {
    return res.status(404).json({ job, error: { code: error.code, message: error.message } })
  }
  return null
}

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
    if (sendDataError(res, job, e)) return
    res.status(500).json({ job, error: { code: 'STATS_FAILED', message: '통계 집계에 실패했습니다' } })
  }
})

// 에이전트 중계: React → Express → FastAPI(8000).
// 프론트는 Express 하나만 바라보고, 에이전트 교체·오류 처리는 여기서 담당한다.
const AGENT_URL = process.env.AGENT_URL || 'http://localhost:8000'

// 채용공고 해설 중계: 통계 items를 계산해 첨부하고 에이전트에 전달한다.
app.post('/api/reverse', async (req, res) => {
  const { job, scope } = req.body || {}
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  const scopeError = scopeValidationMessage(scope)
  if (scopeError) {
    return res.status(400).json({
      job,
      error: { code: 'INVALID_SCOPE', message: scopeError },
    })
  }
  try {
    const postings = await getPostings()
    const storedScopeError = scopeValidationMessage(scope, postings)
    if (storedScopeError) {
      return res.status(400).json({ job, error: { code: 'INVALID_SCOPE', message: storedScopeError } })
    }
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
    if (sendDataError(res, job, e)) return
    res.status(502).json({
      job,
      error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
    })
  }
})

// 합격 전략 중계: 공고 해설 출력을 만들어(통계→공고 해설 사슬) 합격 전략 에이전트의 입력으로 전달한다.
app.post('/api/conditions', async (req, res) => {
  const { job, scope } = req.body || {}
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  const scopeError = scopeValidationMessage(scope)
  if (scopeError) {
    return res.status(400).json({
      job,
      error: { code: 'INVALID_SCOPE', message: scopeError },
    })
  }
  try {
    const postings = await getPostings()
    const storedScopeError = scopeValidationMessage(scope, postings)
    if (storedScopeError) {
      return res.status(400).json({ job, error: { code: 'INVALID_SCOPE', message: storedScopeError } })
    }
    const { items } = aggregate(postings)
    const reverseRes = await fetch(`${AGENT_URL}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, items, baseline: [] }),
    })
    if (!reverseRes.ok) {
      return res.status(502).json({ job, error: { code: 'AGENT_ERROR', message: '공고 해설 단계에서 오류가 발생했습니다' } })
    }
    const reverse = await reverseRes.json()
    const r = await fetch(`${AGENT_URL}/conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, reverse }),
    })
    const data = await r.json()
    if (r.ok && (scope.level === 'cluster' || scope.level === 'posting') && scope.cluster_tag) {
      data.postings_in_cluster = postings
        .filter((p) => p.cluster_tag === scope.cluster_tag && p.snapshot === 'recent')
        .sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1))
        .map((p) => ({ posting_id: p.posting_id, company: p.company, title: p.title, posted_at: p.posted_at }))
    }
    res.status(r.status).json(data)
  } catch (e) {
    if (sendDataError(res, job, e)) return
    res.status(502).json({
      job,
      error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
    })
  }
})

// 준비 로드맵 중계: 통계→공고 해설→합격 전략 사슬을 거친 결과와 체크 상태를 전달한다.
app.post('/api/roadmap', async (req, res) => {
  const { job, scope, checks } = req.body || {}
  if (job !== 'backend') {
    return res.status(400).json({
      job: job || null,
      error: { code: 'UNSUPPORTED_JOB', message: '현재는 backend 직무만 지원합니다' },
    })
  }
  const scopeError = scopeValidationMessage(scope)
  if (scopeError) {
    return res.status(400).json({
      job,
      error: { code: 'INVALID_SCOPE', message: scopeError },
    })
  }
  try {
    const postings = await getPostings()
    const storedScopeError = scopeValidationMessage(scope, postings)
    if (storedScopeError) {
      return res.status(400).json({ job, error: { code: 'INVALID_SCOPE', message: storedScopeError } })
    }
    const { items } = aggregate(postings)
    const reverseRes = await fetch(`${AGENT_URL}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, items, baseline: [] }),
    })
    if (!reverseRes.ok) {
      return res.status(502).json({ job, error: { code: 'AGENT_ERROR', message: '공고 해설 단계에서 오류가 발생했습니다' } })
    }
    const reverse = await reverseRes.json()
    const condRes = await fetch(`${AGENT_URL}/conditions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, reverse }),
    })
    if (!condRes.ok) {
      return res.status(502).json({ job, error: { code: 'AGENT_ERROR', message: '합격 전략 단계에서 오류가 발생했습니다' } })
    }
    const conditions = await condRes.json()
    const r = await fetch(`${AGENT_URL}/roadmap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job, scope, conditions, checks: checks || {} }),
    })
    const data = await r.json()
    if (r.ok && (scope.level === 'cluster' || scope.level === 'posting') && scope.cluster_tag) {
      data.postings_in_cluster = postings
        .filter((p) => p.cluster_tag === scope.cluster_tag && p.snapshot === 'recent')
        .sort((a, b) => (a.posted_at < b.posted_at ? 1 : -1))
        .map((p) => ({ posting_id: p.posting_id, company: p.company, title: p.title, posted_at: p.posted_at }))
    }
    res.status(r.status).json(data)
  } catch (e) {
    if (sendDataError(res, job, e)) return
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
