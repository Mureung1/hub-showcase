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

describe('POST /api/receipts', () => {
  test('파일 없이 요청하면 mock 스캔 결과(재료 3종 + 흐릿함 1건)로 201 응답', async () => {
    const res = await request(app).post('/api/receipts').send();
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(4);
    expect(res.body.items.filter((it) => it.matched)).toHaveLength(3);
    expect(res.body.items.some((it) => it.matched === false)).toBe(true);
  });

  test('8MB를 넘는 사진을 첨부하면 413과 한국어 안내 메시지가 온다', async () => {
    const oversized = Buffer.alloc(9 * 1024 * 1024, 1);
    const res = await request(app)
      .post('/api/receipts')
      .attach('photo', oversized, { filename: 'receipt.jpg', contentType: 'image/jpeg' });
    expect(res.status).toBe(413);
    expect(res.body.error).toContain('사진 용량이 너무 커요');
  });
});

describe('POST /api/receipts/:id/confirm', () => {
  test('존재하지 않는 영수증 id면 404', async () => {
    const res = await request(app).post('/api/receipts/r_없음/confirm').send({});
    expect(res.status).toBe(404);
  });

  test('expiryOverrides 날짜 형식이 잘못되면 400', async () => {
    const res = await request(app)
      .post('/api/receipts/r_1/confirm')
      .send({ expiryOverrides: { onion: '2026/07/20' } }); // YYYY-MM-DD가 아님
    expect(res.status).toBe(400);
  });

  test('정상 confirm하면 매칭된 재료가 냉장고(GET /api/fridge)에 반영된다', async () => {
    const createRes = await request(app).post('/api/receipts').send();
    const receiptId = createRes.body.id;
    const matchedIds = createRes.body.items.filter((it) => it.matched).map((it) => it.matchedIngredientId);
    expect(matchedIds.length).toBeGreaterThan(0);

    const confirmRes = await request(app).post(`/api/receipts/${receiptId}/confirm`).send({});
    expect(confirmRes.status).toBe(200);
    matchedIds.forEach((id) => {
      expect(confirmRes.body[id]).toBeDefined();
    });

    const getRes = await request(app).get('/api/fridge');
    matchedIds.forEach((id) => {
      expect(getRes.body[id]).toBeDefined();
    });
  });

  test('expiryOverrides로 넘긴 날짜가 자동계산값 대신 실제로 저장된다', async () => {
    process.env.DEMO_TODAY = '2026-07-21';
    // 목 인식 결과는 재료 3종을 무작위로 고르므로(store.js buildMockReceiptItems), 신선식품이
    // 뽑힐 때까지 재시도한다(신선식품 비율 약 56% — 10회 재시도면 사실상 항상 하나는 걸림).
    let createRes, freshId;
    for (let i = 0; i < 10 && !freshId; i++) {
      createRes = await request(app).post('/api/receipts').send();
      freshId = createRes.body.items.find((it) => it.matched && it.category === 'fresh')?.matchedIngredientId;
    }
    expect(freshId).toBeDefined();

    const confirmRes = await request(app)
      .post(`/api/receipts/${createRes.body.id}/confirm`)
      .send({ expiryOverrides: { [freshId]: '2026-07-25' } });
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body[freshId].expiry).toBe('D-4'); // 2026-07-25 - 2026-07-21(DEMO_TODAY)
  });
});
