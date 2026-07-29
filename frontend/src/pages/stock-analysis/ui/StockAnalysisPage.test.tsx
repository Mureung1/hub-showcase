import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import StockAnalysisPage from './StockAnalysisPage'

const renderStockAnalysisPage = (code = 'NVDA') =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <MemoryRouter initialEntries={[`/stocks/${code}`]}>
        <Routes>
          <Route path="/stocks/:code" element={<StockAnalysisPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>,
  )

describe('StockAnalysisPage', () => {
  it('renders the stock header info', () => {
    renderStockAnalysisPage()

    expect(screen.getByText('NVIDIA · NVDA')).toBeInTheDocument()
    expect(screen.getByText('$182.40')).toBeInTheDocument()
  })

  it('renders the current judgment section with factor badges', () => {
    renderStockAnalysisPage()

    expect(screen.getByText('현재 판단')).toBeInTheDocument()
    expect(screen.getByText('긍정 요인 4개')).toBeInTheDocument()
    expect(screen.getByText('위험 요인 3개')).toBeInTheDocument()
  })

  it('renders all three price scenarios', () => {
    renderStockAnalysisPage()

    expect(screen.getByText('상승')).toBeInTheDocument()
    expect(screen.getByText('중립')).toBeInTheDocument()
    expect(screen.getByText('하락')).toBeInTheDocument()
  })

  it('renders the follow-up question button', () => {
    renderStockAnalysisPage()

    expect(screen.getByRole('button', { name: '이 분석에 추가 질문하기' })).toBeInTheDocument()
  })

  it('renders stock-specific analysis from the route code', () => {
    renderStockAnalysisPage('005930')

    expect(screen.getByText('삼성전자 · 005930')).toBeInTheDocument()
    expect(screen.getByText('78,200원')).toBeInTheDocument()
    expect(screen.getByText(/메모리 업황 회복 기대/)).toBeInTheDocument()
  })
})
