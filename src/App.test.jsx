import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App routing', () => {
  it('renders the landing page at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('갭 분석 시작하기')).toBeInTheDocument()
  })

  it('renders the filter page at /filter', () => {
    render(
      <MemoryRouter initialEntries={['/filter']}>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('1단계 · 조건 필터링')).toBeInTheDocument()
  })
})
