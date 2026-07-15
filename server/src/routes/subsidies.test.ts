import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from '../app.js'
import { sampleSubsidies } from '../data/sample-subsidies.js'

describe('GET /api/subsidies', () => {
  it('전체 목록과 total이 일치한다', async () => {
    const res = await request(app).get('/api/subsidies')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(sampleSubsidies.length)
    expect(res.body.items).toHaveLength(sampleSubsidies.length)
  })
})

describe('GET /api/subsidies/:id', () => {
  it('존재하는 id는 해당 항목을 반환한다', async () => {
    const target = sampleSubsidies[0]
    const res = await request(app).get(`/api/subsidies/${target.id}`)
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(target.id)
  })

  it('존재하지 않는 id는 404와 error 메시지를 반환한다', async () => {
    const res = await request(app).get('/api/subsidies/does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'Not found' })
  })

  it('빈 문자열 id 세그먼트는 목록 라우트로 처리된다', async () => {
    const res = await request(app).get('/api/subsidies/')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(sampleSubsidies.length)
  })

  it('id에 특수문자가 섞여 있어도 404를 반환한다 (500이 아님)', async () => {
    const res = await request(app).get(
      '/api/subsidies/' + encodeURIComponent('../../etc/passwd'),
    )
    expect(res.status).toBe(404)
  })
})
