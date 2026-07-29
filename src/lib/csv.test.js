// 안정성 점검(Phase B)에서 발견된 버그의 회귀 테스트 — 이 파일은 예전에 mealStore.js(localStorage)를
// userId로 직접 조회했다. 게스트는 그게 실시간 데이터라 맞았지만, 로그인 계정은 끼니가 Supabase에만
// 있어(dataStore.js의 addMeal 분기 참고) 항상 빈 배열만 나와 "선택한 기간에는 기록이 없어요"만 뜨는,
// 로그인한 모든 사용자에게 조용히 고장나 있던 기능이었다. 이제 dataStore.js(게스트/로그인을 스스로
// 판단하는 추상 계층)를 거치므로, 그 판단을 모킹해 두 모드 모두 검증한다.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { exportCSV } from './csv.js'
import * as dataStore from './dataStore.js'

vi.mock('./dataStore.js', () => ({
  getMealsByDateRange: vi.fn(),
  getAllMealsByDate: vi.fn(),
}))

vi.mock('./fileExport.js', () => ({
  saveTextFile: vi.fn(async ({ content }) => ({ message: '저장했어요', share: null, content })),
  todayFileStamp: () => '2026-07-29',
}))

const MEAL_RECORD = {
  id: 'm1',
  mealType: 'lunch',
  createdAt: '2026-07-28T12:00:00.000Z',
  items: [{ name: '김치찌개', brand: null, nutrients: { calories: 500, protein: 20, carbs: 40, fat: 15, fiber: 3, sodium: 900 }, source: '추정' }],
}

describe('exportCSV — 로그인 계정도 실제 데이터로 내보내진다(회귀 테스트)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('로그인 계정 uid로 기간을 지정하면 dataStore.getMealsByDateRange(Supabase 경유)를 쓴다', async () => {
    dataStore.getMealsByDateRange.mockResolvedValue({ '2026-07-28': [MEAL_RECORD] })

    const result = await exportCSV('real-supabase-uid-1234', { startDate: '2026-07-01', endDate: '2026-07-31' })

    expect(dataStore.getMealsByDateRange).toHaveBeenCalledWith('2026-07-01', '2026-07-31')
    expect(dataStore.getAllMealsByDate).not.toHaveBeenCalled()
    expect(result).not.toBeNull()
    expect(result.dayCount).toBe(1)
  })

  it('실제로 기록이 있으면 예전처럼 null(빈 배열 취급)을 돌려주지 않는다', async () => {
    // 이게 바로 그 버그였다 — 로그인 계정은 실제 기록이 있어도 항상 빈 배열이 나와 null이 됐다.
    dataStore.getMealsByDateRange.mockResolvedValue({ '2026-07-15': [MEAL_RECORD] })
    const result = await exportCSV('real-supabase-uid-1234', { startDate: '2026-07-01', endDate: '2026-07-31' })
    expect(result).not.toBeNull()
  })

  it('진짜로 기록이 없는 기간이면 null을 돌려준다(파일을 만들지 않음)', async () => {
    dataStore.getMealsByDateRange.mockResolvedValue({})
    const result = await exportCSV('real-supabase-uid-1234', { startDate: '2026-07-01', endDate: '2026-07-31' })
    expect(result).toBeNull()
  })

  it('range를 안 주면 getAllMealsByDate(전체 기간)를 쓴다', async () => {
    dataStore.getAllMealsByDate.mockResolvedValue({ '2026-07-01': [MEAL_RECORD] })
    const result = await exportCSV('real-supabase-uid-1234')
    expect(dataStore.getAllMealsByDate).toHaveBeenCalled()
    expect(dataStore.getMealsByDateRange).not.toHaveBeenCalled()
    expect(result.dayCount).toBe(1)
  })

  it('게스트(GUEST_ID)도 여전히 동일하게 동작한다', async () => {
    dataStore.getMealsByDateRange.mockResolvedValue({ '2026-07-28': [MEAL_RECORD] })
    const result = await exportCSV('guest', { startDate: '2026-07-01', endDate: '2026-07-31' })
    expect(result.dayCount).toBe(1)
  })

  it('끼니가 있지만 items가 빈 배열인 날짜는 행에서 제외된다', async () => {
    dataStore.getMealsByDateRange.mockResolvedValue({
      '2026-07-28': [{ ...MEAL_RECORD, items: [] }],
    })
    const result = await exportCSV('u1', { startDate: '2026-07-01', endDate: '2026-07-31' })
    expect(result).toBeNull()
  })
})
