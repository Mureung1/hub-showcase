import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchKstartupAnnouncements } from './kstartup-client.js'

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response
}

async function runWithFakeTimers<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {})
  await vi.runAllTimersAsync()
  return promise
}

describe('fetchKstartupAnnouncements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('진행중(rcrt_prgs_yn=Y) 공고만 클라이언트 사이드로 필터링해 반환한다 (서버가 쿼리 파라미터를 무시하는 실측 사례 대응)', async () => {
    const items = [
      { pbanc_sn: 1, rcrt_prgs_yn: 'Y' },
      { pbanc_sn: 2, rcrt_prgs_yn: 'N' },
      { pbanc_sn: 3, rcrt_prgs_yn: 'Y' },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ data: items, currentCount: 3, matchCount: 3, page: 1, perPage: 100 })),
    )

    const result = await fetchKstartupAnnouncements({ page: 1, perPage: 100 })
    expect(result).toEqual([
      { pbanc_sn: 1, rcrt_prgs_yn: 'Y' },
      { pbanc_sn: 3, rcrt_prgs_yn: 'Y' },
    ])
  })

  it('5xx 응답은 재시도한다', async () => {
    const items = [{ pbanc_sn: 1, rcrt_prgs_yn: 'Y' }]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ data: items, currentCount: 1, matchCount: 1, page: 1, perPage: 100 }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await runWithFakeTimers(fetchKstartupAnnouncements({ page: 1, perPage: 100 }))
    expect(result).toEqual(items)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('4xx 응답은 재시도 없이 즉시 실패한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchKstartupAnnouncements({ page: 1, perPage: 100 })).rejects.toThrow('404')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
