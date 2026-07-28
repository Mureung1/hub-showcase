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
  industry: [],
  supportRealm: '경영',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/subsidies', () => {
  it('repo 결과와 total이 일치한다', async () => {
    mockFindAll.mockResolvedValue({
      items: [sample, { ...sample, id: '2' }],
      total: 2,
      page: 1,
      limit: 20,
      hasMore: false,
    })
    const res = await request(app).get('/api/subsidies')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.page).toBe(1)
    expect(res.body.limit).toBe(20)
    expect(res.body.hasMore).toBe(false)
  })

  it('잘못된 sort 값은 기본 정렬(match)로 처리된다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app).get('/api/subsidies?sort=bogus')
    expect(res.status).toBe(200)
    expect(res.body.sort).toBe('match')
    expect(mockFindAll).toHaveBeenCalledWith('match', 1, 20)
  })

  it('유효한 sort 값은 그대로 repo에 전달된다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app).get('/api/subsidies?sort=deadline')
    expect(res.status).toBe(200)
    expect(mockFindAll).toHaveBeenCalledWith('deadline', 1, 20)
  })

  it('page/limit 쿼리를 그대로 repo에 전달한다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 25, page: 2, limit: 10, hasMore: true })
    const res = await request(app).get('/api/subsidies?page=2&limit=10')
    expect(res.status).toBe(200)
    expect(res.body.page).toBe(2)
    expect(res.body.limit).toBe(10)
    expect(res.body.hasMore).toBe(true)
    expect(mockFindAll).toHaveBeenCalledWith('match', 2, 10)
  })

  it('잘못된(숫자가 아닌) page/limit 값은 기본값으로 대체된다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app).get('/api/subsidies?page=abc&limit=xyz')
    expect(res.status).toBe(200)
    expect(mockFindAll).toHaveBeenCalledWith('match', 1, 20)
  })

  it('limit이 100을 넘으면 기본값(20)으로 대체된다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
    const res = await request(app).get('/api/subsidies?limit=999')
    expect(res.status).toBe(200)
    expect(mockFindAll).toHaveBeenCalledWith('match', 1, 20)
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
    expect(mockFindById).toHaveBeenCalledWith('1', undefined)
  })

  it('region/supportRealm query가 있으면 profile로 변환해 repo에 전달한다 (이슈 #61/#92)', async () => {
    mockFindById.mockResolvedValue(sample)
    const res = await request(app).get('/api/subsidies/1?region=서울&supportRealm=경영,금융')
    expect(res.status).toBe(200)
    expect(mockFindById).toHaveBeenCalledWith('1', { region: '서울', supportRealm: ['경영', '금융'] })
  })

  it('region query만 있어도 profile로 전달한다', async () => {
    mockFindById.mockResolvedValue(sample)
    const res = await request(app).get('/api/subsidies/1?region=서울')
    expect(res.status).toBe(200)
    expect(mockFindById).toHaveBeenCalledWith('1', { region: '서울', supportRealm: [] })
  })

  it('존재하지 않는 id는 404와 error 메시지를 반환한다', async () => {
    mockFindById.mockResolvedValue(null)
    const res = await request(app).get('/api/subsidies/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('빈 문자열 id 세그먼트는 목록 라우트로 처리된다', async () => {
    mockFindAll.mockResolvedValue({ items: [sample], total: 1, page: 1, limit: 20, hasMore: false })
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
