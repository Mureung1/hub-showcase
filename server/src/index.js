// Express 화면 API (Phase 22).
//
// 화면 조회는 활성 분석 버전의 `analysis_outputs.payload` 를 그대로 돌려준다(CONTRACT 4장).
// Express 는 집계하지 않고 해석·전략·로드맵 조회에서 에이전트를 부르지 않는다.
// FastAPI 를 부르는 곳은 두 군데뿐이다.
//   - `POST /api/roadmap` 의 체크 상태 재조합
//   - `POST /api/postings/analyze` 와 `POST /api/extract` (사용자 입력 경로)

const path = require('node:path')
const express = require('express')
const { aggregate } = require('./stats')
const { loadPayload, SCOPE_LEVELS } = require('./outputs')
const { normalizeAndHash } = require('./normalize')
const database = require('./db')

// 폴백 집계에만 쓰는 백엔드 전용 라벨 표. 활성 분석 버전의 payload 는 라벨을 자기 안에 담는다.
const LEGACY_LABELS_PATH = path.join(__dirname, '..', 'data', 'legacy-backend-labels.json')

// 사용자 입력 공고 제한 (CONTRACT 6.2)
const MIN_POSTING_CHARS = 200
const MAX_POSTING_CHARS = 12000
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 5

// --- 응답 도우미 ---------------------------------------------------------

function fail(res, status, job, code, message) {
  return res.status(status).json({ job: job || null, error: { code, message } })
}

// 저장소·산출물 오류를 화면이 구분할 수 있는 상태 코드로 옮긴다.
// 결과가 없는 상황을 빈 배열로 덮지 않는다(CONTRACT 7장).
function sendKnownError(res, job, error) {
  if (error.code === 'DB_UNAVAILABLE') {
    return fail(res, 503, job, error.code, error.message)
  }
  if (error.code === 'NO_ACTIVE_ANALYSIS') {
    return fail(res, 503, job, error.code, error.message)
  }
  if (error.code === 'EMPTY_DATASET') {
    return fail(res, 404, job, error.code, error.message)
  }
  if (error.code === 'UNSUPPORTED_FALLBACK_JOB' || error.code === 'MISSING_LABELS') {
    return fail(res, 503, job, error.code, error.message)
  }
  return null
}

// --- 범위 해석 -----------------------------------------------------------

// React 는 기업군을 표시명으로 보내고 저장소는 `cluster_id` 로 적는다(CONTRACT 5.B).
// 이 함수 하나가 표시명을 식별자로 바꾸고, 그 기업군의 공고 목록까지 함께 얻는다.
// 세 라우트가 쓰던 `postings_in_cluster` 합성도 이 결과를 재사용한다.
async function resolveScope(db, job, scope) {
  if (!scope || !SCOPE_LEVELS.includes(scope.level)) {
    return { message: 'scope.level 은 overall | cluster | posting 이어야 합니다' }
  }
  if (scope.level !== 'overall' && !scope.cluster_tag) {
    return { message: 'cluster와 posting 범위에는 scope.cluster_tag가 필요합니다' }
  }
  if (scope.level === 'posting' && !scope.posting_id) {
    return { message: 'posting 범위에는 scope.posting_id가 필요합니다' }
  }

  const resolved = {
    level: scope.level,
    jobRoleId: job,
    clusterTag: null,
    clusterId: null,
    postingId: null,
    postings: [],
  }
  if (scope.level === 'overall') return { scope: resolved }

  const clusters = await db.getClusters()
  const matched = clusters.find(
    (cluster) => cluster.display_name === scope.cluster_tag || cluster.cluster_id === scope.cluster_tag
  )
  if (!matched) {
    return { message: `알 수 없는 기업군입니다: ${scope.cluster_tag}` }
  }
  resolved.clusterTag = matched.display_name
  resolved.clusterId = matched.cluster_id
  resolved.postings = await db.getPostingsInCluster(job, matched.cluster_id)

  if (scope.level === 'posting') {
    const posting = resolved.postings.find((item) => item.posting_id === scope.posting_id)
    if (!posting) {
      return { message: '선택한 기업군에 속하지 않는 공고입니다' }
    }
    resolved.postingId = posting.posting_id
  }
  return { scope: resolved }
}

// 공고 목록은 판단이 아니라 저장소 조회이므로 Express 가 합성한다.
// 세 라우트가 같은 코드를 세 번 갖고 있던 자리를 이 함수 하나로 모았다.
function withPostingsInCluster(payload, resolved) {
  if (resolved.level === 'overall') return payload
  return { ...payload, postings_in_cluster: resolved.postings }
}

// --- 빈도 제한 -----------------------------------------------------------

// IP 당 분당 5회. 인스턴스 메모리에만 둔다. 여러 인스턴스로 늘리면 공유 저장소가 필요하다.
function createRateLimiter({ windowMs = RATE_LIMIT_WINDOW_MS, max = RATE_LIMIT_MAX, now = () => Date.now() } = {}) {
  const hits = new Map()
  return function allow(key) {
    const at = now()
    const recent = (hits.get(key) || []).filter((stamp) => at - stamp < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return false
    }
    recent.push(at)
    hits.set(key, recent)
    // 오래된 항목이 쌓이지 않도록 비면 지운다.
    for (const [otherKey, stamps] of hits) {
      if (stamps.length > 0 && at - stamps[stamps.length - 1] >= windowMs) hits.delete(otherKey)
    }
    return true
  }
}

// --- 앱 조립 -------------------------------------------------------------

/**
 * 라우트는 주입된 조회 함수만 쓴다. 테스트는 가짜 조회 함수를 넣어 돌린다.
 */
function createApp(options = {}) {
  const db = { ...database, ...(options.db || {}) }
  const agentUrl = options.agentUrl || process.env.AGENT_URL || 'http://localhost:8000'
  const httpFetch = options.fetch || globalThis.fetch
  const allowRequest = createRateLimiter(options.rateLimit)
  // 평면 표 폴백은 기본으로 꺼 둔다. 활성 분석 버전이 있으면 쓸 일이 없고,
  // 켜져 있으면 활성화 실패를 옛 샘플 결과로 덮어 버린다.
  const legacyFallback = options.legacyFallback ?? process.env.LEGACY_STATS_FALLBACK === '1'
  const legacyLabels = options.legacyLabels || null

  const app = express()
  app.use(express.json({ limit: '1mb' }))

  // 직무가 화면 선택지에 있는지 본다. 목록은 저장소가 정하고 서버는 하드코딩하지 않는다.
  async function findJobRole(job) {
    if (!job) return null
    const roles = await db.getJobRoles()
    return roles.find((role) => role.job_role_id === job) || null
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  // 화면 선택지용 직무 목록. `supported` 는 활성 분석 버전이 있는지 여부다.
  app.get('/api/jobs', async (req, res) => {
    try {
      res.json(await db.getJobRoles())
    } catch (e) {
      if (sendKnownError(res, null, e)) return
      res.status(500).json({ error: { code: 'JOBS_FAILED', message: '직무 목록 조회에 실패했습니다' } })
    }
  })

  // 통계 조회. 아홉 직무 전부 허용하고 활성 분석 버전의 statistics payload 를 그대로 낸다.
  app.get('/api/stats', async (req, res) => {
    const job = req.query.job
    try {
      const role = await findJobRole(job)
      if (!role) {
        return fail(res, 400, job, 'UNSUPPORTED_JOB', `지원하지 않는 직무입니다: ${job || '(없음)'}`)
      }
      const analysisVersion = await db.getActiveAnalysis(job)
      if (analysisVersion) {
        const payload = await db.getOutput(analysisVersion, 'overall', job, 'statistics')
        if (payload) return res.json(payload)
      }
      if (legacyFallback && job === 'backend') {
        const samples = await db.getLegacyPostingSamples('backend')
        const labels = legacyLabels || require(LEGACY_LABELS_PATH)
        return res.json(aggregate(samples, { job, labels }))
      }
      return fail(res, 503, job, 'NO_ACTIVE_ANALYSIS', '활성 분석 버전의 통계 결과가 없습니다')
    } catch (e) {
      if (sendKnownError(res, job, e)) return
      res.status(500).json({ job: job || null, error: { code: 'STATS_FAILED', message: '통계 조회에 실패했습니다' } })
    }
  })

  // 해석·전략·로드맵 조회의 공통 앞단. 직무·범위 검사와 활성 버전 조회를 한 번에 한다.
  async function prepare(res, body) {
    const { job, scope } = body || {}
    const role = await findJobRole(job)
    if (!role) {
      fail(res, 400, job, 'UNSUPPORTED_JOB', `지원하지 않는 직무입니다: ${job || '(없음)'}`)
      return null
    }
    const resolution = await resolveScope(db, job, scope)
    if (resolution.message) {
      fail(res, 400, job, 'INVALID_SCOPE', resolution.message)
      return null
    }
    const analysisVersion = await db.getActiveAnalysis(job)
    if (!analysisVersion) {
      fail(res, 503, job, 'NO_ACTIVE_ANALYSIS', '활성 분석 버전이 없습니다')
      return null
    }
    return { job, analysisVersion, resolved: resolution.scope }
  }

  // 채용공고 해석 조회. 저장된 interpretation payload 를 그대로 낸다.
  app.post('/api/reverse', async (req, res) => {
    const job = (req.body || {}).job
    try {
      const context = await prepare(res, req.body)
      if (!context) return
      const { payload } = await loadPayload(db.getOutput, context.analysisVersion, 'interpretation', context.resolved)
      res.json(withPostingsInCluster(payload, context.resolved))
    } catch (e) {
      if (sendKnownError(res, job, e)) return
      res.status(500).json({ job: job || null, error: { code: 'INTERPRETATION_FAILED', message: '해석 결과 조회에 실패했습니다' } })
    }
  })

  // 합격 전략 조회. posting 범위는 저장하지 않으므로 그 공고의 기업군으로 떨어진다.
  app.post('/api/conditions', async (req, res) => {
    const job = (req.body || {}).job
    try {
      const context = await prepare(res, req.body)
      if (!context) return
      const { payload } = await loadPayload(db.getOutput, context.analysisVersion, 'strategy', context.resolved)
      res.json(withPostingsInCluster(payload, context.resolved))
    } catch (e) {
      if (sendKnownError(res, job, e)) return
      res.status(500).json({ job: job || null, error: { code: 'STRATEGY_FAILED', message: '전략 결과 조회에 실패했습니다' } })
    }
  })

  // 로드맵 조회와 조합.
  // 체크가 비어 있으면 저장된 payload 를 그대로 낸다. 체크가 있으면 재조합은 판단이므로
  // FastAPI `POST /roadmap` 에 넘긴다. Express 는 순서를 다시 매기지 않는다.
  app.post('/api/roadmap', async (req, res) => {
    const { job, scope, checks } = req.body || {}
    try {
      const context = await prepare(res, req.body)
      if (!context) return
      const roadmap = await loadPayload(db.getOutput, context.analysisVersion, 'roadmap', context.resolved)
      const hasChecks = checks && typeof checks === 'object' && Object.keys(checks).length > 0
      if (!hasChecks) {
        return res.json(withPostingsInCluster(roadmap.payload, context.resolved))
      }
      const strategy = await loadPayload(db.getOutput, context.analysisVersion, 'strategy', context.resolved)
      const response = await httpFetch(`${agentUrl}/roadmap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job, scope, conditions: strategy.payload, checks }),
      })
      const data = await response.json()
      if (!response.ok) return res.status(response.status).json(data)
      res.json(withPostingsInCluster(data, context.resolved))
    } catch (e) {
      if (sendKnownError(res, job, e)) return
      res.status(502).json({
        job: job || null,
        error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
      })
    }
  })

  // 사용자 공고 직접 입력. 길이·빈도 제한과 개인정보 제거는 Express 몫이다(CONTRACT 6.2).
  app.post('/api/postings/analyze', async (req, res) => {
    const { raw_text, job } = req.body || {}
    if (!allowRequest(req.ip || 'unknown')) {
      return fail(res, 429, job, 'RATE_LIMITED', `요청이 너무 잦습니다. 분당 ${RATE_LIMIT_MAX}회까지 가능합니다`)
    }
    if (typeof raw_text !== 'string') {
      return fail(res, 400, job, 'INVALID_BODY', 'raw_text 문자열이 필요합니다')
    }
    // 정규화는 길이를 늘리지 않으므로 원문이 상한을 넘으면 여기서 끝낸다.
    if ([...raw_text].length > MAX_POSTING_CHARS) {
      return fail(res, 400, job, 'INVALID_LENGTH', `공고 원문은 ${MIN_POSTING_CHARS}자 이상 ${MAX_POSTING_CHARS}자 이하여야 합니다`)
    }
    try {
      const role = await findJobRole(job)
      if (!role) {
        return fail(res, 400, job, 'UNSUPPORTED_JOB', `지원하지 않는 직무입니다: ${job || '(없음)'}`)
      }
      const { normalized_text, content_hash, char_length } = normalizeAndHash(raw_text)
      if (char_length < MIN_POSTING_CHARS || char_length > MAX_POSTING_CHARS) {
        return fail(res, 400, job, 'INVALID_LENGTH', `공고 원문은 ${MIN_POSTING_CHARS}자 이상 ${MAX_POSTING_CHARS}자 이하여야 합니다`)
      }
      const response = await httpFetch(`${agentUrl}/postings/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_hash, normalized_text, job_role_id: job }),
      })
      const data = await response.json()
      res.status(response.status).json(data)
    } catch (e) {
      if (sendKnownError(res, job, e)) return
      res.status(502).json({
        job: job || null,
        error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
      })
    }
  })

  // 추출은 그대로 중계한다.
  app.post('/api/extract', async (req, res) => {
    try {
      const response = await httpFetch(`${agentUrl}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const data = await response.json()
      res.status(response.status).json(data)
    } catch {
      res.status(502).json({
        error: { code: 'AGENT_UNAVAILABLE', message: '에이전트 서비스(FastAPI)에 연결하지 못했습니다' },
      })
    }
  })

  return app
}

if (require.main === module) {
  const PORT = process.env.PORT || 4000
  createApp().listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
}

module.exports = { createApp, createRateLimiter, resolveScope, withPostingsInCluster }
