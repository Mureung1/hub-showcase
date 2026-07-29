import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildWeekDays, dateKeyToDayNumber, weekDateKeys } from './questWeekContext.js'
import { getClaimedQuestIds } from './dataStore.js'

// useQuestBoard.js(MY 탭/홈 화면)와 Analyze.jsx(끼니 저장 직후)가 공유하는 주간 집계 함수.
// 예전엔 두 파일이 이 로직을 각자 복제해 갖고 있었고, 그중 한 쪽에만 새 필드가 추가되며 드리프트
// 버그가 났었다(연결된 CLAUDE.md 세션 노트 참고) — 이제 이 파일 하나만 검증하면 두 호출부 모두 보장된다.
vi.mock('./dataStore.js', () => ({ getClaimedQuestIds: vi.fn() }))

const RECOMMENDED = { protein: 60, sodium: 2000, carbs: 300, fat: 60, fiber: 25, calories: 2000 }

function meal(mealType, nutrients, name = '음식') {
  return { mealType, items: [{ name, nutrients }] }
}

describe('weekDateKeys', () => {
  it('월요일(weekKey)로부터 월~일 7개 날짜를 만든다', () => {
    expect(weekDateKeys('2026-07-27')).toEqual([
      '2026-07-27',
      '2026-07-28',
      '2026-07-29',
      '2026-07-30',
      '2026-07-31',
      '2026-08-01',
      '2026-08-02',
    ])
  })
})

describe('dateKeyToDayNumber', () => {
  it('연속된 날짜는 1씩 증가하는 정수를 반환한다', () => {
    expect(dateKeyToDayNumber('2026-07-30') - dateKeyToDayNumber('2026-07-29')).toBe(1)
  })
})

describe('buildWeekDays', () => {
  beforeEach(() => {
    getClaimedQuestIds.mockResolvedValue([])
  })

  it('weekKey~오늘까지의 날짜만 포함한다(주 후반부는 아직 없음)', async () => {
    const days = await buildWeekDays({
      weekKey: '2026-07-27',
      todayCalendarKey: '2026-07-29',
      mealsForDate: () => [],
      effectiveUserId: 'u1',
      targetMl: 2000,
      effectiveRecommended: RECOMMENDED,
    })
    expect(days.map((d) => d.dayNumber)).toHaveLength(3) // 월/화/수(오늘)만
  })

  it('끼니 유무·영양소 충족 여부·아침/저녁 여부를 정확히 채운다', async () => {
    const byDate = {
      '2026-07-27': [meal('breakfast', { protein: 60, carbs: 300, fat: 55, fiber: 25, calories: 2000, sodium: 1000 })],
      '2026-07-28': [meal('dinner', { protein: 10, carbs: 50, fat: 10, fiber: 5, calories: 500, sodium: 3000 })],
    }
    const days = await buildWeekDays({
      weekKey: '2026-07-27',
      todayCalendarKey: '2026-07-28',
      mealsForDate: (dayKey) => byDate[dayKey] ?? [],
      effectiveUserId: 'u1',
      targetMl: 2000,
      effectiveRecommended: RECOMMENDED,
    })

    const day1 = days.find((d) => d.dayNumber === dateKeyToDayNumber('2026-07-27'))
    expect(day1.mealCount).toBe(1)
    expect(day1.breakfast).toBe(true)
    expect(day1.dinner).toBe(false)
    expect(day1.proteinOk).toBe(true)
    expect(day1.carbsOk).toBe(true)
    expect(day1.fatOk).toBe(true) // 55는 60의 80~120% 범위(48~72) 안
    expect(day1.fiberOk).toBe(true)
    expect(day1.calorieOk).toBe(true)
    expect(day1.sodiumOk).toBe(true)
    expect(day1.foodNames).toEqual(['음식'])

    const day2 = days.find((d) => d.dayNumber === dateKeyToDayNumber('2026-07-28'))
    expect(day2.breakfast).toBe(false)
    expect(day2.dinner).toBe(true)
    expect(day2.proteinOk).toBe(false)
    expect(day2.sodiumOk).toBe(false) // 3000 > 2000 상한
  })

  it('끼니가 없는 날은 mealCount 0, sodiumOk는 false(끼니 없이 상한만으로 통과하지 않음)', async () => {
    const days = await buildWeekDays({
      weekKey: '2026-07-27',
      todayCalendarKey: '2026-07-27',
      mealsForDate: () => [],
      effectiveUserId: 'u1',
      targetMl: 2000,
      effectiveRecommended: RECOMMENDED,
    })
    expect(days[0].mealCount).toBe(0)
    expect(days[0].sodiumOk).toBe(false)
    expect(days[0].threeMeals).toBe(false)
  })

  it('커스텀 조합 빌더/지도 듀얼 사용 여부를 그날의 클레임 목록에서 읽는다', async () => {
    getClaimedQuestIds.mockImplementation(async (dayKey) =>
      dayKey === '2026-07-27' ? ['feature-combo-builder', 'feature-map-duel'] : [],
    )
    const days = await buildWeekDays({
      weekKey: '2026-07-27',
      todayCalendarKey: '2026-07-28',
      mealsForDate: () => [],
      effectiveUserId: 'u1',
      targetMl: 2000,
      effectiveRecommended: RECOMMENDED,
    })
    const day1 = days.find((d) => d.dayNumber === dateKeyToDayNumber('2026-07-27'))
    const day2 = days.find((d) => d.dayNumber === dateKeyToDayNumber('2026-07-28'))
    expect(day1.usedComboBuilder).toBe(true)
    expect(day1.usedMapDuel).toBe(true)
    expect(day2.usedComboBuilder).toBe(false)
  })
})
