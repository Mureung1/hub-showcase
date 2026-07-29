import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import StatusCard from './StatusCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getUnlockedBadgeIds, getXpEarnedInRange } from '../lib/dataStore.js'
import { getLevelProgress, MAX_TOTAL_XP } from '../lib/levelSystem.js'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ getXpEarnedInRange: vi.fn(), getUnlockedBadgeIds: vi.fn() }))
vi.mock('../lib/xpLeaderboard.js', () => ({ getXpLeaderboard: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function board(weekly) {
  return { weekly, daily: [], dailyAllClear: false, weeklyAllClear: false }
}

// "다음 레벨까지 15 XP"의 숫자 부분만 <b>로 굵게 감싸(1a/2a 시안 — "숫자만 진하게") 텍스트가 여러
// 노드로 쪼개진다 — 화면에 보이는 문장 전체를 한 번에 매칭하려면 textContent를 직접 비교해야 한다.
function byTextContent(text) {
  return (_, element) => element?.textContent === text
}

function renderCard(props, { user = {}, rows = null } = {}) {
  useUser.mockReturnValue({ authMode: 'guest', effectiveUserId: 'guest', ...user })
  if (rows) getXpLeaderboard.mockResolvedValue(rows)
  return render(
    <MemoryRouter>
      <StatusCard {...props} />
    </MemoryRouter>,
  )
}

describe('StatusCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    getXpEarnedInRange.mockResolvedValue(35)
    getUnlockedBadgeIds.mockResolvedValue(['streak-3'])
  })

  it('levelProgress가 없으면 아무 것도 그리지 않는다', () => {
    const { container } = renderCard({}, { user: { levelProgress: null } })
    expect(container).toBeEmptyDOMElement()
  })

  it('레벨과 다음 레벨까지 남은 XP, id="my-level-pill"을 보여준다', () => {
    const { container } = renderCard({ questBoard: board([]) }, { user: { levelProgress: getLevelProgress(15) } })
    expect(screen.getByText('Lv.2')).toBeInTheDocument()
    expect(screen.getByText(byTextContent('다음 레벨까지 15 XP'))).toBeInTheDocument()
    expect(container.querySelector('#my-level-pill')).not.toBeNull()
  })

  it('만렙이면 전용 문구를 보여준다', () => {
    renderCard({ questBoard: board([]) }, { user: { levelProgress: getLevelProgress(MAX_TOTAL_XP) } })
    expect(screen.getByText('Lv.100')).toBeInTheDocument()
    expect(screen.getByText('만렙을 달성했어요!')).toBeInTheDocument()
  })

  it('오늘 획득 XP·주간 퀘스트 진행·배지 진행을 보여준다', async () => {
    renderCard(
      { questBoard: board([{ id: 'w1', claimed: true }, { id: 'w2', claimed: false }]) },
      { user: { levelProgress: getLevelProgress(0) } },
    )
    await waitFor(() => expect(screen.getByText('+35 XP')).toBeInTheDocument())
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('1 / 9')).toBeInTheDocument()
  })

  it('questBoard가 없으면 주간 퀘스트는 -로 표시한다(오늘 획득 XP·배지는 정상 로딩)', async () => {
    renderCard({ questBoard: null }, { user: { levelProgress: getLevelProgress(0) } })
    await waitFor(() => expect(screen.getByText('+35 XP')).toBeInTheDocument())
    expect(screen.getByText('1 / 9')).toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })

  it('로그인 계정이면 리더보드 순위 칩을 보여주고, 누르면 리더보드로 이동한다', async () => {
    renderCard(
      { questBoard: board([]) },
      { user: { levelProgress: getLevelProgress(0), authMode: 'user' }, rows: [{ rank: 23, isMe: true }, { rank: 1, isMe: false }] },
    )
    await waitFor(() => expect(screen.getByText('리더보드 23위')).toBeInTheDocument())
    fireEvent.click(screen.getByText('리더보드 23위'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/leaderboard')
  })

  it('게스트는 비교할 고정 신원이 없어 리더보드 순위 칩을 보여주지 않는다', () => {
    renderCard({ questBoard: board([]) }, { user: { levelProgress: getLevelProgress(0), authMode: 'guest' } })
    expect(screen.queryByText(/리더보드 \d+위/)).not.toBeInTheDocument()
    expect(getXpLeaderboard).not.toHaveBeenCalled()
  })

  it('주간 퀘스트/배지 통계를 누르면 각 화면으로 이동한다', async () => {
    renderCard({ questBoard: board([{ id: 'w1', claimed: true }]) }, { user: { levelProgress: getLevelProgress(0) } })
    await waitFor(() => expect(screen.getByText('+35 XP')).toBeInTheDocument())
    fireEvent.click(screen.getByText('주간 퀘스트'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/quests')
    fireEvent.click(screen.getByText('배지'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/badges')
  })
})
