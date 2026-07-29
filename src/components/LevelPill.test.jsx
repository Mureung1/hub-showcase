import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LevelPill from './LevelPill.jsx'

describe('LevelPill', () => {
  it('totalXp에 맞는 레벨을 보여준다', () => {
    render(<LevelPill totalXp={0} />)
    expect(screen.getByText('Lv.1')).toBeInTheDocument()
  })

  it('레벨 경계를 넘긴 값도 정확히 반영한다', () => {
    render(<LevelPill totalXp={15} />)
    expect(screen.getByText('Lv.2')).toBeInTheDocument()
  })

  it('xpFlyAnimation이 목적지 좌표를 찾을 수 있도록 id="home-level-pill"을 갖는다', () => {
    const { container } = render(<LevelPill totalXp={0} />)
    expect(container.querySelector('#home-level-pill')).toBeInTheDocument()
  })
})
