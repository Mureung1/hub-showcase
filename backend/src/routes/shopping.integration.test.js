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

describe('GET /api/shopping/sets', () => {
  test('200과 세트 목록 shape을 반환한다', async () => {
    const res = await request(app).get('/api/shopping/sets');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sets)).toBe(true);
    expect(res.body.sets.length).toBeGreaterThan(0);
    expect(res.body.sets[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
  });
});

describe('GET /api/shopping/list', () => {
  test('setId를 주면 장보기 목록 shape(buy/have/total)을 반환한다', async () => {
    const res = await request(app).get('/api/shopping/list?setId=minCost');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({ setName: expect.any(String), buy: expect.any(Array), have: expect.any(Array), total: expect.any(Number) }),
    );
  });
});
