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

describe('GET /api/meal-plan/candidates', () => {
  test('200과 레시피 후보 목록을 반환한다', async () => {
    const res = await request(app).get('/api/meal-plan/candidates');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.length).toBeGreaterThan(0);
  });
});

describe('POST /api/meal-plan/weekly', () => {
  test('pickedIds가 배열이 아니면 400', async () => {
    const res = await request(app).post('/api/meal-plan/weekly').send({ pickedIds: 'oops' });
    expect(res.status).toBe(400);
  });

  test('정상 요청이면 200과 days 배열을 반환한다', async () => {
    const res = await request(app).post('/api/meal-plan/weekly').send({});
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.days)).toBe(true);
  });
});

describe('POST /api/meal-plan/shopping-list', () => {
  test('weekPlanIds가 없으면 400', async () => {
    const res = await request(app).post('/api/meal-plan/shopping-list').send({});
    expect(res.status).toBe(400);
  });

  test('정상 요청이면 200과 items/total을 반환한다', async () => {
    const res = await request(app).post('/api/meal-plan/shopping-list').send({ weekPlanIds: ['tofu-braise'] });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.total).toBe('number');
  });
});
