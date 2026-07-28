// T0.1 회귀 가드 — /result가 마지막 한 끼(todayMeal, 메모리 전용)가 아니라 오늘 누적(todayMealsTotal)을
// 읽는지, 그리고 "기록 없음"이 sumMealRecordsNutrients([])의 truthy한 0-객체가 아니라 todayMeals.length로
// 판정되는지를 고정한다. 이 두 가지가 이 화면에서 실제로 있었던 버그다.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Result from './Result.jsx'

vi.mock('../context/UserContext.jsx', () => ({
  useUser: vi.fn(),
}))

import { useUser } from '../context/UserContext.jsx'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }

function mockUser(overrides) {
  useUser.mockReturnValue({
    profile: { allergies: [], conditions: [] },
    todayMeals: [],
    todayMealsTotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
    todayMealsLoading: false,
    todayMealsError: '',
    refetchTodayMeals: vi.fn(),
    effectiveRecommended: RECOMMENDED,
    isTempRecommended: false,
    ...overrides,
  })
}

function renderResult() {
  return render(
    <MemoryRouter>
      <Result />
    </MemoryRouter>,
  )
}

describe('Result(/result) — todayMealsTotal 기반 하루 누적', () => {
  it('todayMeals가 비어 있으면(합계 객체가 0으로 채워져 truthy여도) 빈 상태를 보여준다', () => {
    mockUser({
      todayMeals: [],
      todayMealsTotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
    })
    renderResult()

    expect(screen.getByText(/오늘 분석한 식사 기록이 없습니다/)).toBeInTheDocument()
  })

  it('todayMeals가 있으면 todayMealsTotal(오늘 누적)로 달성률을 계산해 보여준다', () => {
    // 목표형 4개(탄수·단백·지방·식이섬유)를 전부 충족시켜 buildDeficiencyRows가 빈 배열을 반환하게
    // 한다 — AI 보충 메뉴 추천(useEffect)이 발사되지 않아 네트워크/Gemini 모킹 없이 렌더링만 검증한다.
    mockUser({
      todayMeals: [{ id: 'm1', mealType: 'lunch', items: [] }],
      todayMealsTotal: { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 },
    })
    renderResult()

    expect(screen.queryByText(/오늘 분석한 식사 기록이 없습니다/)).not.toBeInTheDocument()
    expect(screen.getByText('하루 목표 달성률')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('로딩 중이면 빈 상태 대신 스켈레톤을 보여준다(로딩 중 빈 카드가 번쩍이는 것을 방지)', () => {
    mockUser({ todayMealsLoading: true })
    renderResult()

    expect(screen.queryByText(/오늘 분석한 식사 기록이 없습니다/)).not.toBeInTheDocument()
    expect(screen.queryByText('하루 목표 달성률')).not.toBeInTheDocument()
  })

  it('조회 실패 시 에러와 재시도 버튼을 보여준다', () => {
    mockUser({ todayMealsError: '식단 기록을 불러오지 못했어요.' })
    renderResult()

    expect(screen.getByText('식단 기록을 불러오지 못했어요.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument()
  })
})
