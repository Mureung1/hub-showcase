import { describe, it, expect, vi, afterEach } from 'vitest'
import { postJson, patchJson } from './api'

describe('postJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('정상: 성공 응답이면 {ok:true, data}를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, daysPerWeek: 3 }),
      }),
    )

    const result = await postJson('/api/onboarding', { daysPerWeek: 3 })

    expect(result).toEqual({ ok: true, data: { success: true, daysPerWeek: 3 } })
  })

  it('정상: POST 메서드와 JSON 헤더로, body를 문자열로 직렬화해서 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await postJson('/api/onboarding', { daysPerWeek: 3 })

    expect(fetchMock).toHaveBeenCalledWith('/api/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daysPerWeek: 3 }),
    })
  })

  it('빈 값: body 인자를 생략하면 빈 객체({})로 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    await postJson('/api/sessions/72/complete')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/72/complete',
      expect.objectContaining({ body: JSON.stringify({}) }),
    )
  })

  it('빈 값: 서버가 error 필드 없이 실패 응답을 줘도 크래시하지 않고 error는 undefined로 통과시킨다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({}),
      }),
    )

    const result = await postJson('/api/sessions/1/skip')

    expect(result).toEqual({ ok: false, error: undefined })
  })

  it('경계값: 성공 응답의 data가 빈 객체여도 {ok:true, data:{}}로 그대로 감싼다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      }),
    )

    const result = await postJson('/api/sessions/1/complete')

    expect(result).toEqual({ ok: true, data: {} })
  })

  it('실패: 서버가 4xx와 error 문구를 주면 {ok:false, error}를 반환한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: '이미 완료된 세션은 스킵할 수 없습니다.' }),
      }),
    )

    const result = await postJson('/api/sessions/1/skip')

    expect(result).toEqual({ ok: false, error: '이미 완료된 세션은 스킵할 수 없습니다.' })
  })

  it('실패: 네트워크 자체가 끊겨 fetch가 reject되면 통일된 에러 문구로 {ok:false, error}를 반환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))

    const result = await postJson('/api/onboarding', { daysPerWeek: 3 })

    expect(result).toEqual({ ok: false, error: '네트워크 오류가 발생했습니다.' })
  })

  it('실패: 서버 응답 본문이 JSON이 아니면(파싱 실패) 예외를 던지지 않고 {ok:false, error}로 통일한다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.reject(new SyntaxError('Unexpected token < in JSON')),
      }),
    )

    const result = await postJson('/api/onboarding', { daysPerWeek: 3 })

    expect(result).toEqual({ ok: false, error: '네트워크 오류가 발생했습니다.' })
  })
})

describe('patchJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('정상: postJson과 같은 로직을 공유하되, method만 PATCH로 보낸다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await patchJson('/api/routine/days/73', { targetArea: '상체' })

    expect(fetchMock).toHaveBeenCalledWith('/api/routine/days/73', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetArea: '상체' }),
    })
    expect(result).toEqual({ ok: true, data: { success: true } })
  })
})
