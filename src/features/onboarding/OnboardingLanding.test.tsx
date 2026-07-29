import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { OnboardingLanding } from './OnboardingLanding'

describe('OnboardingLanding', () => {
  it('renders the enlarged ICU brand treatment', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <OnboardingLanding />
      </MemoryRouter>,
    )

    expect(markup).toContain('aria-label="ICU I CODE U"')
    expect(markup).toContain('data-size="large"')
  })
})
