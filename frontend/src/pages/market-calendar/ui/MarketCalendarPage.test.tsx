import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketCalendarPage from './MarketCalendarPage'

const renderMarketCalendarPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={gazuaTheme}>
        <MarketCalendarPage />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('MarketCalendarPage', () => {
  it('renders calendar events', async () => {
    renderMarketCalendarPage()

    expect(screen.getByText('Market Calendar')).toBeInTheDocument()
    expect(await screen.findByText('미국 CPI 발표')).toBeInTheDocument()
    expect(screen.getByText('삼성전자 잠정실적 공시')).toBeInTheDocument()
  })

  it('renders provider descriptions and metadata', async () => {
    renderMarketCalendarPage()

    expect((await screen.findAllByText('US · FMP')).length).toBeGreaterThan(2)
    expect(screen.getByText('005930 · OPENDART')).toBeInTheDocument()
    expect(screen.getByText(/providers FMP, OPENDART, TOSS_SECURITIES/)).toBeInTheDocument()
  })

  it('switches the active period chip on click', async () => {
    const user = userEvent.setup()

    renderMarketCalendarPage()

    const [weekChip, monthChip] = screen.getAllByRole('button')
    expect(weekChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })

    await user.click(monthChip)

    expect(monthChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })
  })

  it('opens a detail modal when a calendar event is clicked', async () => {
    const user = userEvent.setup()
    renderMarketCalendarPage()

    await user.click(await screen.findByRole('button', { name: /삼성전자 잠정실적 공시/ }))

    const dialog = screen.getByRole('dialog', { name: '증시 일정 상세' })
    expect(screen.getByText('선택한 증시 일정')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('삼성전자 잠정실적 공시')
    expect(screen.getByText(/관련 공시 이벤트입니다/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '모달 닫기' }))

    expect(screen.queryByRole('dialog', { name: '증시 일정 상세' })).not.toBeInTheDocument()
  })
})
