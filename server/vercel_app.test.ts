import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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

    const { default: app } = await import('../api/health');
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  it('같은 배포의 /api/insights/capture 요청을 처리한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');

    const { default: app } = await import('../api/insights/capture');
    const response = await request(app)
      .post('/api/insights/capture')
      .send({ source: 'web', url: 'https://example.com/article' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      reason: 'permission-denied',
    });
  });

  it('같은 배포의 /api/insights/:insightId/memo 요청을 처리한다', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');

    const { default: app } = await import('../api/insights/[insightId]/memo');
    const response = await request(app)
      .patch('/api/insights/10000000-0000-4000-8000-000000000001/memo')
      .send({ memo: '회의 참고' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      ok: false,
      reason: 'permission-denied',
    });
  });

  it.each([
    ['상태 확인', '../api/health.ts'],
    ['인사이트 캡처', '../api/insights/capture.ts'],
    ['인사이트 메모', '../api/insights/[insightId]/memo.ts'],
  ])('%s 경로를 직접 Vercel 함수로 배치한다', (_, modulePath) => {
    const entrypoint = fileURLToPath(new URL(modulePath, import.meta.url));

    expect(existsSync(entrypoint)).toBe(true);
  });
});
