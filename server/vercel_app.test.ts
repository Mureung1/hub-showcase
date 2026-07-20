import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Vercel API 진입점', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('같은 배포의 /api/health 요청을 처리한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');

    const { default: app } = await import('../api/[...path]');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});
