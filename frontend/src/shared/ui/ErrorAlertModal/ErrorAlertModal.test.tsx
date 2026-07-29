import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ErrorAlertModal from './ErrorAlertModal'

describe('ErrorAlertModal', () => {
  it('마스코트가 있는 차단형 오류 대화상자를 표시하고 재시도를 전달한다', async () => {
    const user = userEvent.setup()
    const onRetry = vi.fn()

    const { container } = render(<ErrorAlertModal onRetry={onRetry} />)

    const dialog = screen.getByRole('alertdialog', {
      name: '잠시 문제가 생겼어요',
      description: '콘텐츠를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(container.querySelector('img')).toHaveAttribute('alt', '')

    await user.click(screen.getByRole('button', { name: '다시 시도' }))

    expect(onRetry).toHaveBeenCalledOnce()
  })
})
