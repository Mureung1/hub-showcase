import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { db } from '../db/connection.js'

// 실제 Supabase 프로젝트 없이도 테스트할 수 있도록 auth 검증과 북마크 CRUD만 모킹한다.
// jobs 존재 확인 로직은 로컬 SQLite에 실제로 시드된 데이터를 그대로 쓴다.
const mockGetUser = vi.fn()
vi.mock('../db/supabaseAuthClient.js', () => ({
  supabaseAuthClient: { auth: { getUser: (...args) => mockGetUser(...args) } },
}))

const mockUpsert = vi.fn(async () => ({ error: null }))
const mockDeleteEq = vi.fn(async () => ({ error: null }))
const mockSelectEq = vi.fn(async () => ({ data: [], error: null }))
vi.mock('../db/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    from: () => ({
      upsert: (...args) => mockUpsert(...args),
      delete: () => ({ eq: () => ({ eq: (...args) => mockDeleteEq(...args) }) }),
      select: () => ({ eq: (...args) => mockSelectEq(...args) }),
    }),
  },
}))

const TEST_USER_ID = 'test-user-id'
const realJobId = db.prepare('SELECT job_id FROM jobs LIMIT 1').get().job_id

beforeEach(() => {
  mockGetUser.mockReset()
  mockUpsert.mockClear()
  mockDeleteEq.mockClear()
  mockSelectEq.mockClear()
})

describe('북마크 인증', () => {
  it('Authorization 헤더가 없으면 401을 응답한다', async () => {
    const res = await request(createApp()).get('/api/bookmarks')
    expect(res.status).toBe(401)
  })

  it('토큰 검증에 실패하면 401을 응답한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })
    const res = await request(createApp())
      .get('/api/bookmarks')
      .set('Authorization', 'Bearer bad-token')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/bookmarks', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null })
  })

  it('로컬 jobs에 존재하는 job_id면 201과 함께 job 정보를 응답한다', async () => {
    const res = await request(createApp())
      .post('/api/bookmarks')
      .set('Authorization', 'Bearer good-token')
      .send({ job_id: realJobId })

    expect(res.status).toBe(201)
    expect(res.body.job_id).toBe(realJobId)
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: TEST_USER_ID, job_id: String(realJobId) },
      { onConflict: 'user_id,job_id' },
    )
  })

  it('존재하지 않는 job_id면 404를 응답하고 Supabase는 호출하지 않는다', async () => {
    const res = await request(createApp())
      .post('/api/bookmarks')
      .set('Authorization', 'Bearer good-token')
      .send({ job_id: 999999999 })

    expect(res.status).toBe(404)
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/bookmarks/:job_id', () => {
  it('인증된 요청이면 204를 응답한다', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null })
    const res = await request(createApp())
      .delete(`/api/bookmarks/${realJobId}`)
      .set('Authorization', 'Bearer good-token')

    expect(res.status).toBe(204)
  })
})

describe('GET /api/bookmarks', () => {
  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null })
  })

  it('북마크한 job_id들을 로컬 jobs와 조합해 응답한다', async () => {
    mockSelectEq.mockResolvedValue({ data: [{ job_id: String(realJobId) }], error: null })

    const res = await request(createApp())
      .get('/api/bookmarks')
      .set('Authorization', 'Bearer good-token')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].job_id).toBe(realJobId)
  })

  it('북마크가 없으면 빈 배열을 응답한다', async () => {
    mockSelectEq.mockResolvedValue({ data: [], error: null })

    const res = await request(createApp())
      .get('/api/bookmarks')
      .set('Authorization', 'Bearer good-token')

    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/bookmarks/evaluate', () => {
  const spec = { education: '학사', career_months: 0, certificates: [], major: '전공무관' }

  beforeEach(() => {
    mockGetUser.mockResolvedValue({ data: { user: { id: TEST_USER_ID } }, error: null })
  })

  it('spec이 유효하지 않으면 400을 응답한다', async () => {
    const res = await request(createApp())
      .post('/api/bookmarks/evaluate')
      .set('Authorization', 'Bearer good-token')
      .send({ spec: { ...spec, education: '초졸' } })

    expect(res.status).toBe(400)
  })

  it('북마크한 공고를 지금 보낸 spec 기준으로 재평가한 jobList를 응답한다', async () => {
    mockSelectEq.mockResolvedValue({ data: [{ job_id: String(realJobId) }], error: null })

    const res = await request(createApp())
      .post('/api/bookmarks/evaluate')
      .set('Authorization', 'Bearer good-token')
      .send({ spec })

    expect(res.status).toBe(200)
    expect(res.body.jobList).toHaveLength(1)
    expect(res.body.jobList[0].job.job_id).toBe(realJobId)
    expect(res.body.jobList[0]).toHaveProperty('checks')
    expect(res.body.jobList[0]).toHaveProperty('overallMatch')
    expect(res.body.stats.total).toBe(1)
    expect(res.body.stats).toHaveProperty('improvementRanking')
  })

  it('북마크가 없으면 빈 jobList를 응답한다', async () => {
    mockSelectEq.mockResolvedValue({ data: [], error: null })

    const res = await request(createApp())
      .post('/api/bookmarks/evaluate')
      .set('Authorization', 'Bearer good-token')
      .send({ spec })

    expect(res.status).toBe(200)
    expect(res.body.jobList).toEqual([])
  })
})
