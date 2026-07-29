import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import LevelCard from './LevelCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getLevelProgress, MAX_TOTAL_XP } from '../lib/levelSystem.js'

// 리텐션 강화 v4 — LevelCard는 더 이상 자체 fetch를 하지 않고 UserContext가 중앙화한
// levelProgress를 그대로 받아 그린다(claimQuestsAndCelebrate가 어디서 XP를 지급하든 즉시 반영되도록).
vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

describe('LevelCard', () => {
  it('levelProgress가 아직 없으면 아무 것도 그리지 않는다', () => {
    useUser.mockReturnValue({ levelProgress: null })
    const { container } = render(<LevelCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('totalXp 0이면 Lv.1, 다음 레벨까지 10 XP', () => {
    useUser.mockReturnValue({ levelProgress: getLevelProgress(0) })
    render(<LevelCard />)
    expect(screen.getByText('Lv.1')).toBeInTheDocument()
    expect(screen.getByText('다음 레벨까지 10 XP')).toBeInTheDocument()
  })

  it('레벨 경계를 넘긴 값이면 올라간 레벨과 남은 XP를 보여준다', () => {
    useUser.mockReturnValue({ levelProgress: getLevelProgress(15) }) // 레벨2(10) + 5 진행 -> 다음(20)까지 15 남음
    render(<LevelCard />)
    expect(screen.getByText('Lv.2')).toBeInTheDocument()
    expect(screen.getByText('다음 레벨까지 15 XP')).toBeInTheDocument()
  })

  it('만렙이면 전용 문구를 보여준다', () => {
    useUser.mockReturnValue({ levelProgress: getLevelProgress(MAX_TOTAL_XP) })
    render(<LevelCard />)
    expect(screen.getByText('Lv.100')).toBeInTheDocument()
    expect(screen.getByText('만렙을 달성했어요!')).toBeInTheDocument()
  })

  it('id="my-level-pill"을 붙여 XP 애니메이션 목적지로 쓸 수 있게 한다', () => {
    useUser.mockReturnValue({ levelProgress: getLevelProgress(0) })
    const { container } = render(<LevelCard />)
    expect(container.querySelector('#my-level-pill')).not.toBeNull()
  })
})
