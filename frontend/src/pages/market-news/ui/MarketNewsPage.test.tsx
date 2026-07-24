import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketNewsPage from './MarketNewsPage'

const renderMarketNewsPage = () =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <MarketNewsPage />
    </ThemeProvider>,
  )

describe('MarketNewsPage', () => {
  it('renders the heading and every mock news item', () => {
    renderMarketNewsPage()

    expect(screen.getByText('시장 소식')).toBeInTheDocument()
    expect(screen.getByText('미국 CPI 발표 예정')).toBeInTheDocument()
    expect(screen.getByText('미 연준 FOMC 의사록 공개')).toBeInTheDocument()
    expect(screen.getByText('반도체 업황 회복 신호')).toBeInTheDocument()
    expect(screen.getByText('국제 유가 소폭 상승')).toBeInTheDocument()
  })

  it('renders each item impact level and easy interpretation note', () => {
    renderMarketNewsPage()

    expect(screen.getByText('영향도 높음')).toBeInTheDocument()
    expect(screen.getAllByText('영향도 보통')).toHaveLength(2)
    expect(screen.getByText('영향도 낮음')).toBeInTheDocument()
    expect(screen.getAllByText('쉬운 해석 ·')).toHaveLength(4)
  })
})
