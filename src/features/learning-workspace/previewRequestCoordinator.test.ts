import { afterEach, describe, expect, it, vi } from 'vitest'
import { PreviewTimeoutError, createPreviewRequestCoordinator } from './previewRequestCoordinator'

const bundle = {
  kind: 'react' as const,
  code: 'module.exports.default = App',
  css: '',
  componentName: 'App',
}

afterEach(() => {
  vi.useRealTimers()
})

describe('previewRequestCoordinator', () => {
  it('waits for the iframe ready message before posting a render request', async () => {
    const post = vi.fn()
    const coordinator = createPreviewRequestCoordinator({ post })

    const result = coordinator.start('run-1', bundle)
    expect(post).not.toHaveBeenCalled()

    coordinator.markReady()
    expect(post).toHaveBeenCalledWith({
      type: 'icu:preview-render',
      requestId: 'run-1',
      bundle,
    })

    coordinator.handle({ type: 'icu:preview-rendered', requestId: 'run-1' })
    await expect(result).resolves.toBeUndefined()
  })

  it('rejects a render request after five seconds without a response', async () => {
    vi.useFakeTimers()
    const coordinator = createPreviewRequestCoordinator({ post: vi.fn(), timeoutMs: 5000 })
    coordinator.markReady()

    const result = coordinator.start('run-timeout', bundle)
    const rejection = expect(result).rejects.toBeInstanceOf(PreviewTimeoutError)
    await vi.advanceTimersByTimeAsync(5000)
    await rejection
  })

  it('ignores stale responses from an earlier request', async () => {
    const coordinator = createPreviewRequestCoordinator({ post: vi.fn() })
    coordinator.markReady()

    const result = coordinator.start('run-2', bundle)
    coordinator.handle({ type: 'icu:preview-rendered', requestId: 'run-1' })

    let settled = false
    void result.finally(() => {
      settled = true
    })
    await Promise.resolve()
    expect(settled).toBe(false)

    coordinator.handle({ type: 'icu:preview-rendered', requestId: 'run-2' })
    await expect(result).resolves.toBeUndefined()
  })
})
