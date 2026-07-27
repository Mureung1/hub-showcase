import { vi, describe, test, expect, beforeEach } from 'vitest';

vi.mock('../supabaseClient.js', async () => {
  const { mockSupabaseClient } = await import('../test/mockSupabase.js');
  return { supabase: mockSupabaseClient };
});

import request from 'supertest';
import app from '../app.js';
import { mockSupabaseClient, initialFridgeToRows } from '../test/mockSupabase.js';
import { initialFridge } from '../data/initialFridge.js';

const seedRows = initialFridgeToRows(initialFridge);

beforeEach(() => {
  mockSupabaseClient.reset(seedRows);
});

describe('GET /api/recipes', () => {
  test('기본 페이지네이션 응답 shape을 반환한다', async () => {
    const res = await request(app).get('/api/recipes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ items: expect.any(Array), total: expect.any(Number), page: 1, totalPages: expect.any(Number) }),
    );
  });
});

describe('GET /api/recipes/:id', () => {
  test('존재하지 않는 id면 404', async () => {
    const res = await request(app).get('/api/recipes/no-such-recipe');
    expect(res.status).toBe(404);
  });

  test('multiplier가 0 이하면 400', async () => {
    const res = await request(app).get('/api/recipes/tofu-braise?multiplier=-1');
    expect(res.status).toBe(400);
  });

  test('정상 상세 조회하면 재료별 보유 여부(have)가 담겨 온다', async () => {
    const res = await request(app).get('/api/recipes/tofu-braise');
    expect(res.status).toBe(200);
    const tofuIng = res.body.ingredients.find((i) => i.id === 'tofu');
    expect(tofuIng.have).toBe(true);
  });
});

describe('POST /api/recipes/:id/cook-done', () => {
  test('deductions가 배열이 아니면 400', async () => {
    const res = await request(app).post('/api/recipes/tofu-braise/cook-done').send({ deductions: 'oops' });
    expect(res.status).toBe(400);
  });

  test('존재하지 않는 레시피 id면 400', async () => {
    const res = await request(app)
      .post('/api/recipes/no-such-recipe/cook-done')
      .send({ deductions: [{ id: 'tofu', use: 0.5 }] });
    expect(res.status).toBe(400);
  });

  test('정상 차감하면 재고가 실제로 줄어든다(전량 소진 -> 소진 표시 + fridge에서 제외)', async () => {
    const res = await request(app)
      .post('/api/recipes/tofu-braise/cook-done')
      .send({ deductions: [{ id: 'tofu', use: 0.5 }] });
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'tofu', after: '소진' })]),
    );
    expect(res.body.fridge.tofu).toBeUndefined();

    const getRes = await request(app).get('/api/fridge');
    expect(getRes.body.tofu).toBeUndefined();
  });

  test('두 번째 항목 쓰기 중 DB 에러가 나면 500 + partiallyApplied/failed/notAttempted로 반영 범위를 알려준다', async () => {
    const onionRow = mockSupabaseClient.getRows().find((r) => r.ingredient_id === 'onion');
    mockSupabaseClient.failNextWriteFor(onionRow.id);

    const res = await request(app)
      .post('/api/recipes/tofu-braise/cook-done')
      .send({ deductions: [{ id: 'pork', use: 0.1 }, { id: 'onion', use: 0.1 }, { id: 'tofu', use: 0.1 }] });

    expect(res.status).toBe(500);
    expect(res.body.partiallyApplied).toEqual(['pork']);
    expect(res.body.failed).toBe('onion');
    expect(res.body.notAttempted).toEqual(['tofu']);

    // pork는 실제로 반영됐어야 한다(완전 롤백은 아님 — store.js cookDone 주석 참고)
    const getRes = await request(app).get('/api/fridge');
    expect(getRes.body.pork.qtyLabel).toBe('299.9g');
  });
});
