import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketCalendarPage from './MarketCalendarPage'

const renderMarketCalendarPage = () =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <MarketCalendarPage />
    </ThemeProvider>,
  )

describe('MarketCalendarPage', () => {
  it('renders the heading and every mock event', () => {
    renderMarketCalendarPage()

    expect(screen.getByText('증시 캘린더')).toBeInTheDocument()
    expect(screen.getByText('미국 CPI 발표')).toBeInTheDocument()
    expect(screen.getByText('원유 재고 발표')).toBeInTheDocument()
    expect(screen.getByText('FOMC 의사록 공개')).toBeInTheDocument()
    expect(screen.getByText('미국 소매판매')).toBeInTheDocument()
  })

  it('renders each event impact level', () => {
    renderMarketCalendarPage()

    expect(screen.getByText('높음')).toBeInTheDocument()
    expect(screen.getByText('낮음')).toBeInTheDocument()
    expect(screen.getAllByText('보통')).toHaveLength(2)
  })

  it('switches the active period chip on click', async () => {
    const user = userEvent.setup()
    renderMarketCalendarPage()

    const weekChip = screen.getByRole('button', { name: '이번 주' })
    const monthChip = screen.getByRole('button', { name: '이번 달' })
    expect(weekChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })

    await user.click(monthChip)

    expect(monthChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })
  })
})
