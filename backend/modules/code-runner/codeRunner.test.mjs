import { describe, expect, it } from 'vitest'
import { runJavaScriptCode } from './codeRunner.mjs'

describe('React preview compiler', () => {
  it('transforms a JSX default export into a CommonJS preview bundle', async () => {
    const result = await runJavaScriptCode(
      `
        import React, { useState } from 'react'
        import './styles.css'

        export default function Counter() {
          const [count] = useState(0)
          return <button>{count}</button>
        }
      `,
      { previewOnly: true, language: 'jsx', css: 'button { color: blue; }' },
    )

    expect(result.success).toBe(true)
    expect(result.preview).toMatchObject({
      kind: 'react',
      css: 'button { color: blue; }',
      componentName: 'Counter',
    })
    expect(result.preview.code).toContain('module.exports')
    expect(result.preview.code).not.toContain('styles.css')
  })

  it('transforms TSX syntax with the TSX loader', async () => {
    const result = await runJavaScriptCode(
      `
        type CounterProps = { initial: number }
        export default function Counter({ initial }: CounterProps) {
          return <strong>{initial}</strong>
        }
      `,
      { previewOnly: true, language: 'tsx' },
    )

    expect(result.success).toBe(true)
    expect(result.preview.componentName).toBe('Counter')
  })

  it('returns a learner-facing error for unsupported imports', async () => {
    const result = await runJavaScriptCode(
      `
        import clsx from 'clsx'
        export default function App() {
          return <div className={clsx('app')}>ICU</div>
        }
      `,
      { previewOnly: true, language: 'jsx' },
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('지원하지 않는 import')
  })
})
