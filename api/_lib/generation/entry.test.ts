import { describe, expect, it } from 'vitest'
import handleGenerate from '../../generate'

describe('production generate entry', () => {
  it('fails explicitly while the live provider is unconfigured', async () => {
    const request = new Request('https://example.test/api/generate', {
      body: JSON.stringify({
        purpose: 'ask',
        scenarioId: 'professor',
        situation: '면담 시간을 여쭤보고 싶어요',
      }),
      headers: {
        'content-type': 'application/json',
        'x-vercel-forwarded-for': '192.0.2.10',
      },
      method: 'POST',
    })

    const response = await handleGenerate.fetch(request)

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'generation_failed' })
  })
})
