import { describe, it, expect } from 'vitest'
import {
  DAILY_ALL_CLEAR_ID,
  DAILY_ALL_CLEAR_XP,
  DAILY_QUEST_POOL,
  WEEKLY_ALL_CLEAR_ID,
  WEEKLY_ALL_CLEAR_XP,
  WEEKLY_QUEST_POOL,
  buildItemFlags,
  buildWeeklyStats,
  evaluateQuest,
  findNewlyCompletedAutoQuests,
  getQuestBoard,
  resolveAllClearBonuses,
  selectDailyQuests,
  selectWeeklyQuests,
} from './quests.js'

const RECOMMENDED = { protein: 60, sodium: 2000, carbs: 300, fat: 60, fiber: 25, calories: 2000 }

function ctx(overrides = {}) {
  return {
    mealCount: 0,
    todayTotal: {},
    recommended: RECOMMENDED,
    mealTypesToday: new Set(),
    streakCurrent: 0,
    waterMlConsumed: 0,
    waterTargetMl: 2000,
    supplementTaken: false,
    hasSetMeal: false,
    hasDbMatchedItem: false,
    hasServingsAdjustedItem: false,
    hasLabelScanItem: false,
    weekLoggedDays: 0,
    weekThreeMealDays: 0,
    weekBreakfastDays: 0,
    weekDinnerDays: 0,
    weekWaterMetDays: 0,
    weekSupplementDays: 0,
    weekSodiumOkDays: 0,
    weekLongestStreak: 0,
    weekQuizDays: 0,
    weekProteinOkDays: 0,
    weekCarbsOkDays: 0,
    weekFatOkDays: 0,
    weekFiberOkDays: 0,
    weekCalorieOkDays: 0,
    weekUniqueFoodCount: 0,
    weekComboBuilderDays: 0,
    weekMapDuelDays: 0,
    ...overrides,
  }
}

describe('DAILY_QUEST_POOL / WEEKLY_QUEST_POOL', () => {
  it('일간 풀은 34개, 주간 풀은 36개다', () => {
    expect(DAILY_QUEST_POOL).toHaveLength(34)
    expect(WEEKLY_QUEST_POOL).toHaveLength(36)
  })

  it('모든 퀘스트가 category를 갖는다(로테이션 카테고리 상한 계산에 필요)', () => {
    for (const quest of [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL]) {
      expect(typeof quest.category).toBe('string')
      expect(quest.category.length).toBeGreaterThan(0)
    }
  })

  it('기존 7개 퀘스트 id가 그대로 보존된다(뱃지 시스템이 참조)', () => {
    const ids = DAILY_QUEST_POOL.map((q) => q.id)
    for (const legacyId of ['first-meal-today', 'three-meals', 'protein-80', 'sodium-in-limit', 'streak-3', 'water-4', 'supplement']) {
      expect(ids).toContain(legacyId)
    }
  })

  it('모든 id가 유일하다', () => {
    const ids = [...DAILY_QUEST_POOL, ...WEEKLY_QUEST_POOL].map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe('evaluateQuest', () => {
  it('first-meal-today: 끼니가 하나라도 있으면 완료', () => {
    expect(evaluateQuest('first-meal-today', ctx({ mealCount: 0 }))).toBe(false)
    expect(evaluateQuest('first-meal-today', ctx({ mealCount: 1 }))).toBe(true)
  })

  it('three-meals: 세 끼가 모두 있어야 완료', () => {
    expect(evaluateQuest('three-meals', ctx({ mealTypesToday: new Set(['breakfast', 'lunch']) }))).toBe(false)
    expect(evaluateQuest('three-meals', ctx({ mealTypesToday: new Set(['breakfast', 'lunch', 'dinner']) }))).toBe(true)
  })

  it('protein-80/protein-50/protein-100: 달성률에 따라 순서대로 완료된다', () => {
    const partial = ctx({ todayTotal: { protein: 40 } }) // 60의 약 67%
    expect(evaluateQuest('protein-50', partial)).toBe(true)
    expect(evaluateQuest('protein-80', partial)).toBe(false)
    expect(evaluateQuest('protein-100', ctx({ todayTotal: { protein: 60 } }))).toBe(true)
  })

  it('sodium-in-limit: 끼니가 있고 상한 이내면 완료', () => {
    expect(evaluateQuest('sodium-in-limit', ctx({ mealCount: 1, todayTotal: { sodium: 2500 } }))).toBe(false)
    expect(evaluateQuest('sodium-in-limit', ctx({ mealCount: 1, todayTotal: { sodium: 1500 } }))).toBe(true)
    expect(evaluateQuest('sodium-in-limit', ctx({ mealCount: 0, todayTotal: { sodium: 0 } }))).toBe(false)
  })

  it('water-4/water-25/water-80/water-full: mL 목표 대비 비율로 완료된다', () => {
    expect(evaluateQuest('water-25', ctx({ waterMlConsumed: 400, waterTargetMl: 2000 }))).toBe(false)
    expect(evaluateQuest('water-25', ctx({ waterMlConsumed: 500, waterTargetMl: 2000 }))).toBe(true)
    expect(evaluateQuest('water-4', ctx({ waterMlConsumed: 999, waterTargetMl: 2000 }))).toBe(false)
    expect(evaluateQuest('water-4', ctx({ waterMlConsumed: 1000, waterTargetMl: 2000 }))).toBe(true)
    expect(evaluateQuest('water-full', ctx({ waterMlConsumed: 1999, waterTargetMl: 2000 }))).toBe(false)
    expect(evaluateQuest('water-full', ctx({ waterMlConsumed: 2000, waterTargetMl: 2000 }))).toBe(true)
  })

  it('fat-balance/calorie-balance: 권장량 범위 안일 때만 완료', () => {
    expect(evaluateQuest('fat-balance', ctx({ todayTotal: { fat: 50 } }))).toBe(true) // 60의 83%
    expect(evaluateQuest('fat-balance', ctx({ todayTotal: { fat: 20 } }))).toBe(false)
    expect(evaluateQuest('calorie-balance', ctx({ todayTotal: { calories: 1900 } }))).toBe(true)
    expect(evaluateQuest('calorie-balance', ctx({ todayTotal: { calories: 1000 } }))).toBe(false)
  })

  it('set-meal/db-matched-meal/servings-adjusted/label-scan: item 플래그를 그대로 반영', () => {
    expect(evaluateQuest('set-meal', ctx({ hasSetMeal: true }))).toBe(true)
    expect(evaluateQuest('db-matched-meal', ctx({ hasDbMatchedItem: true }))).toBe(true)
    expect(evaluateQuest('servings-adjusted', ctx({ hasServingsAdjustedItem: true }))).toBe(true)
    expect(evaluateQuest('label-scan', ctx({ hasLabelScanItem: true }))).toBe(true)
  })

  it('dual-nutrient: 단백질 80%와 나트륨 관리를 동시에 만족해야 완료', () => {
    const both = ctx({ mealCount: 1, todayTotal: { protein: 60, sodium: 1000 } })
    expect(evaluateQuest('dual-nutrient', both)).toBe(true)
    const onlyProtein = ctx({ mealCount: 1, todayTotal: { protein: 60, sodium: 5000 } })
    expect(evaluateQuest('dual-nutrient', onlyProtein)).toBe(false)
  })

  it('주간 퀘스트: 주간 카운터를 그대로 비교한다', () => {
    expect(evaluateQuest('week-log-5', ctx({ weekLoggedDays: 4 }))).toBe(false)
    expect(evaluateQuest('week-log-5', ctx({ weekLoggedDays: 5 }))).toBe(true)
    expect(evaluateQuest('week-streak-5', ctx({ weekLongestStreak: 5 }))).toBe(true)
    expect(evaluateQuest('week-quiz-3', ctx({ weekQuizDays: 3 }))).toBe(true)
  })

  it('새로 추가된 주간 퀘스트(다양화)도 주간 카운터를 그대로 비교한다', () => {
    expect(evaluateQuest('week-protein-3', ctx({ weekProteinOkDays: 2 }))).toBe(false)
    expect(evaluateQuest('week-protein-3', ctx({ weekProteinOkDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-carbs-3', ctx({ weekCarbsOkDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-fat-3', ctx({ weekFatOkDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-fiber-3', ctx({ weekFiberOkDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-calorie-5', ctx({ weekCalorieOkDays: 4 }))).toBe(false)
    expect(evaluateQuest('week-calorie-5', ctx({ weekCalorieOkDays: 5 }))).toBe(true)
    expect(evaluateQuest('week-variety-5', ctx({ weekUniqueFoodCount: 4 }))).toBe(false)
    expect(evaluateQuest('week-variety-5', ctx({ weekUniqueFoodCount: 5 }))).toBe(true)
    expect(evaluateQuest('week-try-combo', ctx({ weekComboBuilderDays: 1 }))).toBe(true)
    expect(evaluateQuest('week-try-mapduel', ctx({ weekMapDuelDays: 1 }))).toBe(true)
  })

  it('리텐션 강화 v5에서 새로 추가된 daily/weekly 퀘스트도 정상 판정된다', () => {
    expect(evaluateQuest('carbs-50', ctx({ todayTotal: { carbs: 150 } }))).toBe(true) // 300의 50%
    expect(evaluateQuest('carbs-100', ctx({ todayTotal: { carbs: 200 } }))).toBe(false)
    expect(evaluateQuest('carbs-100', ctx({ todayTotal: { carbs: 300 } }))).toBe(true)
    expect(evaluateQuest('fiber-50', ctx({ todayTotal: { fiber: 12 } }))).toBe(false) // 25의 50%=12.5
    expect(evaluateQuest('fiber-50', ctx({ todayTotal: { fiber: 13 } }))).toBe(true)
    expect(evaluateQuest('fat-50', ctx({ todayTotal: { fat: 29 } }))).toBe(false) // 60의 50%=30
    expect(evaluateQuest('fat-50', ctx({ todayTotal: { fat: 30 } }))).toBe(true)

    expect(evaluateQuest('week-breakfast-3', ctx({ weekBreakfastDays: 2 }))).toBe(false)
    expect(evaluateQuest('week-breakfast-3', ctx({ weekBreakfastDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-dinner-3', ctx({ weekDinnerDays: 3 }))).toBe(true)
    expect(evaluateQuest('week-streak-3', ctx({ weekLongestStreak: 2 }))).toBe(false)
    expect(evaluateQuest('week-streak-3', ctx({ weekLongestStreak: 3 }))).toBe(true)
    expect(evaluateQuest('week-quiz-1', ctx({ weekQuizDays: 1 }))).toBe(true)
    expect(evaluateQuest('week-try-both', ctx({ weekComboBuilderDays: 1, weekMapDuelDays: 0 }))).toBe(false)
    expect(evaluateQuest('week-try-both', ctx({ weekComboBuilderDays: 1, weekMapDuelDays: 1 }))).toBe(true)
  })

  it('알 수 없는 id는 false', () => {
    expect(evaluateQuest('nonexistent', ctx())).toBe(false)
  })
})

describe('selectRotation 카테고리 상한(같은 행동 미션 최대 2개)', () => {
  it('일간 로테이션은 어떤 시드에서도 같은 카테고리가 2개를 넘지 않는다', () => {
    for (let i = 0; i < 40; i++) {
      const daily = selectDailyQuests('2026-07-29', `user-${i}`, 3)
      const counts = {}
      for (const q of daily) counts[q.category] = (counts[q.category] ?? 0) + 1
      expect(Object.values(counts).every((c) => c <= 2)).toBe(true)
    }
  })

  it('주간 로테이션도 같은 카테고리가 2개를 넘지 않는다', () => {
    for (let i = 0; i < 40; i++) {
      const weekly = selectWeeklyQuests('2026-07-27', `user-${i}`, 5)
      const counts = {}
      for (const q of weekly) counts[q.category] = (counts[q.category] ?? 0) + 1
      expect(Object.values(counts).every((c) => c <= 2)).toBe(true)
    }
  })
})

describe('selectDailyQuests / selectWeeklyQuests', () => {
  it('같은 시드(userId+기간키)면 항상 같은 항목을 반환한다', () => {
    const a = selectDailyQuests('2026-07-29', 'u1', 3)
    const b = selectDailyQuests('2026-07-29', 'u1', 3)
    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id))
  })

  it('n개를 정확히 반환하고 전부 풀 안에 있는 id다', () => {
    const daily = selectDailyQuests('2026-07-29', 'u1', 3)
    expect(daily).toHaveLength(3)
    const dailyIds = new Set(DAILY_QUEST_POOL.map((q) => q.id))
    expect(daily.every((q) => dailyIds.has(q.id))).toBe(true)

    const weekly = selectWeeklyQuests('2026-07-27', 'u1', 3)
    expect(weekly).toHaveLength(3)
    const weeklyIds = new Set(WEEKLY_QUEST_POOL.map((q) => q.id))
    expect(weekly.every((q) => weeklyIds.has(q.id))).toBe(true)
  })

  it('n을 생략하면 주간은 기본 5개를 반환한다', () => {
    expect(selectWeeklyQuests('2026-07-27', 'u1')).toHaveLength(5)
  })

  it('사용자가 다르면 대체로 다른 조합이 나온다', () => {
    const a = selectDailyQuests('2026-07-29', 'u1', 3).map((q) => q.id)
    const b = selectDailyQuests('2026-07-29', 'u2', 3).map((q) => q.id)
    expect(a).not.toEqual(b)
  })

  it('날짜가 다르면 대체로 다른 조합이 나온다', () => {
    const a = selectDailyQuests('2026-07-29', 'u1', 3).map((q) => q.id)
    const b = selectDailyQuests('2026-07-30', 'u1', 3).map((q) => q.id)
    expect(a).not.toEqual(b)
  })
})

describe('getQuestBoard', () => {
  const opts = { dateKey: '2026-07-29', weekKey: '2026-07-27', userId: 'u1' }

  it('daily/weekly 각각 completed/claimed 상태를 붙여 반환한다', () => {
    const board = getQuestBoard(ctx({ mealCount: 1 }), opts)
    expect(board.daily).toHaveLength(3)
    expect(board.weekly).toHaveLength(5)
    expect(board.daily.every((q) => typeof q.completed === 'boolean' && typeof q.claimed === 'boolean')).toBe(true)
  })

  it('claimedIds가 비어 있으면 전부 미수령이고 allClear는 false다', () => {
    const board = getQuestBoard(ctx(), opts)
    expect(board.daily.every((q) => q.claimed === false)).toBe(true)
    expect(board.dailyAllClear).toBe(false)
    expect(board.weeklyAllClear).toBe(false)
  })

  it('오늘 로테이션 3개를 전부 수령하면 dailyAllClear가 true다', () => {
    const dailyIds = selectDailyQuests(opts.dateKey, opts.userId, 3).map((q) => q.id)
    const board = getQuestBoard(ctx(), { ...opts, dailyClaimedIds: dailyIds })
    expect(board.dailyAllClear).toBe(true)
  })
})

describe('findNewlyCompletedAutoQuests', () => {
  const opts = { dateKey: '2026-07-29', weekKey: '2026-07-27', userId: 'u1' }

  it('로테이션에 포함되고, 완료됐지만 아직 수령 안 한 것만 반환한다', () => {
    const dailyIds = selectDailyQuests(opts.dateKey, opts.userId, 3).map((q) => q.id)
    const result = findNewlyCompletedAutoQuests(ctx({ mealCount: 1 }), opts)
    // 오늘 로테이션에 없는 퀘스트(예: 무조건 완료되는 low-effort-log가 로테이션 밖이면)는 절대 섞이지 않는다.
    expect(result.every((q) => dailyIds.includes(q.id) || q.period === 'weekly')).toBe(true)
  })

  it('이미 수령한 퀘스트는 제외한다', () => {
    const dailyIds = selectDailyQuests(opts.dateKey, opts.userId, 3).map((q) => q.id)
    const result = findNewlyCompletedAutoQuests(ctx({ mealCount: 1 }), { ...opts, dailyClaimedIds: dailyIds })
    expect(result.filter((q) => q.period === 'daily')).toEqual([])
  })

  it('로테이션 밖의 퀘스트는 조건을 만족해도 절대 포함되지 않는다', () => {
    // 모든 daily/weekly 조건을 만족시키는 풍부한 ctx를 줘도, 결과는 항상 그날(3개)/그주(5개)
    // 로테이션 이내다.
    const richCtx = ctx({
      mealCount: 3,
      todayTotal: { protein: 60, sodium: 1000, carbs: 300, fat: 55, fiber: 25, calories: 2000 },
      mealTypesToday: new Set(['breakfast', 'lunch', 'dinner']),
      streakCurrent: 10,
      waterMlConsumed: 2000,
      waterTargetMl: 2000,
      supplementTaken: true,
      hasSetMeal: true,
      hasDbMatchedItem: true,
      hasServingsAdjustedItem: true,
      hasLabelScanItem: true,
      weekLoggedDays: 7,
      weekThreeMealDays: 4,
      weekWaterMetDays: 5,
      weekSupplementDays: 7,
      weekSodiumOkDays: 5,
      weekLongestStreak: 5,
      weekQuizDays: 5,
      weekProteinOkDays: 7,
      weekCarbsOkDays: 7,
      weekFatOkDays: 7,
      weekFiberOkDays: 7,
      weekCalorieOkDays: 7,
      weekUniqueFoodCount: 10,
      weekComboBuilderDays: 1,
      weekMapDuelDays: 1,
      weekBreakfastDays: 7,
      weekDinnerDays: 7,
    })
    const result = findNewlyCompletedAutoQuests(richCtx, opts)
    expect(result.filter((q) => q.period === 'daily')).toHaveLength(3)
    expect(result.filter((q) => q.period === 'weekly')).toHaveLength(5)
  })
})

describe('resolveAllClearBonuses', () => {
  const dailyQuests = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  const weeklyQuests = [{ id: 'x' }, { id: 'y' }, { id: 'z' }]

  it('전부 수령했고 보너스를 아직 안 받았으면 보너스를 반환한다', () => {
    const result = resolveAllClearBonuses({ dailyQuests, dailyClaimedIds: ['a', 'b', 'c'], weeklyQuests, weeklyClaimedIds: [] })
    expect(result).toEqual([{ id: DAILY_ALL_CLEAR_ID, title: '오늘의 퀘스트 올클리어', xp: DAILY_ALL_CLEAR_XP, period: 'daily' }])
  })

  it('이미 보너스를 받았으면 다시 반환하지 않는다', () => {
    const result = resolveAllClearBonuses({
      dailyQuests,
      dailyClaimedIds: ['a', 'b', 'c', DAILY_ALL_CLEAR_ID],
      weeklyQuests,
      weeklyClaimedIds: [],
    })
    expect(result).toEqual([])
  })

  it('일부만 수령했으면 보너스가 없다', () => {
    expect(resolveAllClearBonuses({ dailyQuests, dailyClaimedIds: ['a', 'b'], weeklyQuests, weeklyClaimedIds: [] })).toEqual([])
  })

  it('주간도 동일하게 동작한다', () => {
    const result = resolveAllClearBonuses({ dailyQuests, dailyClaimedIds: [], weeklyQuests, weeklyClaimedIds: ['x', 'y', 'z'] })
    expect(result).toEqual([{ id: WEEKLY_ALL_CLEAR_ID, title: '이번 주 퀘스트 올클리어', xp: WEEKLY_ALL_CLEAR_XP, period: 'weekly' }])
  })
})

describe('buildWeeklyStats', () => {
  it('요일별 집계를 정확히 카운트한다', () => {
    const days = [
      { dayNumber: 100, mealCount: 1, threeMeals: true, sodiumOk: true, waterMet: true, supplementTaken: true, quizSuccess: true },
      { dayNumber: 101, mealCount: 1, threeMeals: false, sodiumOk: true, waterMet: false, supplementTaken: false, quizSuccess: false },
      { dayNumber: 102, mealCount: 0, threeMeals: false, sodiumOk: false, waterMet: false, supplementTaken: false, quizSuccess: false },
    ]
    const stats = buildWeeklyStats(days)
    expect(stats.weekLoggedDays).toBe(2)
    expect(stats.weekThreeMealDays).toBe(1)
    expect(stats.weekSodiumOkDays).toBe(2)
    expect(stats.weekWaterMetDays).toBe(1)
    expect(stats.weekSupplementDays).toBe(1)
    expect(stats.weekQuizDays).toBe(1)
  })

  it('새로 추가된 영양소/다양성/기능사용 집계도 정확히 카운트한다', () => {
    const days = [
      {
        dayNumber: 100,
        mealCount: 1,
        proteinOk: true,
        carbsOk: true,
        fatOk: true,
        fiberOk: true,
        calorieOk: true,
        breakfast: true,
        dinner: false,
        foodNames: ['김치찌개', '공기밥'],
        usedComboBuilder: true,
        usedMapDuel: false,
      },
      {
        dayNumber: 101,
        mealCount: 1,
        proteinOk: false,
        carbsOk: true,
        fatOk: false,
        fiberOk: true,
        calorieOk: false,
        breakfast: false,
        dinner: true,
        foodNames: ['공기밥', '라면'],
        usedComboBuilder: false,
        usedMapDuel: true,
      },
    ]
    const stats = buildWeeklyStats(days)
    expect(stats.weekProteinOkDays).toBe(1)
    expect(stats.weekCarbsOkDays).toBe(2)
    expect(stats.weekFatOkDays).toBe(1)
    expect(stats.weekFiberOkDays).toBe(2)
    expect(stats.weekCalorieOkDays).toBe(1)
    expect(stats.weekBreakfastDays).toBe(1)
    expect(stats.weekDinnerDays).toBe(1)
    expect(stats.weekUniqueFoodCount).toBe(3) // 김치찌개/공기밥/라면 — 공기밥 중복 제거
    expect(stats.weekComboBuilderDays).toBe(1)
    expect(stats.weekMapDuelDays).toBe(1)
  })

  it('연속 기록일수(weekLongestStreak)를 정확히 계산한다', () => {
    const consecutive = [10, 11, 12].map((n) => ({ dayNumber: n, mealCount: 1 }))
    expect(buildWeeklyStats(consecutive).weekLongestStreak).toBe(3)

    const gapped = [
      { dayNumber: 10, mealCount: 1 },
      { dayNumber: 11, mealCount: 1 },
      { dayNumber: 13, mealCount: 1 },
      { dayNumber: 14, mealCount: 1 },
      { dayNumber: 15, mealCount: 1 },
    ]
    expect(buildWeeklyStats(gapped).weekLongestStreak).toBe(3)
  })

  it('기록이 없으면 0을 반환한다', () => {
    expect(buildWeeklyStats([]).weekLongestStreak).toBe(0)
    expect(buildWeeklyStats([{ dayNumber: 1, mealCount: 0 }]).weekLoggedDays).toBe(0)
  })
})

describe('buildItemFlags', () => {
  it('items가 2개 이상인 record가 있으면 hasSetMeal true', () => {
    expect(buildItemFlags([{ items: [{ name: 'a' }, { name: 'b' }] }]).hasSetMeal).toBe(true)
    expect(buildItemFlags([{ items: [{ name: 'a' }] }]).hasSetMeal).toBe(false)
  })

  it('DB/가공DB/공식 출처 item이 있으면 hasDbMatchedItem true', () => {
    expect(buildItemFlags([{ items: [{ source: '식약처DB' }] }]).hasDbMatchedItem).toBe(true)
    expect(buildItemFlags([{ items: [{ source: '추정' }] }]).hasDbMatchedItem).toBe(false)
  })

  it('servings가 1이 아닌 item이 있으면 hasServingsAdjustedItem true', () => {
    expect(buildItemFlags([{ items: [{ servings: 1.5 }] }]).hasServingsAdjustedItem).toBe(true)
    expect(buildItemFlags([{ items: [{ servings: 1 }] }]).hasServingsAdjustedItem).toBe(false)
    expect(buildItemFlags([{ items: [{}] }]).hasServingsAdjustedItem).toBe(false)
  })

  it('라벨 추출 item이 있으면 hasLabelScanItem true', () => {
    expect(buildItemFlags([{ items: [{ source: '라벨 추출' }] }]).hasLabelScanItem).toBe(true)
  })

  it('mealRecords가 비어 있어도 예외 없이 전부 false', () => {
    expect(buildItemFlags([])).toEqual({
      hasSetMeal: false,
      hasDbMatchedItem: false,
      hasServingsAdjustedItem: false,
      hasLabelScanItem: false,
    })
    expect(buildItemFlags(undefined)).toEqual({
      hasSetMeal: false,
      hasDbMatchedItem: false,
      hasServingsAdjustedItem: false,
      hasLabelScanItem: false,
    })
  })
})
