import { beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  global.fetch = vi.fn();
});

test('uses the login session and csrf token without sending a client user id', async () => {
  fetch
    .mockResolvedValueOnce(response({
      user: { id: 7, nickname: '다정' },
      csrfToken: 'csrf-token',
    }))
    .mockResolvedValueOnce(response({ id: 10, title: '책' }));

  const { createBook, loginWithGoogle } = await import('./api');
  await loginWithGoogle('google-id-token');
  await createBook({ providerId: 'volume-1', title: '내 책 이름', initialPage: 1 });

  const [, options] = fetch.mock.calls[1];
  expect(options.credentials).toBe('include');
  expect(options.headers['X-CSRF-Token']).toBe('csrf-token');
  expect(JSON.parse(options.body)).toEqual({ providerId: 'volume-1', title: '내 책 이름', initialPage: 1 });
});

test('requests reading activity for the selected date range', async () => {
  fetch.mockResolvedValueOnce(response({ from: '2026-05-11', to: '2026-08-02', days: [] }));

  const { getReadingActivity } = await import('./api');
  await getReadingActivity({ from: '2026-05-11', to: '2026-08-02' });

  expect(fetch.mock.calls[0][0]).toBe(
    'http://localhost:8080/api/reading-activity?from=2026-05-11&to=2026-08-02',
  );
});

test('uses the same-origin API proxy in production', async () => {
  vi.stubEnv('PROD', true);
  fetch.mockResolvedValueOnce(response({ reading: [], completed: [], archived: [] }));

  const { getBooks } = await import('./api');
  await getBooks();

  expect(fetch.mock.calls[0][0]).toBe('/api/bookshelf');
});

function response(body) {
  return {
    ok: true,
    json: async () => body,
  };
}
