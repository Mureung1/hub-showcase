import { describe, expect, it, vi } from 'vitest';

import { createExtensionApi } from './extension_api';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('createExtensionApi', () => {
  it('captures the current tab through the shared capture contract', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({
        created: true,
        insight: {
          id: INSIGHT_ID,
          title: 'Article',
        },
        ok: true,
      })
    );
    const api = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher,
    });

    await expect(
      api.capture('access-token', {
        source: 'chrome_extension',
        title: 'Article',
        url: 'https://example.com/article',
      })
    ).resolves.toEqual({
      created: true,
      insight: { id: INSIGHT_ID, title: 'Article' },
      ok: true,
    });
    expect(fetcher).toHaveBeenCalledWith(
      'https://amadda.example/api/insights/capture',
      {
        body: JSON.stringify({
          source: 'chrome_extension',
          title: 'Article',
          url: 'https://example.com/article',
        }),
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        method: 'POST',
      }
    );
  });

  it.each([
    ['permission-denied', 'permission-denied'],
    ['invalid-url', 'invalid-url'],
    ['unsupported-protocol', 'unsupported-protocol'],
  ] as const)('keeps the safe capture failure %s', async (reason, expected) => {
    const api = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher: vi.fn().mockResolvedValue(jsonResponse({ ok: false, reason })),
    });

    await expect(
      api.capture('access-token', {
        source: 'chrome_extension',
        url: 'https://example.com',
      })
    ).resolves.toEqual({ ok: false, reason: expected });
  });

  it('discards malformed and network capture failures', async () => {
    const malformed = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher: vi.fn().mockResolvedValue(jsonResponse({ ok: true })),
    });
    const rejected = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher: vi.fn().mockRejectedValue(new Error('sensitive detail')),
    });

    await expect(
      malformed.capture('token', {
        source: 'chrome_extension',
        url: 'https://example.com',
      })
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    await expect(
      rejected.capture('token', {
        source: 'chrome_extension',
        url: 'https://example.com',
      })
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
  });

  it('updates only the memo field through the memo endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    const api = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher,
    });

    await expect(
      api.saveMemo('access-token', INSIGHT_ID, '회의 참고')
    ).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith(
      `https://amadda.example/api/insights/${INSIGHT_ID}/memo`,
      {
        body: JSON.stringify({ memo: '회의 참고' }),
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      }
    );
  });

  it('returns a safe memo failure', async () => {
    const api = createExtensionApi({
      apiOrigin: 'https://amadda.example',
      fetcher: vi
        .fn()
        .mockResolvedValue(
          jsonResponse({ ok: false, reason: 'permission-denied' })
        ),
    });

    await expect(
      api.saveMemo('access-token', INSIGHT_ID, '회의 참고')
    ).resolves.toEqual({ ok: false, reason: 'permission-denied' });
  });
});

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  });
}
