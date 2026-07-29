import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isBarcodeDetectorSupported, scanBarcodeFromVideo } from './barcodeScanner.js'

describe('isBarcodeDetectorSupported', () => {
  afterEach(() => {
    delete window.BarcodeDetector
  })

  it('window.BarcodeDetector가 없으면 false다(jsdom 기본 상태)', () => {
    expect(isBarcodeDetectorSupported()).toBe(false)
  })

  it('window.BarcodeDetector가 있으면 true다', () => {
    window.BarcodeDetector = class {}
    expect(isBarcodeDetectorSupported()).toBe(true)
  })
})

describe('scanBarcodeFromVideo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.BarcodeDetector
  })

  it('미지원 환경에서는 즉시 null로 resolve하고 아무것도 폴링하지 않는다', async () => {
    const result = scanBarcodeFromVideo({}, {})
    await expect(result.promise).resolves.toBeNull()
  })

  it('바코드를 찾으면 rawValue로 resolve한다', async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: '8801234567890' }])
    window.BarcodeDetector = class {}
    const { promise } = scanBarcodeFromVideo(
      {},
      { detectorFactory: () => ({ detect }), intervalMs: 100 },
    )
    await vi.advanceTimersByTimeAsync(0)
    await expect(promise).resolves.toBe('8801234567890')
  })

  it('처음엔 못 찾다가 다음 틱에서 찾으면 그때 resolve한다', async () => {
    const detect = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ rawValue: '111' }])
    window.BarcodeDetector = class {}
    const { promise } = scanBarcodeFromVideo(
      {},
      { detectorFactory: () => ({ detect }), intervalMs: 100 },
    )
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    await expect(promise).resolves.toBe('111')
    expect(detect).toHaveBeenCalledTimes(2)
  })

  it('stop()을 호출하면 promise가 null로 정리되고 더 이상 폴링하지 않는다', async () => {
    const detect = vi.fn().mockResolvedValue([])
    window.BarcodeDetector = class {}
    const { promise, stop } = scanBarcodeFromVideo(
      {},
      { detectorFactory: () => ({ detect }), intervalMs: 100 },
    )
    await vi.advanceTimersByTimeAsync(0)
    stop()
    await expect(promise).resolves.toBeNull()
    const callsAtStop = detect.mock.calls.length
    await vi.advanceTimersByTimeAsync(1000)
    expect(detect).toHaveBeenCalledTimes(callsAtStop)
  })

  it('detect()가 예외를 던져도 폴링을 멈추지 않고 다음 틱에서 계속 시도한다', async () => {
    const detect = vi
      .fn()
      .mockRejectedValueOnce(new Error('아직 프레임 준비 안 됨'))
      .mockResolvedValueOnce([{ rawValue: '222' }])
    window.BarcodeDetector = class {}
    const { promise } = scanBarcodeFromVideo(
      {},
      { detectorFactory: () => ({ detect }), intervalMs: 100 },
    )
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    await expect(promise).resolves.toBe('222')
  })
})
