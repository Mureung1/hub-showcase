import { afterEach, describe, expect, it, vi } from 'vitest'

describe('production interaction entry', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('returns 202 when DATABASE_URL is absent', async () => {
    vi.stubEnv('DATABASE_URL', '')
    const { default: handleInteraction } = await import('../../interaction')
    const response = await handleInteraction.fetch(
      new Request('https://example.test/api/interaction', {
        body: JSON.stringify({
          eventName: 'result_shown',
          mode: 'reply',
          route: 'manual_ai',
          scenarioId: 'senior',
        }),
        headers: {
          'content-type': 'application/json',
          'x-vercel-forwarded-for': '192.0.2.10',
        },
        method: 'POST',
      }),
    )

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('')
  })
})
