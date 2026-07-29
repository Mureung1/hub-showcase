import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildWeekDays, dateKeyToDayNumber, getWeekQuizStreak, getWeekWaterHistory, mondayKeyOf, weekDateKeys } from './questWeekContext.js'
import { getClaimedQuestIds } from './dataStore.js'
import { addMl } from './waterIntake.js'

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

describe('mondayKeyOf', () => {
  it('평일이면 그 주의 월요일을 돌려준다', () => {
    expect(mondayKeyOf('2026-07-29')).toBe('2026-07-27') // 수요일 -> 같은 주 월요일
  })

  it('월요일 자신을 넣으면 그대로 돌려준다', () => {
    expect(mondayKeyOf('2026-07-27')).toBe('2026-07-27')
  })

  it('일요일은 그 주(하루 전 월요일이 아니라)의 월요일로 되돌아간다', () => {
    expect(mondayKeyOf('2026-08-02')).toBe('2026-07-27') // 일요일 -> 6일 전 월요일
  })

  it('월 경계를 걸치는 주도 올바르게 역산한다', () => {
    // 2026-08-01(토)이 속한 주의 월요일은 7월로 넘어간다.
    expect(mondayKeyOf('2026-08-01')).toBe('2026-07-27')
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

describe('getWeekQuizStreak', () => {
  beforeEach(() => {
    getClaimedQuestIds.mockReset()
  })

  it('오늘 이후 요일은 isFuture:true로 표시하고 클레임을 조회하지 않는다', async () => {
    getClaimedQuestIds.mockResolvedValue([])
    // weekKey 2026-07-27(월) ~ 2026-08-02(일), 오늘은 2026-07-29(수) — 목/금/토/일은 미래.
    const { days } = await getWeekQuizStreak('2026-07-27', '2026-07-29')
    expect(days.map((d) => d.isFuture)).toEqual([false, false, false, true, true, true, true])
    expect(getClaimedQuestIds).toHaveBeenCalledTimes(3) // 월/화/수만
  })

  it('월~수 정답이면 success가 true, 나머지는 false다', async () => {
    getClaimedQuestIds.mockImplementation(async (dateKey) => (dateKey <= '2026-07-29' ? ['special-quiz'] : []))
    const { days } = await getWeekQuizStreak('2026-07-27', '2026-07-29')
    expect(days.map((d) => d.success)).toEqual([true, true, true, false, false, false, false])
  })

  it('streak는 오늘(미래 제외)에서 거슬러 끊기지 않은 연속 정답 일수다', async () => {
    // 월/화만 정답, 수요일(오늘)은 실패 -> 오늘에서부터 거슬러 올라가면 즉시 끊김(streak=0).
    getClaimedQuestIds.mockImplementation(async (dateKey) => (dateKey <= '2026-07-28' ? ['special-quiz'] : []))
    const result = await getWeekQuizStreak('2026-07-27', '2026-07-29')
    expect(result.streak).toBe(0)
  })

  it('오늘까지 전부 정답이면 미래 요일을 건너뛰고 지난 요일 수만큼 streak가 잡힌다', async () => {
    getClaimedQuestIds.mockResolvedValue(['special-quiz'])
    const result = await getWeekQuizStreak('2026-07-27', '2026-07-29')
    expect(result.streak).toBe(3) // 월/화/수
  })

  it('중간에 실패한 날이 있으면 거기서 멈춘다', async () => {
    // 월 성공, 화 실패, 수(오늘) 성공 -> 오늘에서 거슬러 올라가면 수만 세고 화에서 끊김.
    getClaimedQuestIds.mockImplementation(async (dateKey) => (dateKey === '2026-07-28' ? [] : ['special-quiz']))
    const result = await getWeekQuizStreak('2026-07-27', '2026-07-29')
    expect(result.streak).toBe(1)
  })
})

describe('getWeekWaterHistory', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('그 주 7일치 mlConsumed를 dateKey와 함께 반환한다', () => {
    addMl('u1', '2026-07-27', 400, 2000)
    addMl('u1', '2026-07-29', 900, 2000)
    const history = getWeekWaterHistory('u1', '2026-07-27')
    expect(history).toHaveLength(7)
    expect(history[0]).toEqual({ dateKey: '2026-07-27', mlConsumed: 400 })
    expect(history[2]).toEqual({ dateKey: '2026-07-29', mlConsumed: 900 })
    expect(history[1].mlConsumed).toBe(0)
  })
})
