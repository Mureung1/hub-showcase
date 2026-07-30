import { describe, expect, it } from 'vitest'
import { handleCodeRunApiRequest } from './codeRunRoutes.mjs'

describe('code run routes', () => {
  it('returns a TSX preview bundle with CSS', async () => {
    const result = await handleCodeRunApiRequest({
      method: 'POST',
      url: '/api/code/run',
      bodyText: JSON.stringify({
        code: 'export default function App(): JSX.Element { return <main>ICU</main> }',
        language: 'tsx',
        css: 'main { color: navy; }',
      }),
    })

    expect(result).toMatchObject({
      status: 200,
      body: {
        success: true,
        preview: {
          kind: 'react',
          css: 'main { color: navy; }',
          componentName: 'App',
        },
      },
    })
  })

  it('rejects code larger than the request limit', async () => {
    const result = await handleCodeRunApiRequest({
      method: 'POST',
      url: '/api/code/run',
      ip: '198.51.100.20',
      bodyText: JSON.stringify({ code: 'x'.repeat(20_001), language: 'javascript' }),
    })

    expect(result).toMatchObject({
      status: 413,
      body: { error: 'code_too_large' },
    })
  })

  it('rate limits the thirty-first request from the same IP', async () => {
    const requests = Array.from({ length: 31 }, () =>
      handleCodeRunApiRequest({
        method: 'POST',
        url: '/api/code/run',
        ip: '198.51.100.30',
        bodyText: JSON.stringify({ code: '1 + 1', language: 'javascript' }),
      }),
    )

    const results = await Promise.all(requests)

    expect(results.slice(0, 30).every((result) => result.status === 200)).toBe(true)
    expect(results[30]).toMatchObject({
      status: 429,
      body: { error: 'rate_limited' },
    })
  })

  it('returns a bad request for invalid JSON', async () => {
    await expect(
      handleCodeRunApiRequest({
        method: 'POST',
        url: '/api/code/run',
        bodyText: '{',
      }),
    ).resolves.toEqual({ status: 400, body: { error: 'Invalid JSON body' } })
  })
})
