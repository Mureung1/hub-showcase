import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviceMocks = vi.hoisted(() => ({
  capture: vi.fn(),
  updateMemo: vi.fn(),
}));

vi.mock('./supabase_insight_capture.js', () => ({
  createSupabaseInsightCaptureService: () => ({
    capture: serviceMocks.capture,
  }),
}));

vi.mock('./supabase_insight_memo.js', () => ({
  createSupabaseInsightMemoService: () => ({
    update: serviceMocks.updateMemo,
  }),
}));

import { createOperatingApp } from './operating_app';

const environment = {
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
};

describe('운영 API 서비스 조립', () => {
  beforeEach(() => {
    serviceMocks.capture.mockReset();
    serviceMocks.updateMemo.mockReset();
  });

  it('캡처 요청을 운영 캡처 서비스에 전달한다', async () => {
    serviceMocks.capture.mockResolvedValue({
      ok: false,
      reason: 'invalid-request',
    });
    const app = createOperatingApp(environment);

    const response = await request(app)
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({ source: 'web', url: 'https://example.com' });

    expect(response.status).toBe(400);
    expect(serviceMocks.capture).toHaveBeenCalledWith('access-token', {
      source: 'web',
      url: 'https://example.com',
    });
  });

  it('메모 요청을 운영 메모 서비스에 전달한다', async () => {
    serviceMocks.updateMemo.mockResolvedValue({
      ok: false,
      reason: 'not-found',
    });
    const app = createOperatingApp(environment);

    const response = await request(app)
      .patch('/api/insights/123e4567-e89b-42d3-a456-426614174000/memo')
      .set('Authorization', 'Bearer access-token')
      .send({ memo: '다시 보기' });

    expect(response.status).toBe(404);
    expect(serviceMocks.updateMemo).toHaveBeenCalledWith(
      'access-token',
      '123e4567-e89b-42d3-a456-426614174000',
      { memo: '다시 보기' }
    );
  });
});
