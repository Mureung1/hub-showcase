import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailyMissionCard from './DailyMissionCard.jsx'
import { MISSIONS } from '../data/missions.js'

vi.mock('../context/UserContext.jsx', () => ({
  useUser: vi.fn(),
}))

import { useUser } from '../context/UserContext.jsx'

const RECOMMENDED = { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 2000 }
const NO_RECORD_TITLES = MISSIONS.filter((m) => m.trigger === 'no-record').map((m) => m.title)
const ALL_SATISFIED_TITLES = MISSIONS.filter((m) => m.trigger === 'all-satisfied').map((m) => m.title)

function mockUser(overrides) {
  useUser.mockReturnValue({
    effectiveRecommended: RECOMMENDED,
    effectiveUserId: 'guest',
    todayMeals: [],
    todayMealsTotal: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
    todayMealsLoading: false,
    ...overrides,
  })
}

describe('DailyMissionCard', () => {
  it('recommended가 없으면(성별조차 안 고른 게스트) 아무 것도 그리지 않는다', () => {
    mockUser({ effectiveRecommended: null })
    const { container } = render(<DailyMissionCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('로딩 중이면 스켈레톤만 보이고 미션 문구는 안 보인다', () => {
    mockUser({ todayMealsLoading: true })
    render(<DailyMissionCard />)
    expect(screen.queryByText('오늘의 미션')).not.toBeInTheDocument()
  })

  it('오늘 기록이 없으면 no-record 미션 중 하나가 보인다', () => {
    mockUser({ todayMeals: [], mealCount: 0 })
    render(<DailyMissionCard />)
    expect(screen.getByText('오늘의 미션')).toBeInTheDocument()
    const heading = screen.getByRole('heading', { level: 3 })
    expect(NO_RECORD_TITLES).toContain(heading.textContent)
    expect(screen.queryByText('완료')).not.toBeInTheDocument()
  })

  it('4대 영양소와 나트륨을 전부 충족했으면 all-satisfied 미션이 보이고 "완료" 배지는 없다(정보성)', () => {
    mockUser({
      todayMeals: [{ id: 'm1', items: [] }],
      todayMealsTotal: { calories: 2000, protein: 60, carbs: 300, fat: 60, fiber: 25, sodium: 1500 },
    })
    render(<DailyMissionCard />)
    const heading = screen.getByRole('heading', { level: 3 })
    expect(ALL_SATISFIED_TITLES).toContain(heading.textContent)
    expect(screen.queryByText('완료')).not.toBeInTheDocument()
  })

  it('부족한 영양소를 이미 채웠으면(단백질 미션 완료) "완료" 배지가 보인다', () => {
    mockUser({
      todayMeals: [{ id: 'm1', items: [] }],
      // 단백질만 낮게(달성률 0.8 미만) 둬서 protein 트리거가 선택되게 하되, 값 자체는 만족 기준(0.8)
      // 이상으로 둬 evaluateMission이 true를 반환하게 한다 — 즉 미션은 protein인데 이미 완료된 상태.
      todayMealsTotal: { calories: 2000, protein: 55, carbs: 300, fat: 60, fiber: 25, sodium: 1500 },
    })
    render(<DailyMissionCard />)
    expect(screen.getByText('완료')).toBeInTheDocument()
  })
})
