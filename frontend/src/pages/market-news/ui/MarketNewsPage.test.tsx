import { ThemeProvider } from '@emotion/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import MarketNewsPage from './MarketNewsPage'

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
  it('renders news items', async () => {
    renderMarketNewsPage()

    expect(screen.getByText('Market News')).toBeInTheDocument()
    expect(await screen.findByText('미국 금리 인하 기대가 다시 커졌어요')).toBeInTheDocument()
    expect(screen.getByText('삼성전자, 메모리 업황 회복 기대감 부각')).toBeInTheDocument()
  })

  it('renders provider metadata and mapped tags', async () => {
    renderMarketNewsPage()

    expect((await screen.findAllByText('MACRO')).length).toBeGreaterThan(1)
    expect(screen.getAllByText('005930').length).toBeGreaterThan(1)
    expect(screen.getByText(/provider NAVER/)).toBeInTheDocument()
  })

  it('opens a detail modal when a news item is clicked', async () => {
    const user = userEvent.setup()
    renderMarketNewsPage()

    await user.click(
      await screen.findByRole('button', { name: /삼성전자, 메모리 업황 회복 기대감 부각/ }),
    )

    const dialog = screen.getByRole('dialog', { name: '시장 소식 상세' })
    expect(screen.getByText('선택한 시장 소식')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('삼성전자, 메모리 업황 회복 기대감 부각')
    expect(screen.getAllByText(/AI 서버 수요와 재고 정상화 기대/)).toHaveLength(2)
    expect(screen.getByRole('link', { name: '원문 링크 열기' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '모달 닫기' }))

    expect(screen.queryByRole('dialog', { name: '시장 소식 상세' })).not.toBeInTheDocument()
  })
})
