import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { createApp } from './app';
import type { ImportCleanupService } from './app';
import type { ServerInsightCaptureService } from './insight_capture_service';
import type { ServerInsightMemoService } from './insight_memo_service';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('GET /api/health', () => {
  it('returns an ok response', async () => {
    const response = await request(createApp()).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

describe('GET /api/cron/import-cleanup', () => {
  it.each([
    ['비밀 값이 없는 요청', undefined],
    ['비밀 값이 틀린 요청', 'Bearer wrong-secret'],
  ])('%s을 거부한다', async (_label, authorization) => {
    const cleanupService = createCleanupService(3);
    const pendingRequest = request(
      createApp({ cleanupService, cronSecret: 'cron-secret' })
    ).get('/api/cron/import-cleanup');

    if (authorization) {
      pendingRequest.set('Authorization', authorization);
    }

    const response = await pendingRequest;

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ ok: false, reason: 'permission-denied' });
    expect(cleanupService.cleanup).not.toHaveBeenCalled();
  });

  it('올바른 비밀 값으로 만료 정리를 한 번 실행하고 개수만 반환한다', async () => {
    const cleanupService = createCleanupService(3);

    const response = await request(
      createApp({ cleanupService, cronSecret: 'cron-secret' })
    )
      .get('/api/cron/import-cleanup')
      .set('Authorization', 'Bearer cron-secret');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, deletedJobCount: 3 });
    expect(cleanupService.cleanup).toHaveBeenCalledTimes(1);
  });

  it('만료 정리 예외 세부와 비밀 값을 응답이나 로그에 노출하지 않는다', async () => {
    const cleanup = vi
      .fn()
      .mockRejectedValue(new Error('SENSITIVE_DATABASE_DETAIL'));
    const error = vi.fn();

    const response = await request(
      createApp({
        cleanupService: { cleanup },
        cronSecret: 'cron-secret',
        logger: { error },
      })
    )
      .get('/api/cron/import-cleanup')
      .set('Authorization', 'Bearer cron-secret');

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ ok: false, reason: 'write-failed' });
    expect(response.text).not.toContain('SENSITIVE_DATABASE_DETAIL');
    expect(JSON.stringify(error.mock.calls)).not.toContain(
      'SENSITIVE_DATABASE_DETAIL'
    );
    expect(JSON.stringify(error.mock.calls)).not.toContain('cron-secret');
  });
});

describe('Android WebView CORS', () => {
  it.each(['https://localhost', 'http://localhost'])(
    'allows the Android capture preflight request for %s',
    async (origin) => {
      const response = await request(createApp())
        .options('/api/insights/capture')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'authorization,content-type');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe(origin);
      expect(response.headers['access-control-allow-methods']).toBe(
        'GET, POST, PATCH, OPTIONS'
      );
      expect(response.headers['access-control-allow-headers']).toBe(
        'Authorization, Content-Type'
      );
      expect(response.headers.vary).toBe('Origin');
    }
  );

  it('does not allow an untrusted origin', async () => {
    const response = await request(createApp())
      .options('/api/insights/capture')
      .set('Origin', 'https://untrusted.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'authorization,content-type');

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.headers.vary).toBe('Origin');
  });
});

describe('POST /api/insights/capture', () => {
  it('passes the bearer token and capture contract to the server service', async () => {
    const captureService = createCaptureService({
      created: true,
      insight: {
        categoryId: null,
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
    expect(errorLog).toHaveBeenCalledWith('요청 처리 중 예외 발생', {
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

describe('PATCH /api/insights/:insightId/memo', () => {
  it('passes the bearer token, insight id, and memo to the service', async () => {
    const memoService = createMemoService({ ok: true });

    const response = await request(createApp({ memoService }))
      .patch(`/api/insights/${INSIGHT_ID}/memo`)
      .set('Authorization', 'Bearer access-token')
      .send({ memo: '회의 참고' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
    expect(memoService.update).toHaveBeenCalledWith(
      'access-token',
      INSIGHT_ID,
      { memo: '회의 참고' }
    );
  });

  it('rejects a request without a bearer token before calling the service', async () => {
    const memoService = createMemoService({ ok: true });

    const response = await request(createApp({ memoService }))
      .patch(`/api/insights/${INSIGHT_ID}/memo`)
      .send({ memo: '회의 참고' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ ok: false, reason: 'permission-denied' });
    expect(memoService.update).not.toHaveBeenCalled();
  });

  it.each([
    [{ ok: false, reason: 'invalid-request' } as const, 400],
    [{ ok: false, reason: 'permission-denied' } as const, 401],
    [{ ok: false, reason: 'not-found' } as const, 404],
    [{ ok: false, reason: 'write-failed' } as const, 503],
  ])('maps a memo failure to its HTTP status', async (result, status) => {
    const memoService = createMemoService(result);

    const response = await request(createApp({ memoService }))
      .patch(`/api/insights/${INSIGHT_ID}/memo`)
      .set('Authorization', 'Bearer access-token')
      .send({ memo: '회의 참고' });

    expect(response.status).toBe(status);
    expect(response.body).toEqual(result);
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

function createMemoService(
  result: Awaited<ReturnType<ServerInsightMemoService['update']>>
) {
  const update = vi.fn(async () => result);

  return {
    result,
    update,
  } satisfies ServerInsightMemoService & { result: typeof result };
}

function createCleanupService(
  deletedJobCount: number
): ImportCleanupService & { cleanup: ReturnType<typeof vi.fn> } {
  return {
    cleanup: vi.fn(async () => ({ deletedJobCount })),
  };
}
