import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createApp } from './app.js'

describe('GET /api/health', () => {
  it('returns ok status with db connectivity', async () => {
    const res = await request(createApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok', db: true })
  })
})
