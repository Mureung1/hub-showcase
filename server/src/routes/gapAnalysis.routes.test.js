import { describe, it, expect, afterEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { db } from '../db/connection.js'

const spec = {
  education: '학사',
  career_months: 0,
  certificates: [],
  major: '전공무관',
}

const insertedIds = []

afterEach(() => {
  while (insertedIds.length > 0) {
    db.prepare('DELETE FROM analysis_results WHERE id = ?').run(insertedIds.pop())
  }
})

describe('POST /api/gap-analysis', () => {
  it('스펙만 보내면 201과 함께 통계+공고 리스트가 저장·응답된다', async () => {
    const res = await request(createApp()).post('/api/gap-analysis').send({ spec })
    insertedIds.push(res.body.id)

    expect(res.status).toBe(201)
    expect(res.body.filters).toBeNull()
    expect(res.body.spec).toEqual(spec)
    expect(res.body.stats.total).toBeGreaterThan(0)
    expect(res.body.stats).toHaveProperty('matched')
    expect(res.body.stats).toHaveProperty('ratio')
    expect(res.body.stats).toHaveProperty('improvementRanking')
    expect(Array.isArray(res.body.jobList)).toBe(true)
    expect(res.body.jobList.length).toBe(res.body.stats.total)
  })

  it('저장된 결과가 analysis_results 테이블에 실제 행으로 남는다', async () => {
    const res = await request(createApp()).post('/api/gap-analysis').send({ spec })
    insertedIds.push(res.body.id)

    const row = db.prepare('SELECT * FROM analysis_results WHERE id = ?').get(res.body.id)
    expect(row).toBeTruthy()
    expect(JSON.parse(row.spec_json)).toEqual(spec)
  })

  it('필터를 함께 보내면 필터가 적용된 통계가 저장·응답된다', async () => {
    const filters = { job_category: 'IT전산' }
    const res = await request(createApp()).post('/api/gap-analysis').send({ filters, spec })
    insertedIds.push(res.body.id)

    expect(res.status).toBe(201)
    expect(res.body.filters).toEqual(filters)
    expect(res.body.stats.total).toBeLessThan(862)
  })
})
