import { describe, test, expect, vi } from 'vitest';
import request from 'supertest';

// 실제 KAMIS 네트워크 호출 없이 정적 폴백 경로만 검증 — 100개 재료를 매 테스트마다 실시간
// 조회하면 느리고 외부 API 상태에 좌우된다.
vi.mock('../prices/kamisClient.js', () => ({ fetchRetailPrice: async () => null }));

const { default: app } = await import('../app.js');

describe('GET /api/prices', () => {
  test('200과 시세 목록 shape을 반환한다', async () => {
    const res = await request(app).get('/api/prices');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items[0]).toEqual(expect.objectContaining({ name: expect.any(String), avg: expect.any(Number) }));
  });

  test('q로 재료명을 검색하면 부분일치 결과만 반환한다', async () => {
    const res = await request(app).get('/api/prices?q=양파');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((it) => it.name.includes('양파'))).toBe(true);
  });
});
