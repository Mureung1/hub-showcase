import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('메인 화면에 서비스명 제목이 렌더링된다', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: '답답' })).toBeInTheDocument()
  })
})
