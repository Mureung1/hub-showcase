import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import request from 'supertest'
import { app } from '../src/app.js'

describe('공통 API 기반', () => {
  it('GET /health는 공통 성공 응답을 반환한다', async () => {
    const response = await request(app).get('/health').expect(200)

    assert.deepEqual(response.body, {
      data: {
        status: 'ok',
      },
    })
  })

  it('없는 경로는 공통 404 오류를 반환한다', async () => {
    const response = await request(app).get('/not-found').expect(404)

    assert.deepEqual(response.body, {
      error: {
        code: 'NOT_FOUND',
        message: '요청한 경로를 찾을 수 없어요.',
      },
    })
  })

  it('허용된 origin에는 CORS 응답 헤더를 보낸다', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'http://localhost:5173')
      .expect(200)

    assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173')
  })

  it('허용되지 않은 origin은 403으로 차단한다', async () => {
    const response = await request(app)
      .get('/health')
      .set('Origin', 'https://example.com')
      .expect(403)

    assert.equal(response.body.error.code, 'FORBIDDEN')
  })
})
