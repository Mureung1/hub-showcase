import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MealCardExporter from './MealCardExporter.jsx'
import { useUser } from '../context/UserContext.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

describe('MealCardExporter', () => {
  beforeEach(() => {
    useUser.mockReturnValue({
      todayMealsTotal: { calories: 800, protein: 30, carbs: 100, fat: 20, fiber: 5, sodium: 900 },
      effectiveRecommended: { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 },
    })
  })

  it('제목과 템플릿 토글, 닫기 버튼을 렌더링한다', () => {
    render(<MealCardExporter photoUrl="data:image/png;base64,abc" mealTotal={{ calories: 500 }} onClose={() => {}} />)
    expect(screen.getByText('인증샷 카드 만들기')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '스토리' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '피드' })).toBeInTheDocument()
  })

  it('배경 클릭 또는 닫기 버튼을 누르면 onClose가 불린다', () => {
    const onClose = vi.fn()
    render(<MealCardExporter photoUrl="data:image/png;base64,abc" mealTotal={{ calories: 500 }} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('effectiveRecommended가 없어도(게스트 미입력) 예외 없이 렌더된다', () => {
    useUser.mockReturnValue({ todayMealsTotal: {}, effectiveRecommended: null })
    expect(() =>
      render(<MealCardExporter photoUrl="data:image/png;base64,abc" mealTotal={{ calories: 500 }} onClose={() => {}} />),
    ).not.toThrow()
  })
})
