import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import InvestmentStudyPage from './InvestmentStudyPage'

const renderInvestmentStudyPage = () =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <InvestmentStudyPage />
    </ThemeProvider>,
  )

describe('InvestmentStudyPage', () => {
  it('shows the first concept map term as the active term by default', () => {
    renderInvestmentStudyPage()

    expect(screen.getByText('투자 공부')).toBeInTheDocument()
    expect(screen.getByText('지금 배우는 용어')).toBeInTheDocument()
    expect(screen.getByText('돈의 가격을 의미하며, 주식 시장의 투자 심리에 큰 영향을 줍니다.')).toBeInTheDocument()
  })

  it('switches the detail card when a concept map chip is clicked', async () => {
    const user = userEvent.setup()
    renderInvestmentStudyPage()

    await user.click(screen.getByRole('button', { name: 'PER' }))

    expect(
      screen.getByText('주가를 주당순이익으로 나눈 값으로, 주가가 이익 대비 비싼지 싼지를 보여줍니다.'),
    ).toBeInTheDocument()
  })

  it('switches the detail card when a related-concept chip is clicked', async () => {
    const user = userEvent.setup()
    renderInvestmentStudyPage()

    await user.click(screen.getByRole('button', { name: '환율 →' }))

    expect(
      screen.getByText('한 나라의 통화가 다른 나라 통화에 비해 갖는 교환 비율입니다.'),
    ).toBeInTheDocument()
  })
})
