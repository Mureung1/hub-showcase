import { describe, expect, it, vi } from 'vitest'
import { createApiClient } from './client'

describe('api client', () => {
  it('reads the latest token for every request', async () => {
    const getToken = vi
      .fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2')
    const fetcher = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({ items: [], emptyStateMessage: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(getToken, fetcher)
    await api.getTodayArticles()
    await api.getTodayArticles()
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({ Authorization: 'Bearer token-1' })
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ Authorization: 'Bearer token-2' })
  })

  it('throws ApiClientError with the common error envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        code: 'VALIDATION_ERROR',
        message: '요청값을 확인해 주세요.',
        details: [{ field: 'interestIds', reason: 'too_short' }],
      }), {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const api = createApiClient(async () => 'token', fetcher)
    await expect(api.getTodayArticles()).rejects.toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: '요청값을 확인해 주세요.',
      details: [{ field: 'interestIds', reason: 'too_short' }],
    })
  })
})
