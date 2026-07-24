import { describe, expect, it } from 'vitest'
import {
  createPreviewRenderMessage,
  isPreviewResponseMessage,
  isTrustedPreviewEvent,
} from './previewProtocol'

const bundle = {
  kind: 'react' as const,
  code: 'module.exports.default = App',
  css: '',
  componentName: 'App',
}

describe('previewProtocol', () => {
  it('creates a render message with a request id', () => {
    expect(createPreviewRenderMessage('run-1', bundle)).toEqual({
      type: 'icu:preview-render',
      requestId: 'run-1',
      bundle,
    })
  })

  it('accepts only known preview response shapes', () => {
    expect(isPreviewResponseMessage({ type: 'icu:preview-ready' })).toBe(true)
    expect(isPreviewResponseMessage({ type: 'icu:preview-rendered', requestId: 'run-1' })).toBe(
      true,
    )
    expect(
      isPreviewResponseMessage({
        type: 'icu:preview-error',
        requestId: 'run-1',
        error: '렌더링 실패',
      }),
    ).toBe(true)
    expect(isPreviewResponseMessage({ type: 'icu:preview-rendered' })).toBe(false)
    expect(isPreviewResponseMessage({ type: 'unknown' })).toBe(false)
  })

  it('checks both event origin and source window', () => {
    const source = {} as Window
    const event = {
      origin: 'http://127.0.0.1:5174',
      source,
      data: { type: 'icu:preview-ready' },
    } as unknown as MessageEvent

    expect(isTrustedPreviewEvent(event, source, 'http://127.0.0.1:5174')).toBe(true)
    expect(isTrustedPreviewEvent(event, {} as Window, 'http://127.0.0.1:5174')).toBe(false)
    expect(isTrustedPreviewEvent(event, source, 'http://127.0.0.1:9999')).toBe(false)
  })
})
