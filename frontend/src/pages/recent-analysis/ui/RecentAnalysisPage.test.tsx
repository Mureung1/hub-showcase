import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import RecentAnalysisPage from './RecentAnalysisPage'

const renderRecentAnalysisPage = () =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <RecentAnalysisPage />
    </ThemeProvider>,
  )

describe('RecentAnalysisPage', () => {
  it('renders the heading and every analysis by default', () => {
    renderRecentAnalysisPage()

    expect(screen.getByText('최근 분석')).toBeInTheDocument()
    expect(screen.getByText('엔비디아 지금 들어가도 돼?')).toBeInTheDocument()
    expect(screen.getByText('오늘 코스피 하락 이유')).toBeInTheDocument()
    expect(screen.getByText('삼성전자 진입 리스크 점검')).toBeInTheDocument()
    expect(screen.getByText('금리 인하 기대감이 뭔데?')).toBeInTheDocument()
    expect(screen.getByText('테슬라 하락 원인 분석')).toBeInTheDocument()
  })

  it('filters the list when a category chip is selected', async () => {
    const user = userEvent.setup()
    renderRecentAnalysisPage()

    await user.click(screen.getByRole('button', { name: '리스크 점검' }))

    expect(screen.getByText('삼성전자 진입 리스크 점검')).toBeInTheDocument()
    expect(screen.queryByText('엔비디아 지금 들어가도 돼?')).not.toBeInTheDocument()
  })

  it('restores every item when switching back to the all filter', async () => {
    const user = userEvent.setup()
    renderRecentAnalysisPage()

    await user.click(screen.getByRole('button', { name: '리스크 점검' }))
    await user.click(screen.getByRole('button', { name: '전체' }))

    expect(screen.getByText('엔비디아 지금 들어가도 돼?')).toBeInTheDocument()
    expect(screen.getByText('삼성전자 진입 리스크 점검')).toBeInTheDocument()
  })
})
