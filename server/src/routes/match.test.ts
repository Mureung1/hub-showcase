import type { Subsidy } from '@hub/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/subsidies-repo.js', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  match: vi.fn(),
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
}))

vi.mock('../db/match-requests-repo.js', () => ({
  insertMatchRequest: vi.fn(),
}))

import { app } from '../app.js'
import { insertMatchRequest } from '../db/match-requests-repo.js'
import { match } from '../db/subsidies-repo.js'

const mockMatch = vi.mocked(match)
const mockInsertMatchRequest = vi.mocked(insertMatchRequest)

const sample: Subsidy = {
  id: '1',
  name: '청년 창업 임대료 지원',
  org: '서울시',
  amount: '최대 300만원',
  dday: 3,
  match: 92,
  deadline: '2026. 7. 11',
  method: '온라인',
  qualifications: [],
  documents: [],
  how: '온라인 접수',
  where: '서울시 자영업지원센터',
  contact: '02-1234-5678',
  region: ['서울'],
  industry: [],
  supportRealm: '경영',
}

const validProfile = {
  supportRealm: ['경영'],
  region: '서울',
  district: '마포구',
  employees: '1~4명',
  revenue: '1억 미만',
}

beforeEach(() => {
  vi.clearAllMocks()
  // 실제로는 항상 Promise를 반환하는 async 함수라, mock도 기본값을 맞춰둔다
  // (이슈 #118 — bare vi.fn()의 기본 undefined 반환이 route의 .catch() 체이닝과
  // 맞물려 이중 응답/unhandled rejection을 유발했었다).
  mockInsertMatchRequest.mockResolvedValue(undefined)
})

describe('POST /api/match', () => {
  it('유효한 프로필은 매칭 결과와 total을 반환한다', async () => {
    mockMatch.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app).post('/api/match').send({ profile: validProfile })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.sort).toBe('match')
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(20)
    expect(res.body.hasMore).toBe(false)
    expect(mockMatch).toHaveBeenCalledWith(validProfile, 'match', 1, 20)
    expect(mockInsertMatchRequest).toHaveBeenCalledWith(validProfile, 'match')
  })

  it('sort 값을 함께 넘기면 repo에 전달된다', async () => {
    mockMatch.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, sort: 'amount' })
    expect(res.status).toBe(200)
    expect(mockMatch).toHaveBeenCalledWith(validProfile, 'amount', 1, 20)
  })

  it('page/limit 값을 함께 넘기면 repo에 그대로 전달된다', async () => {
    mockMatch.mockResolvedValue({ items: [sample], total: 25, page: 2, limit: 10, hasMore: true })
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, page: 2, limit: 10 })
    expect(res.status).toBe(200)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
    expect(res.body.hasMore).toBe(true)
    expect(mockMatch).toHaveBeenCalledWith(validProfile, 'match', 2, 10)
  })

  it('limit이 100을 넘으면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, limit: 101 })
    expect(res.status).toBe(400)
    expect(mockMatch).not.toHaveBeenCalled()
  })

  it('page가 0 이하이면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, page: 0 })
    expect(res.status).toBe(400)
    expect(mockMatch).not.toHaveBeenCalled()
  })

  it('profile이 없으면 400을 반환한다', async () => {
    const res = await request(app).post('/api/match').send({})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
    expect(mockMatch).not.toHaveBeenCalled()
  })

  it('profile 필드가 누락되면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/match')
      .send({ profile: { supportRealm: ['경영'] } })
    expect(res.status).toBe(400)
    expect(mockMatch).not.toHaveBeenCalled()
  })

  it('잘못된 sort 값은 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, sort: 'bogus' })
    expect(res.status).toBe(400)
  })

  it('repo가 실패하면 500을 반환한다', async () => {
    mockMatch.mockRejectedValue(new Error('boom'))
    const res = await request(app).post('/api/match').send({ profile: validProfile })
    expect(res.status).toBe(500)
  })

  it('매칭 요청 저장이 실패해도 조회 응답은 200을 유지한다', async () => {
    mockMatch.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    mockInsertMatchRequest.mockRejectedValue(new Error('insert boom'))
    const res = await request(app).post('/api/match').send({ profile: validProfile })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
  })
})
