import type { Subsidy } from '@hub/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/subsidies-repo.js', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  match: vi.fn(),
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
}

const validProfile = {
  industry: '음식점',
  region: '서울',
  district: '마포구',
  employees: '1~4명',
  revenue: '1억 미만',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('POST /api/match', () => {
  it('유효한 프로필은 매칭 결과와 total을 반환한다', async () => {
    mockMatch.mockResolvedValue([sample])
    const res = await request(app).post('/api/match').send({ profile: validProfile })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.sort).toBe('match')
    expect(mockMatch).toHaveBeenCalledWith(validProfile, 'match')
    expect(mockInsertMatchRequest).toHaveBeenCalledWith(validProfile, 'match')
  })

  it('sort 값을 함께 넘기면 repo에 전달된다', async () => {
    mockMatch.mockResolvedValue([sample])
    const res = await request(app)
      .post('/api/match')
      .send({ profile: validProfile, sort: 'amount' })
    expect(res.status).toBe(200)
    expect(mockMatch).toHaveBeenCalledWith(validProfile, 'amount')
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
      .send({ profile: { industry: '음식점' } })
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
    mockMatch.mockResolvedValue([sample])
    mockInsertMatchRequest.mockRejectedValue(new Error('insert boom'))
    const res = await request(app).post('/api/match').send({ profile: validProfile })
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
  })
})
