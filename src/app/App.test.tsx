import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { App } from './App'

describe('App shell', () => {
  it('renders the empty application shell', () => {
    render(<App />)

    expect(screen.getByRole('main', { name: 'GAZUA app shell' })).toBeInTheDocument()
  })
})
