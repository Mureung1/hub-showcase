import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useQuestBoard } from './useQuestBoard.js'
import { useUser } from '../context/UserContext.jsx'
import { getClaimedQuestIds, getMealsByDateRange } from './dataStore.js'
import { findNewlyCompletedAutoQuests, getQuestBoard, selectDailyQuests, selectWeeklyQuests } from './quests.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('./dataStore.js', () => ({ getClaimedQuestIds: vi.fn(), getMealsByDateRange: vi.fn() }))
vi.mock('./quests.js', () => ({
  buildItemFlags: vi.fn(() => ({})),
  buildWeeklyStats: vi.fn(() => ({})),
  COMBO_BUILDER_TRY_ID: 'feature-combo-builder',
  MAP_DUEL_TRY_ID: 'feature-map-duel',
  findNewlyCompletedAutoQuests: vi.fn(() => []),
  getQuestBoard: vi.fn(),
  selectDailyQuests: vi.fn(() => []),
  selectWeeklyQuests: vi.fn(() => []),
}))

function emptyBoard(overrides = {}) {
  return { daily: [], weekly: [], dailyAllClear: false, weeklyAllClear: false, ...overrides }
}

function mockUser(overrides = {}) {
  useUser.mockReturnValue({
    authLoading: false,
    effectiveUserId: 'u1',
    todayMeals: [],
    todayMealsTotal: {},
    effectiveRecommended: { protein: 60, sodium: 2000 },
    profile: { weightKg: 60, activity: 'moderate' },
    claimQuestsAndCelebrate: vi.fn().mockResolvedValue({ dailyClaimedIds: [], weeklyClaimedIds: [], totalXp: 100 }),
    ...overrides,
  })
}

// 리시드 버그(항목1) 회귀 테스트 — authLoading이 true인 동안은 아무 것도 계산하지 않아야, 게스트 시드로
// 계산된 로테이션이 세션 해결 직후 실제 uid 시드로 재계산되며 다른 3~5개 세트가 나오는 문제를 막는다.
describe('useQuestBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getMealsByDateRange.mockResolvedValue({})
    getClaimedQuestIds.mockResolvedValue([])
    getQuestBoard.mockReturnValue(emptyBoard())
  })

  it('authLoading이 true면 아무 것도 계산하지 않는다(리시드 버그 고침)', async () => {
    mockUser({ authLoading: true })
    const { result } = renderHook(() => useQuestBoard())

    expect(result.current.board).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(getMealsByDateRange).not.toHaveBeenCalled()
  })

  it('authLoading이 false가 되면 그때 한 번만 계산한다', async () => {
    mockUser({ authLoading: false })
    const { result } = renderHook(() => useQuestBoard())

    await waitFor(() => expect(result.current.board).not.toBeNull())
    expect(getMealsByDateRange).toHaveBeenCalledTimes(1)
  })

  it('autoClaim(기본값)이면 새로 완료된 퀘스트를 claimQuestsAndCelebrate로 넘긴다', async () => {
    findNewlyCompletedAutoQuests.mockReturnValue([{ id: 'first-meal-today', xp: 10, period: 'daily' }])
    const claimQuestsAndCelebrate = vi.fn().mockResolvedValue({ dailyClaimedIds: ['first-meal-today'], weeklyClaimedIds: [], totalXp: 110 })
    mockUser({ claimQuestsAndCelebrate })

    renderHook(() => useQuestBoard())

    await waitFor(() =>
      expect(claimQuestsAndCelebrate).toHaveBeenCalledWith(
        expect.objectContaining({ newlyCompleted: [{ id: 'first-meal-today', xp: 10, period: 'daily' }] }),
      ),
    )
    await waitFor(() =>
      expect(getQuestBoard).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ dailyClaimedIds: ['first-meal-today'] })),
    )
  })

  it('autoClaim: false면 완료된 퀘스트가 있어도 claimQuestsAndCelebrate를 부르지 않는다(홈 화면 카드용)', async () => {
    findNewlyCompletedAutoQuests.mockReturnValue([{ id: 'first-meal-today', xp: 10, period: 'daily' }])
    const claimQuestsAndCelebrate = vi.fn()
    mockUser({ claimQuestsAndCelebrate })

    const { result } = renderHook(() => useQuestBoard({ autoClaim: false }))

    await waitFor(() => expect(result.current.board).not.toBeNull())
    expect(claimQuestsAndCelebrate).not.toHaveBeenCalled()
  })

  it('dailyCount/weeklyCount를 selectDailyQuests/selectWeeklyQuests·getQuestBoard에 그대로 전달한다', async () => {
    mockUser()
    renderHook(() => useQuestBoard({ dailyCount: 3, weeklyCount: 5 }))

    await waitFor(() => expect(getQuestBoard).toHaveBeenCalled())
    expect(selectDailyQuests).toHaveBeenCalledWith(expect.any(String), 'u1', 3)
    expect(selectWeeklyQuests).toHaveBeenCalledWith(expect.any(String), 'u1', 5)
    expect(getQuestBoard).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ dailyCount: 3, weeklyCount: 5 }))
  })
})
