import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ScreenHeader from './ScreenHeader'

describe('ScreenHeader', () => {
  it('제목을 표시하고 뒤로가기를 전달한다', async () => {
    const user = userEvent.setup()
    const onBack = vi.fn()

    render(<ScreenHeader title="오늘의 글" onBack={onBack} />)

    expect(screen.getByText('오늘의 글')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(onBack).toHaveBeenCalledOnce()
  })
})
