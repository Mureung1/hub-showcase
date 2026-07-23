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

  it('fills the input when a quick question is selected', async () => {
    const user = userEvent.setup()
    renderHomePage()

    await user.click(screen.getByText('오늘 시장이 왜 움직였는지 볼까요?'))

    expect(screen.getByPlaceholderText('예: 삼성전자 지금 들어가도 돼?')).toHaveValue(
      '오늘 시장이 왜 움직였는지 볼까요?',
    )
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
