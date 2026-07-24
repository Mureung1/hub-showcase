import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import BottomTabBar from './BottomTabBar'

describe('BottomTabBar', () => {
  it('활성 탭을 표시하고 다른 탭 선택을 전달한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<BottomTabBar activeTab="today" onChange={onChange} />)

    expect(screen.getByRole('button', { name: '오늘의 깸' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await user.click(screen.getByRole('button', { name: '나의 깸' }))
    expect(onChange).toHaveBeenCalledWith('myGgaem')
  })
})
