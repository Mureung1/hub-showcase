import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyRecommendedPage from './MyRecommendedPage.jsx'
import { useUser } from '../context/UserContext.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

function renderPage() {
  return render(
    <MemoryRouter>
      <MyRecommendedPage />
    </MemoryRouter>,
  )
}

describe('MyRecommendedPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    useUser.mockReturnValue({
      profile: { age: 25, sex: 'male', heightCm: 175, weightKg: 70, activity: 'moderate' },
      todayMealsTotal: { calories: 1104, protein: 49, carbs: 205, fat: 26, fiber: 11, sodium: 1780 },
      effectiveRecommended: RECOMMENDED,
      effectiveUserId: 'u1',
    })
  })

  it('오늘 섭취/권장 칼로리와 남은 칼로리를 보여준다', () => {
    renderPage()
    expect(screen.getByText('1104 / 2000 kcal')).toBeInTheDocument()
    expect(screen.getByText('896kcal 남았어요')).toBeInTheDocument()
  })

  it('단백질·탄수화물·지방·식이섬유·나트륨·물 진행률을 보여준다', () => {
    renderPage()
    // "단백질" 등 라벨은 하단 "표준 비교" 섹션에도 나오므로 getAllByText로 확인한다.
    expect(screen.getAllByText('단백질').length).toBeGreaterThan(0)
    expect(screen.getByText('49 / 60g')).toBeInTheDocument()
    expect(screen.getAllByText('나트륨').length).toBeGreaterThan(0)
    expect(screen.getByText('1780 / 2000mg')).toBeInTheDocument()
    expect(screen.getByText('물')).toBeInTheDocument()
  })

  it('건강 정보 요약 행을 누르면 /profile로 이동한다', () => {
    renderPage()
    fireEvent.click(screen.getByText('산출 기준 · 건강 정보'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
