import { describe, expect, it } from 'vitest'
import { evaluatePreviewModule } from './previewRuntime'

const modules = {
  react: { createElement: () => null },
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: Symbol('Fragment') },
  'react/jsx-dev-runtime': { jsxDEV: () => null, Fragment: Symbol('Fragment') },
}

describe('previewRuntime', () => {
  it('returns the default exported component', () => {
    const component = evaluatePreviewModule(
      'module.exports.default = function Counter() { return null }',
      modules,
    )

    expect(component.name).toBe('Counter')
  })

  it('rejects modules outside the local React runtime', () => {
    expect(() =>
      evaluatePreviewModule('require("clsx"); module.exports.default = function App() {}', modules),
    ).toThrow('Preview에서 지원하지 않는 모듈입니다: clsx')
  })

  it('requires a default exported React component', () => {
    expect(() => evaluatePreviewModule('module.exports.answer = 42', modules)).toThrow(
      '기본 export React 컴포넌트를 찾지 못했습니다.',
    )
  })
})
