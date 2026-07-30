import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyBadgesPage from './MyBadgesPage.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getLevelState, getMealsByDateRange, getQuestClaimStats, getUnlockedBadgeIds, unlockBadge } from '../lib/dataStore.js'
import { playConfetti } from '../lib/confetti.js'
import { toDateKey } from '../lib/records.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({
  getMealsByDateRange: vi.fn(),
  getLevelState: vi.fn(),
  getQuestClaimStats: vi.fn(),
  getUnlockedBadgeIds: vi.fn(),
  unlockBadge: vi.fn(),
}))
vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function mockDefaults() {
  getMealsByDateRange.mockResolvedValue({})
  getLevelState.mockResolvedValue({ totalXp: 0 })
  getQuestClaimStats.mockResolvedValue({ totalCount: 0, countsByQuestId: {} })
  getUnlockedBadgeIds.mockResolvedValue([])
  unlockBadge.mockImplementation((badgeId) => Promise.resolve({ alreadyUnlocked: false, unlockedIds: [badgeId] }))
}

// 연속 기록(calcStreak)은 **오늘부터 거꾸로** 센다 — 날짜를 고정해 적어두면 하루만 지나도 그 날짜가
// 더 이상 "어제·그저께"가 아니게 되어 테스트가 저절로 깨진다(실제로 '2026-07-29/28/27'로 박아둔
// 탓에 날이 바뀌며 깨졌다). 컴포넌트와 같은 toDateKey를 써서 항상 오늘 기준 상대 날짜를 만든다.
function dateKeyDaysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toDateKey(d)
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyBadgesPage />
    </MemoryRouter>,
  )
}

describe('MyBadgesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    mockDefaults()
  })

  it('뱃지 9개가 모두 보이고 획득 개수 요약을 보여준다', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('꾸준한 시작')).toBeInTheDocument())
    expect(screen.getByText('만렙 달성')).toBeInTheDocument()
    expect(screen.getByText('획득 배지 0/9개')).toBeInTheDocument()
  })

  it('마운트 시 새로 조건을 만족한 뱃지는 잠금해제 + 컨페티를 트리거한다', async () => {
    // 어제·그저께·그끄저께 3일 연속 — 오늘은 아직 기록 전인 상태(streak.js가 어제부터 세는 분기)
    getMealsByDateRange.mockResolvedValue({
      [dateKeyDaysAgo(1)]: [{ id: 'm1' }],
      [dateKeyDaysAgo(2)]: [{ id: 'm2' }],
      [dateKeyDaysAgo(3)]: [{ id: 'm3' }],
    })
    renderPage()

    await waitFor(() => expect(unlockBadge).toHaveBeenCalledWith('streak-3'))
    expect(playConfetti).toHaveBeenCalledTimes(1)
  })

  it('잠긴 뱃지는 진행률(current/target)을 보여준다', async () => {
    getQuestClaimStats.mockResolvedValue({ totalCount: 25, countsByQuestId: {} })
    renderPage()
    await waitFor(() => expect(screen.getByText('25/50')).toBeInTheDocument()) // quest-50
  })

  it('해제된 뱃지는 진행률 대신 설명을 보여준다', async () => {
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
    renderPage()
    await waitFor(() => expect(screen.getByText('3일 연속으로 식사를 기록했어요.')).toBeInTheDocument())
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    renderPage()
    screen.getByRole('button', { name: '뒤로가기' }).click()
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
