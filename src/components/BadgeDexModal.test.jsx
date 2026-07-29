import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import BadgeDexModal from './BadgeDexModal.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getLevelState, getMealsByDateRange, getQuestClaimStats, getUnlockedBadgeIds, unlockBadge } from '../lib/dataStore.js'
import { playConfetti } from '../lib/confetti.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({
  getMealsByDateRange: vi.fn(),
  getLevelState: vi.fn(),
  getQuestClaimStats: vi.fn(),
  getUnlockedBadgeIds: vi.fn(),
  unlockBadge: vi.fn(),
}))
vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))

function mockDefaults() {
  getMealsByDateRange.mockResolvedValue({})
  getLevelState.mockResolvedValue({ totalXp: 0 })
  getQuestClaimStats.mockResolvedValue({ totalCount: 0, countsByQuestId: {} })
  getUnlockedBadgeIds.mockResolvedValue([])
  unlockBadge.mockImplementation((badgeId) => Promise.resolve({ alreadyUnlocked: false, unlockedIds: [badgeId] }))
}

describe('BadgeDexModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUser.mockReturnValue({ effectiveUserId: 'guest' })
    mockDefaults()
  })

  it('다이얼로그로 렌더되고 뱃지 9개가 모두 보인다', async () => {
    render(<BadgeDexModal onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: '배지 도감' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('꾸준한 시작')).toBeInTheDocument())
    expect(screen.getByText('만렙 달성')).toBeInTheDocument()
  })

  it('조건을 만족하지 않은 뱃지는 잠금 상태로 남는다(자동 잠금해제 없음)', async () => {
    render(<BadgeDexModal onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('꾸준한 시작')).toBeInTheDocument())
    expect(unlockBadge).not.toHaveBeenCalled()
    expect(playConfetti).not.toHaveBeenCalled()
  })

  it('마운트 시 새로 조건을 만족한 뱃지는 잠금해제 + 컨페티를 트리거한다', async () => {
    getMealsByDateRange.mockResolvedValue({ '2026-07-29': [{ id: 'm1' }], '2026-07-28': [{ id: 'm2' }], '2026-07-27': [{ id: 'm3' }] })
    render(<BadgeDexModal onClose={() => {}} />)

    await waitFor(() => expect(unlockBadge).toHaveBeenCalledWith('streak-3'))
    expect(playConfetti).toHaveBeenCalledTimes(1)
  })

  it('이미 잠금해제된 뱃지는 다시 지급하지 않는다', async () => {
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
    getMealsByDateRange.mockResolvedValue({ '2026-07-29': [{ id: 'm1' }], '2026-07-28': [{ id: 'm2' }], '2026-07-27': [{ id: 'm3' }] })
    render(<BadgeDexModal onClose={() => {}} />)

    await waitFor(() => expect(screen.getByText('꾸준한 시작')).toBeInTheDocument())
    expect(unlockBadge).not.toHaveBeenCalled()
  })

  it('닫기를 누르면 최신 unlocked id 목록과 함께 onClose가 호출된다', async () => {
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
    const onClose = vi.fn()
    render(<BadgeDexModal onClose={onClose} />)
    await waitFor(() => expect(screen.getByText('꾸준한 시작')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalledWith(['streak-3'])
  })

  it('Escape로 닫으면 onClose가 호출된다', async () => {
    const onClose = vi.fn()
    render(<BadgeDexModal onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})
