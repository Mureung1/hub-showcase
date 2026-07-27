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

describe('GET /api/fridge', () => {
  test('시드 데이터가 재료 마스터와 합쳐져(enrich) 나온다', async () => {
    const res = await request(app).get('/api/fridge');
    expect(res.status).toBe(200);
    expect(res.body.pork).toMatchObject({ name: '돼지고기 앞다리', imminent: true });
  });
});

describe('GET /api/fridge/alerts', () => {
  test('"alerts"가 :id 라우트에 먹히지 않고 알림 목록으로 응답한다', async () => {
    const res = await request(app).get('/api/fridge/alerts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('lowStockItems');
    expect(res.body).not.toHaveProperty('relatedRecipes');
    expect(res.body.items.some((it) => it.id === 'pork')).toBe(true);
  });
});

describe('POST /api/fridge', () => {
  test('quantityLabel/purchasedAt이 없으면 400', async () => {
    const res = await request(app).post('/api/fridge').send({ ingredientId: 'onion' });
    expect(res.status).toBe(400);
  });

  test('ingredientId와 name이 둘 다 없으면 400', async () => {
    const res = await request(app).post('/api/fridge').send({ quantityLabel: '1개', purchasedAt: '2026-07-20' });
    expect(res.status).toBe(400);
  });

  test('purchasedAt이 잘못된 날짜 형식이면 400', async () => {
    const res = await request(app)
      .post('/api/fridge')
      .send({ ingredientId: 'onion', quantityLabel: '1개', purchasedAt: '이상한날짜' });
    expect(res.status).toBe(400);
  });

  test('정상 등록하면 201이고, 이후 GET /api/fridge에서 실제로 보인다', async () => {
    const createRes = await request(app)
      .post('/api/fridge')
      .send({ ingredientId: 'onion', quantityLabel: '2개', purchasedAt: '2026-07-20' });
    expect(createRes.status).toBe(201);
    expect(createRes.body.name).toBe('양파');

    const getRes = await request(app).get('/api/fridge');
    expect(getRes.body.onion).toBeDefined();
    expect(getRes.body.onion.qtyLabel).toContain('2');
  });
});

describe('PATCH /api/fridge/:id', () => {
  test('존재하지 않는 id면 404', async () => {
    const res = await request(app).patch('/api/fridge/no-such-id').send({ itemIndex: 0, qtyAmount: 1 });
    expect(res.status).toBe(404);
  });

  test('expiryDate가 잘못된 형식이면 400', async () => {
    const res = await request(app).patch('/api/fridge/pork').send({ itemIndex: 0, expiryDate: '이상한날짜' });
    expect(res.status).toBe(400);
  });

  test('정상 patch 후 재조회하면 반영돼 있다', async () => {
    const patchRes = await request(app).patch('/api/fridge/pork').send({ itemIndex: 0, qtyAmount: 999 });
    expect(patchRes.status).toBe(200);

    const getRes = await request(app).get('/api/fridge');
    expect(getRes.body.pork.qtyLabel).toContain('999');
  });
});

describe('DELETE /api/fridge/:id', () => {
  test('삭제 후 재조회하면 사라져 있다', async () => {
    const delRes = await request(app).delete('/api/fridge/onion');
    expect(delRes.status).toBe(204);

    const getRes = await request(app).get('/api/fridge');
    expect(getRes.body.onion).toBeUndefined();
  });

  test('존재하지 않는 id를 삭제하려 하면 404 응답을 돌려준다', async () => {
    const res = await request(app).delete('/api/fridge/no-such-id');
    expect(res.status).toBe(404);
  });
});
