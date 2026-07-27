import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./env.js', () => ({ BIZINFO_API_KEY: 'test-key' }))

import { fetchAnnouncements } from './bizinfo-client.js'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response
}

async function runWithFakeTimers<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {}) // 타이머 드레인 중 reject가 먼저 일어나도 unhandledRejection 경고 안 뜨게 함
  await vi.runAllTimersAsync()
  return promise
}

describe('fetchAnnouncements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('정상 응답이면 jsonArray를 그대로 반환한다', async () => {
    const items = [{ pblancId: 'PBLN_1' }]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ jsonArray: items })))

    const result = await fetchAnnouncements({ pageIndex: 1, pageUnit: 10 })
    expect(result).toEqual(items)
  })

  it('네트워크 에러(fetch 자체가 throw)는 재시도 후 성공하면 결과를 반환한다', async () => {
    const items = [{ pblancId: 'PBLN_1' }]
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('connect timeout'))
      .mockResolvedValueOnce(jsonResponse({ jsonArray: items }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runWithFakeTimers(fetchAnnouncements({ pageIndex: 1, pageUnit: 10 }))
    expect(result).toEqual(items)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('5xx 응답은 재시도한다', async () => {
    const items = [{ pblancId: 'PBLN_1' }]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ jsonArray: items }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runWithFakeTimers(fetchAnnouncements({ pageIndex: 1, pageUnit: 10 }))
    expect(result).toEqual(items)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('4xx 응답은 재시도 없이 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAnnouncements({ pageIndex: 1, pageUnit: 10 })).rejects.toThrow('404')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('HTTP 200이어도 바디에 reqErr가 있으면(잘못된 인증키 등) 재시도 없이 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ reqErr: '존재하지 않는 인증키 입니다.' }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchAnnouncements({ pageIndex: 1, pageUnit: 10 })).rejects.toThrow(
      '존재하지 않는 인증키 입니다.',
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('재시도를 다 소진하면 마지막 에러로 실패한다', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('계속되는 타임아웃'))
    vi.stubGlobal('fetch', fetchMock)

    await expect(runWithFakeTimers(fetchAnnouncements({ pageIndex: 1, pageUnit: 10 }))).rejects.toThrow(
      '계속되는 타임아웃',
    )
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
