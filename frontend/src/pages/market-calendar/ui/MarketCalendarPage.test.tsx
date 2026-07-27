import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketCalendarPage from './MarketCalendarPage'

const marketCalendarResponse = {
  data: [
    {
      id: 'fmp-cpi',
      type: 'ECONOMIC',
      title: 'US CPI',
      country: 'US',
      scheduledAt: '2026-07-27T12:30:00.000Z',
      importance: 'HIGH',
      provider: 'FMP',
    },
    {
      id: 'dart-disclosure',
      type: 'DISCLOSURE',
      title: 'Samsung disclosure',
      symbol: '005930',
      scheduledAt: '2026-07-27T01:00:00.000Z',
      provider: 'OPENDART',
    },
  ],
  meta: {
    providers: ['FMP', 'OPENDART'],
    updatedAt: '2026-07-27T01:00:00.000Z',
    cached: false,
    isDelayed: true,
  },
}

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
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders server-backed calendar events', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(marketCalendarResponse)))

    renderMarketCalendarPage()

    expect(screen.getByText('Market Calendar')).toBeInTheDocument()
    expect(await screen.findByText('US CPI')).toBeInTheDocument()
    expect(screen.getByText('Samsung disclosure')).toBeInTheDocument()
  })

  it('renders provider descriptions and metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(marketCalendarResponse)))

    renderMarketCalendarPage()

    expect(await screen.findByText('US · FMP')).toBeInTheDocument()
    expect(screen.getByText('005930 · OPENDART')).toBeInTheDocument()
    expect(screen.getByText(/providers FMP, OPENDART/)).toBeInTheDocument()
  })

  it('switches the active period chip on click', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(marketCalendarResponse)))

    renderMarketCalendarPage()

    const [weekChip, monthChip] = screen.getAllByRole('button')
    expect(weekChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })

    await user.click(monthChip)

    expect(monthChip).toHaveStyle({ color: gazuaTheme.colors.text.inverse })
  })
})
