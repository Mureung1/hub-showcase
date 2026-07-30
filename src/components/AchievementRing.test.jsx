import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import AchievementRing from './AchievementRing.jsx'

describe('AchievementRing', () => {
  it('percent 기본 렌더링으로 텍스트를 보여준다', () => {
    render(<AchievementRing percent={72} />)
    expect(screen.getByText('72%')).toBeInTheDocument()
  })

  it('children이 있으면 percent 텍스트 대신 children을 렌더한다', () => {
    render(
      <AchievementRing percent={50}>
        <span>Lv.5</span>
      </AchievementRing>,
    )
    expect(screen.getByText('Lv.5')).toBeInTheDocument()
    expect(screen.queryByText('50%')).not.toBeInTheDocument()
  })

  it('0~100 범위를 벗어난 percent도 예외 없이 렌더한다', () => {
    const { rerender } = render(<AchievementRing percent={-20} />)
    expect(screen.getByText('-20%')).toBeInTheDocument()
    rerender(<AchievementRing percent={150} />)
    expect(screen.getByText('150%')).toBeInTheDocument()
  })
})
