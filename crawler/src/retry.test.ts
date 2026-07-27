import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NonRetryableError, withRetry } from './retry.js'

async function runWithFakeTimers<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {}) // 타이머 드레인 중 reject가 먼저 일어나도 unhandledRejection 경고 안 뜨게 함
  await vi.runAllTimersAsync()
  return promise
}

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('첫 시도가 성공하면 재시도 없이 바로 반환한다', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const result = await withRetry(fn)
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('실패하다가 재시도 중 성공하면 그 결과를 반환한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('일시적 실패 1'))
      .mockRejectedValueOnce(new Error('일시적 실패 2'))
      .mockResolvedValueOnce('ok')

    const result = await runWithFakeTimers(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 }))
    expect(result).toBe('ok')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('maxAttempts를 다 채우도록 실패하면 마지막 에러를 던진다', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('계속 실패'))

    await expect(runWithFakeTimers(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 }))).rejects.toThrow(
      '계속 실패',
    )
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('NonRetryableError는 재시도 없이 즉시 던진다', async () => {
    const fn = vi.fn().mockRejectedValue(new NonRetryableError('재시도해도 소용없음'))

    await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 10 })).rejects.toThrow('재시도해도 소용없음')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('재시도 간격은 지수 백오프로 증가한다', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValueOnce('ok')
    const setTimeoutSpy = vi.spyOn(global, 'setTimeout')

    await runWithFakeTimers(withRetry(fn, { maxAttempts: 3, baseDelayMs: 100 }))

    const delays = setTimeoutSpy.mock.calls.map((call) => call[1])
    expect(delays).toEqual([100, 200])
  })
})
