import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app';
import type { ServerInsightCaptureService } from './insight_capture_service';

describe('GET /api/health', () => {
  it('returns an ok response', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe('POST /api/insights/capture', () => {
  it('passes the bearer token and capture contract to the server service', async () => {
    const captureService = createCaptureService({
      created: true,
      insight: {
        category: null,
        createdAt: '2026-07-16T00:00:00.000Z',
        domain: 'example.com',
        id: '10000000-0000-4000-8000-000000000001',
        memo: null,
        normalizedUrl: 'https://example.com/article',
        originalUrl: 'https://example.com/article',
        title: 'Example article',
        titleOrigin: 'capture',
        updatedAt: '2026-07-16T00:00:00.000Z',
      },
      ok: true,
    });

    const response = await request(createApp({ captureService }))
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({
        source: 'web',
        title: 'Example article',
        url: 'https://example.com/article',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(captureService.result);
    expect(captureService.capture).toHaveBeenCalledWith('access-token', {
      source: 'web',
      title: 'Example article',
      url: 'https://example.com/article',
    });
  });

  it('rejects a request without a bearer token before calling the service', async () => {
    const captureService = createCaptureService({
      ok: false,
      reason: 'write-failed',
    });

    const response = await request(createApp({ captureService }))
      .post('/api/insights/capture')
      .send({ source: 'web', url: 'https://example.com/article' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ ok: false, reason: 'permission-denied' });
    expect(captureService.capture).not.toHaveBeenCalled();
  });
});

function createCaptureService(
  result: Awaited<ReturnType<ServerInsightCaptureService['capture']>>
) {
  const capture = vi.fn(async () => result);

  return {
    capture,
    result,
  } satisfies ServerInsightCaptureService & { result: typeof result };
}
