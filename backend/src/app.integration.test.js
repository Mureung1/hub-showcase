import { describe, test, expect, vi } from 'vitest';
import request from 'supertest';

// KAMIS는 실제 네트워크 호출이라 테스트에서는 항상 폴백(null)만 타게 해서 느려지거나 외부 API에
// 의존하지 않게 한다 — prices.integration.test.js와 동일한 패턴.
vi.mock('./prices/kamisClient.js', () => ({ fetchRetailPrice: async () => null }));

const { default: app } = await import('./app.js');

describe('app.js 공통 미들웨어', () => {
  test('등록되지 않은 라우트는 404 JSON을 반환한다', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Not found: GET /api/nope' });
  });

  test('CORS 헤더가 열려 있다', async () => {
    const res = await request(app).get('/api/prices');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  test('Content-Type 없이 POST를 보내도 req.body가 {}로 채워져 컨트롤러가 크래시하지 않는다', async () => {
    const res = await request(app)
      .post('/api/fridge')
      .type('text/plain') // express.json()이 파싱하지 않는 Content-Type
      .send('this is not json');
    // req.body.quantityLabel 등이 undefined인 채로 컨트롤러의 400 검증 분기를 정상적으로 타야 한다
    // (throw나 500이 아니라 검증 로직이 예상대로 동작하는지 확인)
    expect(res.status).toBe(400);
  });
});
