import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketNewsPage from './MarketNewsPage'

const marketNewsResponse = {
  data: [
    {
      id: 'global-news',
      title: 'US CPI release scheduled',
      summary: 'Inflation data may affect rate expectations.',
      originalUrl: 'https://example.com/cpi',
      source: 'example.com',
      category: 'GLOBAL',
      symbols: [],
      publishedAt: '2026-07-27T00:00:00.000Z',
      provider: 'NAVER',
    },
    {
      id: 'company-news',
      title: 'Samsung earnings preview',
      summary: 'Memory cycle recovery remains the key variable.',
      originalUrl: 'https://example.com/samsung',
      source: 'example.com',
      category: 'COMPANY',
      symbols: ['005930'],
      publishedAt: '2026-07-27T01:00:00.000Z',
      provider: 'NAVER',
    },
  ],
  meta: {
    provider: 'NAVER',
    updatedAt: '2026-07-27T01:00:00.000Z',
    cached: false,
    isDelayed: true,
  },
}

const renderMarketNewsPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={gazuaTheme}>
        <MarketNewsPage />
      </ThemeProvider>
    </QueryClientProvider>,
  )
}

describe('MarketNewsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders server-backed news items', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(marketNewsResponse)))

    renderMarketNewsPage()

    expect(screen.getByText('Market News')).toBeInTheDocument()
    expect(await screen.findByText('US CPI release scheduled')).toBeInTheDocument()
    expect(screen.getByText('Samsung earnings preview')).toBeInTheDocument()
  })

  it('renders provider metadata and mapped tags', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(marketNewsResponse)))

    renderMarketNewsPage()

    expect(await screen.findByText('GLOBAL')).toBeInTheDocument()
    expect(screen.getByText('005930')).toBeInTheDocument()
    expect(screen.getByText(/provider NAVER/)).toBeInTheDocument()
  })
})
