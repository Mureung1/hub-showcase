import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TrackIcon } from './TrackIcon'

describe('TrackIcon', () => {
  it('renders a hidden default icon for a newly added track', () => {
    const markup = renderToStaticMarkup(<TrackIcon trackId="future-track" />)

    expect(markup).toContain('data-track-icon="default"')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('<svg')
  })
})
