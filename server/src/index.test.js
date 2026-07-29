import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import server from './index.js'

const { createApp } = server

// ---- 가짜 조회 함수 -------------------------------------------------------
// 데이터베이스에 접속하지 않는다. 계약이 정한 모양만 흉내 낸다.

const JOB_ROLES = [
  { job_role_id: 'backend', display_name: '백엔드 개발자', supported: true },
  { job_role_id: 'frontend', display_name: '프론트엔드 개발자', supported: true },
  { job_role_id: 'security', display_name: '정보보안', supported: false },
]

const CLUSTERS = [
  { cluster_id: 'bigtech_platform', display_name: '빅테크·플랫폼', sort_order: 1 },
  { cluster_id: 'startup', display_name: '스타트업', sort_order: 2 },
]

const POSTINGS = {
  'backend|bigtech_platform': [
    { posting_id: 'dp_backend_02', company: '카카오', title: '백엔드 개발자', posted_at: '2026-01-12T10:00:00+09:00' },
  ],
  'backend|startup': [],
}

// 로드맵 재조합을 볼 수 있는 최소 payload. 규칙 자체의 대조는 recompose.test.js 가 한다.
const ROADMAP = {
  job: 'backend',
  scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼', posting_id: null },
  project_steps: [
    { n: 1, phase: 'STEP 01 · 3주', priority: 'vhigh', title: '첫 단계', fills: [{ item_id: 'cc_backend_api' }] },
    { n: 2, phase: 'STEP 02 · 2주', priority: 'high', title: '둘째 단계', fills: [{ item_id: 'cc_backend_db' }] },
  ],
  study_tracks: [{ phase: 'STEP 01~02와 병행', priority: 'high', title: '이론', fills: [] }],
  check_rows: [
    { item_id: 'cc_backend_api', source_step: 'STEP 01' },
    { item_id: 'cc_backend_db', source_step: 'STEP 02' },
  ],
}

const OUTPUTS = {
  'an_demo_backend|overall|backend|statistics': { job: 'backend', kpi: {}, items: [], error: null },
  'an_demo_backend|overall|backend|interpretation': { job: 'backend', scope: { level: 'overall', cluster_tag: null, posting_id: null }, baseline: ['b'] },
  'an_demo_backend|overall|backend|strategy': { job: 'backend', scope: { level: 'overall', cluster_tag: null, posting_id: null }, checklist: [] },
  'an_demo_backend|overall|backend|roadmap': { job: 'backend', scope: { level: 'overall', cluster_tag: null, posting_id: null }, project_steps: [] },
  'an_demo_backend|posting|dp_backend_02|interpretation': { job: 'backend', scope: { level: 'posting', cluster_tag: '빅테크·플랫폼', posting_id: 'dp_backend_02' }, baseline: ['p'] },
  'an_demo_backend|cluster|bigtech_platform|strategy': { job: 'backend', scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼', posting_id: null }, checklist: [{ item_id: 'cc_backend_api' }] },
  'an_demo_backend|cluster|bigtech_platform|roadmap': ROADMAP,
}

function makeDb(overrides = {}) {
  return {
    getJobRoles: async () => JOB_ROLES,
    getClusters: async () => CLUSTERS,
    getPostingsInCluster: async (job, clusterId) => POSTINGS[`${job}|${clusterId}`] || [],
    getActiveAnalysis: async (job) => (job === 'security' ? null : `an_demo_${job}`),
    getOutput: async (version, level, scopeId, type) => OUTPUTS[`${version}|${level}|${scopeId}|${type}`] || null,
    // 기본은 캐시 미적중이다. 적중을 보는 시험이 이 둘을 갈아 끼운다.
    getUserPostingByHash: async () => null,
    getUserPostingAnalyses: async () => [],
    getLegacyPostingSamples: async () => [],
    ...overrides,
  }
}

// 앱을 실제 포트에 올리고 fetch 로 부른다. 별도 테스트 클라이언트를 더하지 않는다.
function startApp(options = {}) {
  const app = createApp(options)
  return new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => {
      const { port } = listener.address()
      resolve({
        listener,
        base: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => listener.close(done)),
      })
    })
  })
}

async function post(base, path, body) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return { status: response.status, body: await response.json() }
}

// ---- 조회 라우트 ---------------------------------------------------------

describe('조회 라우트', () => {
  let app

  beforeAll(async () => {
    app = await startApp({ db: makeDb() })
  })
  afterAll(async () => {
    await app.close()
  })

  test('GET /api/jobs 는 화면 선택지를 낸다', async () => {
    const response = await fetch(`${app.base}/api/jobs`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(JOB_ROLES)
  })

  test('GET /api/stats 는 활성 버전의 statistics payload 를 그대로 낸다', async () => {
    const response = await fetch(`${app.base}/api/stats?job=backend`)
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual(OUTPUTS['an_demo_backend|overall|backend|statistics'])
  })

  test('GET /api/stats 는 backend 외 직무도 허용한다', async () => {
    const response = await fetch(`${app.base}/api/stats?job=frontend`)
    // frontend 는 활성 버전은 있으나 산출물이 없으므로 503 이다. 400 UNSUPPORTED_JOB 이 아니다.
    expect(response.status).toBe(503)
    expect((await response.json()).error.code).toBe('NO_ACTIVE_ANALYSIS')
  })

  test('GET /api/stats 는 목록에 없는 직무만 400 이다', async () => {
    const response = await fetch(`${app.base}/api/stats?job=chef`)
    expect(response.status).toBe(400)
    expect((await response.json()).error.code).toBe('UNSUPPORTED_JOB')
  })

  test('활성 분석 버전이 없으면 503 NO_ACTIVE_ANALYSIS 다', async () => {
    const response = await fetch(`${app.base}/api/stats?job=security`)
    expect(response.status).toBe(503)
    expect((await response.json()).error.code).toBe('NO_ACTIVE_ANALYSIS')
  })

  test('POST /api/reverse 는 posting 범위 payload 와 공고 목록을 낸다', async () => {
    const { status, body } = await post(app.base, '/api/reverse', {
      job: 'backend',
      scope: { level: 'posting', cluster_tag: '빅테크·플랫폼', posting_id: 'dp_backend_02' },
    })
    expect(status).toBe(200)
    expect(body.baseline).toEqual(['p'])
    expect(body.postings_in_cluster).toEqual(POSTINGS['backend|bigtech_platform'])
  })

  test('POST /api/conditions 는 posting 요청을 그 공고의 기업군으로 떨어뜨린다', async () => {
    const { status, body } = await post(app.base, '/api/conditions', {
      job: 'backend',
      scope: { level: 'posting', cluster_tag: '빅테크·플랫폼', posting_id: 'dp_backend_02' },
    })
    expect(status).toBe(200)
    expect(body.scope).toEqual({ level: 'cluster', cluster_tag: '빅테크·플랫폼', posting_id: null })
    expect(body.checklist).toEqual([{ item_id: 'cc_backend_api' }])
  })

  test('overall 범위에는 공고 목록을 붙이지 않는다', async () => {
    const { body } = await post(app.base, '/api/reverse', { job: 'backend', scope: { level: 'overall' } })
    expect(body.postings_in_cluster).toBeUndefined()
    expect(body.baseline).toEqual(['b'])
  })

  test('알 수 없는 기업군은 400 INVALID_SCOPE 다', async () => {
    const { status, body } = await post(app.base, '/api/reverse', {
      job: 'backend',
      scope: { level: 'cluster', cluster_tag: '없는기업군' },
    })
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_SCOPE')
  })

  test('기업군에 없는 공고는 400 INVALID_SCOPE 다', async () => {
    const { status, body } = await post(app.base, '/api/reverse', {
      job: 'backend',
      scope: { level: 'posting', cluster_tag: '스타트업', posting_id: 'dp_backend_02' },
    })
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_SCOPE')
  })

  test('범위 형태가 어긋나면 400 이다', async () => {
    const { status } = await post(app.base, '/api/reverse', { job: 'backend', scope: { level: 'cluster' } })
    expect(status).toBe(400)
  })
})

// ---- 평면 표 폴백 --------------------------------------------------------

describe('GET /api/stats 의 평면 표 폴백', () => {
  const sample = {
    posting_id: 'R001', title: '백엔드 개발자', company: '테스트', cluster_tag: '플랫폼',
    snapshot: 'recent', source: { type: 'curation' }, entry_label: '신입가능',
    edu_label: '학력무관', career_label: '신입가능',
    skills: [{ name: 'Java', slug: 'java', requirement: 'required' }],
    out_of_role_tags: [], advanced_spans: [], axis_mentions: [], reality_tags: [],
  }
  const labels = {
    out_tags: {}, advanced_types: {}, combos: [], reality_labels: {}, axis_labels: { performance: '성능·트래픽' },
  }

  test('기본으로는 꺼져 있어 503 을 낸다', async () => {
    const app = await startApp({ db: makeDb({ getLegacyPostingSamples: async () => [sample] }) })
    const response = await fetch(`${app.base}/api/stats?job=frontend`)
    await app.close()
    expect(response.status).toBe(503)
  })

  test('켜면 backend 만 평면 표로 집계한다', async () => {
    const app = await startApp({
      db: makeDb({
        getActiveAnalysis: async () => null,
        getLegacyPostingSamples: async () => [sample],
      }),
      legacyFallback: true,
      legacyLabels: labels,
    })
    const backend = await fetch(`${app.base}/api/stats?job=backend`)
    const backendBody = await backend.json()
    const frontend = await fetch(`${app.base}/api/stats?job=frontend`)
    await app.close()

    expect(backend.status).toBe(200)
    expect(backendBody.meta.fallback).toBe('legacy_posting_samples')
    expect(backendBody.tech_freq[0].slug).toBe('java')
    // 다른 직무는 폴백으로 덮지 않는다.
    expect(frontend.status).toBe(503)
  })
})

// ---- 로드맵 재조합 -------------------------------------------------------

// 재조합은 Express 소관이다(docs/architecture.md 4장·9장). 두 경로 모두 FastAPI 를 부르지 않는다.

describe('POST /api/roadmap', () => {
  // 어떤 요청에서도 에이전트를 부르지 않는다는 것을 함께 본다.
  function noAgent() {
    const calls = []
    return {
      calls,
      fetch: async (url) => {
        calls.push(url)
        return { ok: true, status: 200, json: async () => ({}) }
      },
    }
  }

  test('체크가 비면 저장된 payload 를 그대로 낸다. 에이전트를 부르지 않는다', async () => {
    const agent = noAgent()
    const app = await startApp({ db: makeDb(), fetch: agent.fetch })
    const { status, body } = await post(app.base, '/api/roadmap', {
      job: 'backend',
      scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼' },
      checks: {},
    })
    await app.close()

    expect(status).toBe(200)
    expect(agent.calls).toEqual([])
    expect(body.project_steps).toEqual(ROADMAP.project_steps)
    expect(body.postings_in_cluster).toEqual(POSTINGS['backend|bigtech_platform'])
  })

  test('체크가 있으면 Express 가 재조합한다. 에이전트를 부르지 않는다', async () => {
    const agent = noAgent()
    const app = await startApp({ db: makeDb(), agentUrl: 'http://agent.test', fetch: agent.fetch })
    const { status, body } = await post(app.base, '/api/roadmap', {
      job: 'backend',
      scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼' },
      checks: { cc_backend_api: true },
    })
    await app.close()

    expect(status).toBe(200)
    expect(agent.calls).toEqual([])
    // 보유한 개념을 채우는 STEP 01 이 뒤로 밀리고 우선순위가 한 칸 내려간다.
    expect(body.project_steps.map((step) => [step.n, step.title, step.priority])).toEqual([
      [1, '둘째 단계', 'high'],
      [2, '첫 단계', 'high'],
    ])
    // 남은 단계가 1 부터 다시 번호를 받고 phase 의 번호가 함께 움직인다.
    expect(body.project_steps.map((step) => step.phase)).toEqual(['STEP 01 · 2주', 'STEP 02 · 3주'])
    expect(body.study_tracks[0].phase).toBe('STEP 02~02와 병행')
    expect(body.check_rows).toEqual([
      { item_id: 'cc_backend_api', source_step: '보유' },
      { item_id: 'cc_backend_db', source_step: 'STEP 01' },
    ])
    expect(body.postings_in_cluster).toEqual(POSTINGS['backend|bigtech_platform'])
  })

  test('재조합이 저장된 payload 를 고치지 않는다', async () => {
    const app = await startApp({ db: makeDb() })
    const before = JSON.stringify(ROADMAP)
    await post(app.base, '/api/roadmap', {
      job: 'backend',
      scope: { level: 'cluster', cluster_tag: '빅테크·플랫폼' },
      checks: { cc_backend_api: true },
    })
    await app.close()
    expect(JSON.stringify(ROADMAP)).toBe(before)
  })
})

// ---- 사용자 공고 입력 ----------------------------------------------------

describe('POST /api/postings/analyze', () => {
  const longText = '백엔드 개발자를 모집합니다. '.repeat(20)

  // 캐시 적중용 가짜 저장소. `user_postings` 한 행과 결과 세 행을 흉내 낸다.
  const CACHED_POSTING = { user_posting_id: 'up_demo01', job_role_id: 'backend' }
  const CACHED_ROWS = [
    { user_posting_id: 'up_demo01', analysis_version: 'an_demo_backend', output_type: 'interpretation', payload: { baseline: ['cached-b'] } },
    { user_posting_id: 'up_demo01', analysis_version: 'an_demo_backend', output_type: 'strategy', payload: { checklist: ['cached-c'] } },
    { user_posting_id: 'up_demo01', analysis_version: 'an_demo_backend', output_type: 'roadmap', payload: { project_steps: ['cached-s'] } },
  ]

  function cacheHitDb(rows = CACHED_ROWS) {
    return makeDb({
      getUserPostingByHash: async () => CACHED_POSTING,
      getUserPostingAnalyses: async () => rows,
    })
  }

  test('캐시가 적중하면 Express 가 직접 답한다. 에이전트를 부르지 않는다', async () => {
    const calls = []
    const app = await startApp({
      db: cacheHitDb(),
      fetch: async (url) => {
        calls.push(url)
        return { ok: true, status: 200, json: async () => ({}) }
      },
    })
    const { status, body } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: longText })
    await app.close()

    expect(status).toBe(200)
    expect(calls).toEqual([])
    expect(body.job).toBe('backend')
    expect(body.matched).toBe(true)
    expect(body.source).toBe('cache')
    expect(body.interpretation.baseline).toEqual(['cached-b'])
    expect(body.strategy.checklist).toEqual(['cached-c'])
    expect(body.roadmap.project_steps).toEqual(['cached-s'])
    // payload 의 source 도 응답 사실에 맞춘다.
    expect(body.interpretation.source).toBe('cache')
  })

  test('세 종이 한 벌로 갖춰지지 않으면 캐시 적중으로 보지 않는다', async () => {
    let sent = null
    const app = await startApp({
      db: cacheHitDb(CACHED_ROWS.slice(0, 2)),
      agentUrl: 'http://agent.test',
      fetch: async (url) => {
        sent = url
        return { ok: true, status: 200, json: async () => ({ job: 'backend', matched: false, source: 'agent' }) }
      },
    })
    const { status, body } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: longText })
    await app.close()

    expect(status).toBe(200)
    expect(sent).toBe('http://agent.test/postings/analyze')
    expect(body.source).toBe('agent')
  })

  test('에이전트에 닿지 못하면 직무 일반 결과를 함께 실어 안내한다', async () => {
    const app = await startApp({
      db: makeDb(),
      fetch: async () => {
        throw new Error('connect ECONNREFUSED')
      },
    })
    const { status, body } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: longText })
    await app.close()

    // 502 로 끝내지 않는다. 화면이 안내를 띄우고 직무 일반 결과를 보여 줄 수 있어야 한다.
    expect(status).toBe(503)
    expect(body.error.code).toBe('ONDEMAND_UNAVAILABLE')
    expect(body.matched).toBe(false)
    expect(body.source).toBe('unavailable')
    expect(body.interpretation.baseline).toEqual(['b'])
    expect(body.strategy).not.toBeNull()
    expect(body.roadmap).not.toBeNull()
  })

  test('미적중일 때만 정규화한 원문과 해시를 FastAPI 로 넘긴다', async () => {
    let sent = null
    const app = await startApp({
      db: makeDb(),
      agentUrl: 'http://agent.test',
      fetch: async (url, init) => {
        sent = { url, body: JSON.parse(init.body) }
        return { ok: true, status: 200, json: async () => ({ source: 'cache', matched: true }) }
      },
    })
    const { status, body } = await post(app.base, '/api/postings/analyze', {
      job: 'backend',
      raw_text: `${longText}\r\n\r\n\r\n문의 recruit@example.com`,
    })
    await app.close()

    expect(status).toBe(200)
    expect(body.source).toBe('cache')
    expect(sent.url).toBe('http://agent.test/postings/analyze')
    expect(sent.body.job_role_id).toBe('backend')
    expect(sent.body.content_hash).toHaveLength(64)
    expect(sent.body.normalized_text).not.toContain('recruit@example.com')
    expect(sent.body.normalized_text).not.toContain('\r')
  })

  test('200자 미만은 400 INVALID_LENGTH 다', async () => {
    const app = await startApp({ db: makeDb() })
    const { status, body } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: '짧은 공고' })
    await app.close()
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_LENGTH')
  })

  test('12000자를 넘으면 400 INVALID_LENGTH 다', async () => {
    const app = await startApp({ db: makeDb() })
    const { status, body } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: '가'.repeat(12001) })
    await app.close()
    expect(status).toBe(400)
    expect(body.error.code).toBe('INVALID_LENGTH')
  })

  test('IP 당 분당 5회를 넘으면 429 다', async () => {
    const app = await startApp({
      db: makeDb(),
      fetch: async () => ({ ok: true, status: 200, json: async () => ({ source: 'cache' }) }),
    })
    const codes = []
    for (let i = 0; i < 6; i += 1) {
      const { status } = await post(app.base, '/api/postings/analyze', { job: 'backend', raw_text: longText })
      codes.push(status)
    }
    await app.close()

    expect(codes.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(codes[5]).toBe(429)
  })
})

// ---- 중계 ---------------------------------------------------------------

describe('POST /api/extract', () => {
  test('그대로 FastAPI 로 중계한다', async () => {
    let sent = null
    const app = await startApp({
      db: makeDb(),
      agentUrl: 'http://agent.test',
      fetch: async (url, init) => {
        sent = { url, body: JSON.parse(init.body) }
        return { ok: true, status: 200, json: async () => ({ ok: true }) }
      },
    })
    const { status } = await post(app.base, '/api/extract', { raw_text: '원문' })
    await app.close()

    expect(status).toBe(200)
    expect(sent.url).toBe('http://agent.test/extract')
    expect(sent.body).toEqual({ raw_text: '원문' })
  })
})
