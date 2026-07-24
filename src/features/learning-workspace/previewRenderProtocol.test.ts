import { describe, expect, it } from 'vitest'
import { isPreviewRenderMessage } from './previewProtocol'

describe('preview render message validation', () => {
  it('accepts only complete React preview bundles', () => {
    expect(
      isPreviewRenderMessage({
        type: 'icu:preview-render',
        requestId: 'run-1',
        bundle: {
          kind: 'react',
          code: 'module.exports.default = App',
          css: '',
          componentName: 'App',
        },
      }),
    ).toBe(true)

    expect(
      isPreviewRenderMessage({
        type: 'icu:preview-render',
        requestId: 'run-1',
        bundle: { kind: 'react' },
      }),
    ).toBe(false)
  })
})
