import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  global.fetch = vi.fn();
});

// Regression: ISSUE-001 — Strict Mode sent the initial session request twice
// Found by /qa on 2026-07-27
// Report: .gstack/qa-reports/qa-report-localhost-2026-07-27.md
test('shares an in-flight session request between concurrent callers', async () => {
  fetch.mockResolvedValue(response({
    user: { id: 7, nickname: '다정' },
    csrfToken: 'csrf-token',
  }));

  const { getSession } = await import('./api');
  const [first, second] = await Promise.all([getSession(), getSession()]);

  expect(fetch).toHaveBeenCalledOnce();
  expect(first).toEqual({ id: 7, nickname: '다정' });
  expect(second).toEqual(first);
});

test('allows a new session request after the previous one fails', async () => {
  fetch
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce(response({
      user: { id: 8, nickname: '독자' },
      csrfToken: 'next-token',
    }));

  const { getSession } = await import('./api');

  await expect(getSession()).rejects.toThrow('서버에 연결하지 못했어요.');
  await expect(getSession()).resolves.toEqual({ id: 8, nickname: '독자' });
  expect(fetch).toHaveBeenCalledTimes(2);
});

function response(body) {
  return {
    ok: true,
    json: async () => body,
  };
}
