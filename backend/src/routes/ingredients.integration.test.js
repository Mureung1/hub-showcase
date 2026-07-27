import { describe, test, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('GET /api/ingredients', () => {
  test('200과 재료 마스터 배열을 반환한다', async () => {
    const res = await request(app).get('/api/ingredients');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.ingredients)).toBe(true);
    expect(res.body.ingredients.length).toBeGreaterThan(0);
    expect(res.body.ingredients[0]).toEqual(expect.objectContaining({ id: expect.any(String), name: expect.any(String) }));
  });
});
