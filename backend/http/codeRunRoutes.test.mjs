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
