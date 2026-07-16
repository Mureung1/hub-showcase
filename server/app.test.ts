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

  it.each([
    [{ ok: false, reason: 'permission-denied' } as const, 401],
    [{ ok: false, reason: 'invalid-request' } as const, 400],
    [{ ok: false, reason: 'invalid-url' } as const, 400],
    [{ ok: false, reason: 'unsupported-protocol' } as const, 400],
    [{ ok: false, reason: 'write-failed' } as const, 503],
  ])(
    'maps a capture failure to its HTTP status',
    async (result, expectedStatus) => {
      const captureService = createCaptureService(result);

      const response = await request(createApp({ captureService }))
        .post('/api/insights/capture')
        .set('Authorization', 'Bearer access-token')
        .send({ source: 'web', url: 'https://example.com/article' });

      expect(response.status).toBe(expectedStatus);
      expect(response.body).toEqual(result);
    }
  );

  it('does not expose internal details when the capture service throws', async () => {
    const serviceError = Object.assign(new Error('SENSITIVE_DATABASE_DETAIL'), {
      status: 400,
    });
    const errorLog = vi.fn();
    const captureService: ServerInsightCaptureService = {
      capture: vi.fn().mockRejectedValue(serviceError),
    };
    const logger = { error: errorLog };

    const response = await request(createApp({ captureService, logger }))
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({ source: 'web', url: 'https://example.com/article' });

    expect(response.status).toBe(503);
    expect(response.headers['content-type']).toMatch('application/json');
    expect(response.body).toEqual({ ok: false, reason: 'write-failed' });
    expect(response.text).not.toContain('SENSITIVE_DATABASE_DETAIL');
    expect(response.text).not.toContain('server\\app.ts');
    expect(errorLog).toHaveBeenCalledWith('캡처 요청 처리 중 예외 발생', {
      errorName: 'Error',
      method: 'POST',
      path: '/api/insights/capture',
    });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'SENSITIVE_DATABASE_DETAIL'
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('access-token');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('example.com');
  });

  it('keeps the safe response when structured logging fails', async () => {
    const captureService: ServerInsightCaptureService = {
      capture: vi.fn().mockRejectedValue(new Error('SERVICE_FAILURE_DETAIL')),
    };
    const logger = {
      error: vi.fn(() => {
        throw new Error('LOGGER_FAILURE_DETAIL');
      }),
    };

    const response = await request(createApp({ captureService, logger }))
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({ source: 'web', url: 'https://example.com/article' });

    expect(response.status).toBe(503);
    expect(response.headers['content-type']).toMatch('application/json');
    expect(response.body).toEqual({ ok: false, reason: 'write-failed' });
    expect(response.text).not.toContain('SERVICE_FAILURE_DETAIL');
    expect(response.text).not.toContain('LOGGER_FAILURE_DETAIL');
  });

  it('returns a safe JSON error for malformed JSON', async () => {
    const captureService = createCaptureService({
      ok: false,
      reason: 'write-failed',
    });

    const response = await request(createApp({ captureService }))
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .set('Content-Type', 'application/json')
      .send('{');

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch('application/json');
    expect(response.body).toEqual({ ok: false, reason: 'invalid-request' });
    expect(response.text).not.toContain('SyntaxError');
    expect(response.text).not.toContain('C:\\hub');
    expect(captureService.capture).not.toHaveBeenCalled();
  });

  it('returns a safe JSON error when the request body exceeds the limit', async () => {
    const captureService = createCaptureService({
      ok: false,
      reason: 'write-failed',
    });

    const response = await request(createApp({ captureService }))
      .post('/api/insights/capture')
      .set('Authorization', 'Bearer access-token')
      .send({ source: 'web', url: `https://example.com/${'x'.repeat(9000)}` });

    expect(response.status).toBe(400);
    expect(response.headers['content-type']).toMatch('application/json');
    expect(response.body).toEqual({ ok: false, reason: 'invalid-request' });
    expect(captureService.capture).not.toHaveBeenCalled();
  });

  it('does not replace the default response for an unknown route', async () => {
    const response = await request(createApp()).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch('text/html');
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
