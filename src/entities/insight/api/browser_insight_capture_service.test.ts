import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createBrowserInsightCaptureService } from './browser_insight_capture_service';

describe('createBrowserInsightCaptureService', () => {
  it('uses the current session token to call the common capture endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        created: true,
        insight: createInsight(),
        ok: true,
      })
    );
    const service = createBrowserInsightCaptureService(
      createClient('access-token'),
      fetcher
    );

    await expect(
      service.capture({
        source: 'web',
        title: 'Example article',
        url: 'https://example.com/article',
      })
    ).resolves.toEqual({
      created: true,
      insight: createInsight(),
      ok: true,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/insights/capture', {
      body: JSON.stringify({
        source: 'web',
        title: 'Example article',
        url: 'https://example.com/article',
      }),
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it('does not send a capture request without an authenticated session', async () => {
    const fetcher = vi.fn();
    const service = createBrowserInsightCaptureService(
      createClient(null),
      fetcher
    );

    await expect(
      service.capture({ source: 'web', url: 'https://example.com/article' })
    ).resolves.toEqual({ ok: false, reason: 'permission-denied' });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('returns a validated server-side URL failure to the save flow', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({ ok: false, reason: 'invalid-url' }, { status: 400 })
      );
    const service = createBrowserInsightCaptureService(
      createClient('access-token'),
      fetcher
    );

    await expect(
      service.capture({ source: 'web', url: 'not a url' })
    ).resolves.toEqual({ ok: false, reason: 'invalid-url' });
  });

  it.each([
    { created: true, insight: createInsight(), ok: true },
    { ok: false, reason: 'invalid-url' },
  ])(
    'maps an unauthenticated HTTP response without trusting its body',
    async (payload) => {
      const fetcher = vi
        .fn()
        .mockResolvedValue(Response.json(payload, { status: 401 }));
      const service = createBrowserInsightCaptureService(
        createClient('expired-token'),
        fetcher
      );

      await expect(
        service.capture({ source: 'web', url: 'https://example.com/article' })
      ).resolves.toEqual({ ok: false, reason: 'permission-denied' });
    }
  );

  it('maps a network rejection to a retryable write failure', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('network detail'));
    const service = createBrowserInsightCaptureService(
      createClient('access-token'),
      fetcher
    );

    await expect(
      service.capture({ source: 'web', url: 'https://example.com/article' })
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
  });
});

function createClient(accessToken: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

function createInsight() {
  return {
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
  };
}
