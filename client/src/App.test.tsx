import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('renders the project intro heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'hub' })).toBeInTheDocument()
  })
})
