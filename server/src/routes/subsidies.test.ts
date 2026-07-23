import type { Subsidy } from '@hub/shared'
import request from 'supertest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/subsidies-repo.js', () => ({
  findAll: vi.fn(),
  findById: vi.fn(),
  match: vi.fn(),
}))

import { app } from '../app.js'
import { findAll, findById } from '../db/subsidies-repo.js'

const mockFindAll = vi.mocked(findAll)
const mockFindById = vi.mocked(findById)

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

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/subsidies', () => {
  it('repo 결과와 total이 일치한다', async () => {
    mockFindAll.mockResolvedValue([sample, { ...sample, id: '2' }])
    const res = await request(app).get('/api/subsidies')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.items).toHaveLength(2)
  })

  it('잘못된 sort 값은 기본 정렬(match)로 처리된다', async () => {
    mockFindAll.mockResolvedValue([sample])
    const res = await request(app).get('/api/subsidies?sort=bogus')
    expect(res.status).toBe(200)
    expect(res.body.sort).toBe('match')
    expect(mockFindAll).toHaveBeenCalledWith('match')
  })

  it('유효한 sort 값은 그대로 repo에 전달된다', async () => {
    mockFindAll.mockResolvedValue([sample])
    const res = await request(app).get('/api/subsidies?sort=deadline')
    expect(res.status).toBe(200)
    expect(mockFindAll).toHaveBeenCalledWith('deadline')
  })

  it('repo가 실패하면 500을 반환한다', async () => {
    mockFindAll.mockRejectedValue(new Error('boom'))
    const res = await request(app).get('/api/subsidies')
    expect(res.status).toBe(500)
    expect(res.body).toHaveProperty('error')
  })
})

describe('GET /api/subsidies/:id', () => {
  it('존재하는 id는 해당 항목을 반환한다', async () => {
    mockFindById.mockResolvedValue(sample)
    const res = await request(app).get('/api/subsidies/1')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe('1')
  })

  it('존재하지 않는 id는 404와 error 메시지를 반환한다', async () => {
    mockFindById.mockResolvedValue(null)
    const res = await request(app).get('/api/subsidies/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('빈 문자열 id 세그먼트는 목록 라우트로 처리된다', async () => {
    mockFindAll.mockResolvedValue([sample])
    const res = await request(app).get('/api/subsidies/')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
  })

  it('repo가 실패하면 500을 반환한다', async () => {
    mockFindById.mockRejectedValue(new Error('boom'))
    const res = await request(app).get('/api/subsidies/1')
    expect(res.status).toBe(500)
  })
})
