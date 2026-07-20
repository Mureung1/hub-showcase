import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TagBadge from './TagBadge.jsx'

describe('TagBadge', () => {
  it('children을 그대로 보여준다', () => {
    render(<TagBadge>메이플스토리</TagBadge>)

    expect(screen.getByText('메이플스토리')).toBeInTheDocument()
  })

  it('tone에 따라 클래스가 붙는다', () => {
    render(<TagBadge tone="gold">베스트</TagBadge>)

    expect(screen.getByText('베스트')).toHaveClass('rs-tag-gold')
  })

  it('tone을 안 주면 default로 렌더된다', () => {
    render(<TagBadge>기본</TagBadge>)

    expect(screen.getByText('기본')).toHaveClass('rs-tag-default')
  })
})
