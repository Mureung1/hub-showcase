import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomeTodaySummary, { buildStatusMessage } from './HomeTodaySummary.jsx'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

import { useUser } from '../context/UserContext.jsx'

function meal(mealType) {
  return { id: mealType, mealType, items: [] }
}

// getRecommendedMealType(now) 판정 구간(mealType.js): 아침 05~10시, 점심 10~15시, 저녁 15~21시, 그 외 기타.
function atHour(h) {
  return new Date(2026, 0, 1, h)
}

function renderWidget() {
  return render(
    <MemoryRouter>
      <HomeTodaySummary />
    </MemoryRouter>,
  )
}

describe('buildStatusMessage', () => {
  it('아무 것도 기록하지 않았으면 지금 시간대에 맞는 끼니를 권한다', () => {
    expect(buildStatusMessage([], atHour(7))).toBe('아침을 기록해보세요')
    expect(buildStatusMessage([], atHour(13))).toBe('점심을 기록해보세요')
    expect(buildStatusMessage([], atHour(18))).toBe('저녁을 기록해보세요')
  })

  it('지금 시간대의 끼니를 이미 기록했으면 순서대로 다음 안 찍은 끼니를 권한다', () => {
    expect(buildStatusMessage([meal('breakfast')], atHour(7))).toBe('아침만 기록됨 · 점심을 기록해보세요')
    expect(buildStatusMessage([meal('breakfast'), meal('lunch')], atHour(13))).toBe('아침 점심만 기록됨 · 저녁을 기록해보세요')
  })

  it('지금 시간대 끼니를 아직 안 찍었으면, 순서가 이르더라도 지금 시간대를 우선 권한다', () => {
    // 아침만 기록하고 점심을 건너뛴 채 저녁 시간이 됐다 — 이미 지난 점심 대신 지금(저녁)을
    // 권해야 자연스럽다(리뷰에서 발견: 예전엔 항상 아침→점심→저녁 순서로만 골라 이런 경우
    // "이미 지난 점심"을 계속 권했다).
    expect(buildStatusMessage([meal('breakfast')], atHour(18))).toBe('아침만 기록됨 · 저녁을 기록해보세요')
  })

  it('세 끼 모두 기록했으면 시간대와 무관하게 모두 기록했다는 문구다', () => {
    expect(buildStatusMessage([meal('breakfast'), meal('lunch'), meal('dinner')], atHour(18))).toBe(
      '아침 점심 저녁 모두 기록했어요',
    )
  })

  it('기타(etc) 기록은 아침/점심/저녁 판정에 영향을 주지 않는다', () => {
    expect(buildStatusMessage([meal('etc')], atHour(7))).toBe('아침을 기록해보세요')
  })

  it('지금이 기타 시간대(21~05시)면 시간대 우선 규칙 없이 순서대로 다음 안 찍은 끼니를 권한다', () => {
    expect(buildStatusMessage([], atHour(23))).toBe('아침을 기록해보세요')
  })
})

describe('HomeTodaySummary', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    vi.useFakeTimers()
    vi.setSystemTime(atHour(13)) // 점심 시간대로 고정 — 컴포넌트 내부의 new Date() 기본값을 결정화한다.
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('권장 섭취량이 없으면(신체정보 미입력) 아무 것도 그리지 않는다', () => {
    useUser.mockReturnValue({ todayMeals: [], todayMealsTotal: {}, effectiveRecommended: null })
    const { container } = renderWidget()
    expect(container).toBeEmptyDOMElement()
  })

  it('칼로리 달성률과 오늘 기록 상태 문구를 보여준다', () => {
    useUser.mockReturnValue({
      todayMeals: [meal('breakfast')],
      todayMealsTotal: { calories: 500 },
      effectiveRecommended: { calories: 2000 },
    })
    renderWidget()
    expect(screen.getByText('500 / 2000kcal · 25%')).toBeInTheDocument()
    expect(screen.getByText('아침만 기록됨 · 점심을 기록해보세요')).toBeInTheDocument()
  })

  it('카드를 누르면 /meals로 이동한다', () => {
    useUser.mockReturnValue({
      todayMeals: [],
      todayMealsTotal: { calories: 0 },
      effectiveRecommended: { calories: 2000 },
    })
    renderWidget()
    fireEvent.click(screen.getByText('오늘 요약'))
    expect(mockNavigate).toHaveBeenCalledWith('/meals')
  })
})
