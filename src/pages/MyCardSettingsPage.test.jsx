import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyCardSettingsPage from './MyCardSettingsPage.jsx'
import { useUser } from '../context/UserContext.jsx'
import { setVisibleNutrients } from '../lib/cardSettings.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function renderPage() {
  return render(
    <MemoryRouter>
      <MyCardSettingsPage />
    </MemoryRouter>,
  )
}

describe('MyCardSettingsPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockNavigate.mockClear()
    setVisibleNutrients({ calories: true, protein: true, carbs: true, fat: true, fiber: false, sodium: false })
    useUser.mockReturnValue({
      todayMealsTotal: { calories: 1280, protein: 30, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
      effectiveRecommended: { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 },
    })
  })

  it('토글 상태에 맞춰 미리보기에 해당 영양소만 보여준다', () => {
    renderPage()
    expect(screen.getByText('칼로리 · 단백질 · 탄수화물 · 지방')).toBeInTheDocument()
    expect(screen.queryByText('식이섬유', { selector: 'p' })).not.toBeInTheDocument()
  })

  it('미리보기 퍼센트는 오늘 실제 섭취/권장량 기준으로 계산된다', () => {
    renderPage()
    // 1280/2000=64%
    expect(screen.getByText('64%')).toBeInTheDocument()
  })

  it('토글을 끄면 미리보기에서 즉시 빠진다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '단백질' }))
    expect(screen.getByText('칼로리 · 탄수화물 · 지방')).toBeInTheDocument()
  })

  it('모든 항목을 끄면 안내 문구를 보여준다', () => {
    renderPage()
    for (const label of ['칼로리', '단백질', '탄수화물', '지방']) {
      fireEvent.click(screen.getByRole('button', { name: label }))
    }
    expect(screen.getByText('모든 항목을 껐어요 — 하나 이상 켜주세요.')).toBeInTheDocument()
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
