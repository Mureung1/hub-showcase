import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { runJavaScriptCode } from './codeRunner.mjs'

describe('JavaScript runner limits', () => {
  it('caps log count and truncates oversized entries', async () => {
    const result = await runJavaScriptCode(`
      for (let index = 0; index < 250; index += 1) console.log('line-' + index)
      console.log('x'.repeat(2_100))
    `)

    expect(result.success).toBe(true)
    expect(result.logs).toHaveLength(200)

    const longEntryResult = await runJavaScriptCode(`console.log('x'.repeat(2_100))`)
    expect(longEntryResult.logs[0]).toHaveLength(2_014)
    expect(longEntryResult.logs[0].endsWith('...(truncated)')).toBe(true)
  })

  it('clears intervals created by learner code after execution', async () => {
    const result = await runJavaScriptCode(`setInterval(() => console.log('late'), 0)`)

    await delay(20)

    expect(result.success).toBe(true)
    expect(result.logs).toEqual([])
  })
})

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
