import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import WaterIntakeCard from './WaterIntakeCard.jsx'
import { useUser } from '../context/UserContext.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

describe('WaterIntakeCard', () => {
  beforeEach(() => {
    localStorage.clear()
    useUser.mockReturnValue({ effectiveUserId: 'guest', profile: null })
  })

  it('신체정보가 없으면 기본 목표(1600ml) 기준 0ml로 표시된다', () => {
    render(<WaterIntakeCard />)
    expect(screen.getByText('0ml / 1600ml 마셨어요.')).toBeInTheDocument()
  })

  it('물 한 컵 버튼을 누르면 200ml씩 누적된다', () => {
    render(<WaterIntakeCard />)
    const button = screen.getByRole('button', { name: /물 한 컵/ })
    fireEvent.click(button)
    expect(screen.getByText('200ml / 1600ml 마셨어요.')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByText('400ml / 1600ml 마셨어요.')).toBeInTheDocument()
  })

  it('체중·활동량 프로필이 있으면 개인별 목표가 반영된다', () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest', profile: { weightKg: 60, activity: 'low' } })
    render(<WaterIntakeCard />)
    expect(screen.getByText('0ml / 1800ml 마셨어요.')).toBeInTheDocument()
  })

  it('영양제 버튼을 누르면 체크 표시로 바뀐다', () => {
    render(<WaterIntakeCard />)
    const button = screen.getByRole('button', { name: /영양제 챙겨 먹었어요/ })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: '영양제 챙겨 먹었어요 ✓' })).toBeInTheDocument()
  })
})
