import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from './app.js'


// study: app 을 실제 서버 키지 않고 test함.
describe('GET /api/health', () => {
  it('returns ok status', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
