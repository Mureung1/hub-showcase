import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import LearningWorkspace from './LearningWorkspace'

describe('LearningWorkspace layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('groups the summary and persistence status in one fixed header grid item', () => {
    vi.stubEnv('VITE_ICU_API_MODE', 'mock')

    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/workspace']}>
        <LearningWorkspace />
      </MemoryRouter>,
    )

    expect(markup).toContain('data-workspace-region="header"')
  })
})
