import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

describe('ProgressBar', () => {
  it('clamps percent into 0-100 and renders an accessible label', () => {
    const markup = renderToStaticMarkup(<ProgressBar percent={140} label="React 진행률 60퍼센트" />)

    expect(markup).toContain('role="progressbar"')
    expect(markup).toContain('aria-valuenow="100"')
    expect(markup).toContain('React 진행률 60퍼센트')
  })

  it('clamps a negative percent to 0', () => {
    const markup = renderToStaticMarkup(<ProgressBar percent={-10} label="진행률 0퍼센트" />)

    expect(markup).toContain('aria-valuenow="0"')
  })
})
