import { ThemeProvider } from '@emotion/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { gazuaTheme } from '@/app/styles/theme'

import HomePage from './HomePage'

const renderHomePage = () =>
  render(
    <ThemeProvider theme={gazuaTheme}>
      <HomePage />
    </ThemeProvider>,
  )

describe('HomePage', () => {
  it('renders the AI query heading', () => {
    renderHomePage()

    expect(screen.getByText('궁금한 종목이나 오늘 시장 흐름을 물어보세요.')).toBeInTheDocument()
  })

  it('shows a chat-like answer when a quick question is selected', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await user.click(screen.getByText('오늘 시장이 왜 움직였는지 볼까요?'))

    expect(screen.getAllByText('오늘 시장이 왜 움직였는지 볼까요?')).toHaveLength(2)
    expect(screen.getByRole('status', { name: 'AI response loading' })).toBeInTheDocument()
    expect(await screen.findByText(/오늘 시황은 금리 인하 기대/)).toBeInTheDocument()
  })

  it('disables the submit button until the user types a question', async () => {
    const user = userEvent.setup()
    renderHomePage()

    const submitButton = screen.getByRole('button', { name: '분석하기' })
    expect(submitButton).toBeDisabled()

    await user.type(screen.getByPlaceholderText('예: 삼성전자 지금 들어가도 돼?'), '삼성전자 어때?')

    expect(submitButton).toBeEnabled()
  })
})
