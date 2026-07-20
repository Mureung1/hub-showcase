import { afterEach, describe, expect, it, vi } from 'vitest'
import { reportInteraction } from './reporter'

describe('reportInteraction', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('strict event만 JSON으로 보내고 식별자를 추가하지 않는다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }))
    vi.stubGlobal('fetch', fetchMock)

    reportInteraction({
      eventName: 'copy_succeeded',
      mode: 'reply',
      route: 'guided_ai',
      scenarioId: 'groupwork',
      situationId: 'schedule',
      toneLevel: 1,
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/interaction', {
      body: JSON.stringify({
        eventName: 'copy_succeeded',
        mode: 'reply',
        route: 'guided_ai',
        scenarioId: 'groupwork',
        situationId: 'schedule',
        toneLevel: 1,
      }),
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      method: 'POST',
    })
  })

  it('비동기 전송 실패를 사용자 흐름으로 전파하지 않는다', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    expect(() =>
      reportInteraction({
        eventName: 'situation_change',
        mode: 'initiate',
        route: 'manual_ai',
        scenarioId: 'senior',
      }),
    ).not.toThrow()
  })

  it('동기 전송 실패도 사용자 흐름으로 전파하지 않는다', () => {
    vi.stubGlobal('fetch', vi.fn(() => {
      throw new Error('invalid runtime')
    }))
    expect(() =>
      reportInteraction({
        eventName: 'result_shown',
        mode: 'reply',
        route: 'manual_ai',
        scenarioId: 'friend',
      }),
    ).not.toThrow()
  })
})
