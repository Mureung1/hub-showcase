import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorState from './ErrorState'

describe('ErrorState', () => {
  it('오류 메시지를 알리고 재시도를 전달한다', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    render(<ErrorState message="글을 불러오지 못했어요." onRetry={onRetry} />)

    expect(screen.getByRole('alert')).toHaveTextContent('글을 불러오지 못했어요.')
    await user.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
