import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WaterIntakeCard from './WaterIntakeCard.jsx'
import { useUser } from '../context/UserContext.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderCard() {
  return render(
    <MemoryRouter>
      <WaterIntakeCard />
    </MemoryRouter>,
  )
}

// MY 탭 개편 — 컴팩트 홈 위젯으로 축소되며 영양제 토글은 빠지고(→ /profile/water 전용 화면), 카드
// 영역을 누르면 그 화면으로 이동한다. 물 한 컵 버튼은 이동 없이 그 자리에서 그대로 기록된다.
describe('WaterIntakeCard', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    useUser.mockReturnValue({ effectiveUserId: 'guest', profile: null })
  })

  it('신체정보가 없으면 기본 목표(1600ml) 기준 0ml로 표시된다', () => {
    renderCard()
    expect(screen.getByText('0ml / 1600ml')).toBeInTheDocument()
  })

  it('물 한 컵 버튼을 누르면 200ml씩 누적되고 이동하지 않는다', () => {
    renderCard()
    const button = screen.getByRole('button', { name: /물 한 컵/ })
    fireEvent.click(button)
    expect(screen.getByText('200ml / 1600ml')).toBeInTheDocument()
    fireEvent.click(button)
    expect(screen.getByText('400ml / 1600ml')).toBeInTheDocument()
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('체중·활동량 프로필이 있으면 개인별 목표가 반영된다', () => {
    useUser.mockReturnValue({ effectiveUserId: 'guest', profile: { weightKg: 60, activity: 'low' } })
    renderCard()
    expect(screen.getByText('0ml / 1800ml')).toBeInTheDocument()
  })

  it('카드 영역을 누르면 물 기록 화면으로 이동한다', () => {
    renderCard()
    fireEvent.click(screen.getByRole('button', { name: '물 기록 화면으로 이동' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/water')
  })
})
