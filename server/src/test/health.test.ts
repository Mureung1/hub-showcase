import request from 'supertest'
import { app } from '../app.js'

test('GET /api/health → 200 ok', async () => {
  const res = await request(app).get('/api/health')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ ok: true })
})
