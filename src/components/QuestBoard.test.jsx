import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QuestBoard from './QuestBoard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { claimQuest, getClaimedQuestIds, getMealsByDateRange } from '../lib/dataStore.js'
import { findNewlyCompletedAutoQuests, getQuestBoard, resolveAllClearBonuses } from '../lib/quests.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({
  claimQuest: vi.fn(),
  getClaimedQuestIds: vi.fn(),
  getMealsByDateRange: vi.fn(),
}))
vi.mock('../lib/quests.js', () => ({
  buildItemFlags: vi.fn(() => ({})),
  buildWeeklyStats: vi.fn(() => ({})),
  findNewlyCompletedAutoQuests: vi.fn(() => []),
  getQuestBoard: vi.fn(),
  resolveAllClearBonuses: vi.fn(() => []),
  selectDailyQuests: vi.fn(() => []),
  selectWeeklyQuests: vi.fn(() => []),
}))

function quest(overrides = {}) {
  return { id: 'q', title: '퀘스트', description: '설명', xp: 10, completed: false, claimed: false, ...overrides }
}

function emptyBoard(overrides = {}) {
  return { daily: [], weekly: [], dailyAllClear: false, weeklyAllClear: false, ...overrides }
}

describe('QuestBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    useUser.mockReturnValue({
      effectiveUserId: 'u1',
      todayMeals: [],
      todayMealsTotal: {},
      effectiveRecommended: { protein: 60, sodium: 2000 },
      profile: { weightKg: 60, activity: 'moderate' },
    })
    getMealsByDateRange.mockResolvedValue({})
    getClaimedQuestIds.mockResolvedValue([])
    claimQuest.mockResolvedValue({ totalXp: 100 })
    getQuestBoard.mockReturnValue(emptyBoard())
    findNewlyCompletedAutoQuests.mockReturnValue([])
    resolveAllClearBonuses.mockReturnValue([])
  })

  it('오늘/이번 주 퀘스트 섹션과 각 항목을 렌더한다', async () => {
    getQuestBoard.mockReturnValue(
      emptyBoard({
        daily: [quest({ id: 'd1', title: '오늘 한 끼 기록', claimed: true }), quest({ id: 'd2' }), quest({ id: 'd3' })],
        weekly: [quest({ id: 'w1' }), quest({ id: 'w2' }), quest({ id: 'w3' })],
      }),
    )
    render(<QuestBoard />)

    await waitFor(() => expect(screen.getByText('오늘의 퀘스트')).toBeInTheDocument())
    expect(screen.getByText('이번 주 퀘스트')).toBeInTheDocument()
    expect(screen.getByText('오늘 한 끼 기록')).toBeInTheDocument()
    expect(screen.getAllByText('완료 ✓')).toHaveLength(1)
    expect(screen.getAllByText('진행 중')).toHaveLength(5)
  })

  it('dailyAllClear/weeklyAllClear이면 각각의 배너 문구를 보여준다', async () => {
    getQuestBoard.mockReturnValue(emptyBoard({ dailyAllClear: true, weeklyAllClear: true }))
    render(<QuestBoard />)

    await waitFor(() => expect(screen.getByText(/오늘의 퀘스트를 모두 완료했어요/)).toBeInTheDocument())
    expect(screen.getByText(/이번 주 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
  })

  it('마운트 시 새로 완료된 퀘스트를 조용히 수령한다', async () => {
    findNewlyCompletedAutoQuests.mockReturnValue([{ id: 'first-meal-today', xp: 10, period: 'daily' }])
    render(<QuestBoard />)

    await waitFor(() =>
      expect(claimQuest).toHaveBeenCalledWith(expect.objectContaining({ questId: 'first-meal-today', xpAwarded: 10 })),
    )
  })

  it('일간/주간 로테이션을 전부 수령하면 올클리어 보너스도 함께 수령한다', async () => {
    resolveAllClearBonuses.mockReturnValue([{ id: 'daily-all-clear', xp: 10, period: 'daily' }])
    render(<QuestBoard />)

    await waitFor(() =>
      expect(claimQuest).toHaveBeenCalledWith(expect.objectContaining({ questId: 'daily-all-clear', xpAwarded: 10 })),
    )
  })

  it('완료된 퀘스트가 없으면 claimQuest를 호출하지 않는다', async () => {
    render(<QuestBoard />)
    await waitFor(() => expect(screen.queryByText('오늘의 퀘스트')).toBeInTheDocument())
    expect(claimQuest).not.toHaveBeenCalled()
  })
})
