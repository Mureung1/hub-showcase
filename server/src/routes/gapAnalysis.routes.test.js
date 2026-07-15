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

  it('spec 없이 보내면 400을 응답하고 아무것도 저장하지 않는다', async () => {
    const res = await request(createApp()).post('/api/gap-analysis').send({})

    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty('error')
  })

  it('education이 유효하지 않으면 400을 응답한다', async () => {
    const res = await request(createApp())
      .post('/api/gap-analysis')
      .send({ spec: { ...spec, education: '초졸' } })

    expect(res.status).toBe(400)
  })
})

describe('GET /api/gap-analysis/:id', () => {
  it('방금 POST한 id로 조회하면 저장 당시와 동일한 결과가 응답된다', async () => {
    const postRes = await request(createApp()).post('/api/gap-analysis').send({ spec })
    insertedIds.push(postRes.body.id)

    const getRes = await request(createApp()).get(`/api/gap-analysis/${postRes.body.id}`)

    expect(getRes.status).toBe(200)
    expect(getRes.body).toEqual(postRes.body)
  })

  it('존재하지 않는 id로 조회하면 404를 응답한다', async () => {
    const res = await request(createApp()).get('/api/gap-analysis/999999')
    expect(res.status).toBe(404)
  })
})
