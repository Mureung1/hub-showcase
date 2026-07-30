import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.tsx'

describe('App', () => {
  it('renders the home page links', () => {
    render(<App />)
    expect(screen.getByRole('link', { name: '약속 만들기' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '기존 약속 참여하기' })).toBeInTheDocument()
  })
})
