import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import LeaderboardSummaryCard from './LeaderboardSummaryCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/xpLeaderboard.js', () => ({ getXpLeaderboard: vi.fn() }))

describe('LeaderboardSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('게스트는 로그인 유도 문구만 보여준다(조회하지 않음)', async () => {
    useUser.mockReturnValue({ authMode: 'guest' })
    render(<LeaderboardSummaryCard />)
    expect(screen.getByText(/로그인하면 다른 사용자와/)).toBeInTheDocument()
    expect(getXpLeaderboard).not.toHaveBeenCalled()
  })

  it('로그인 사용자는 내 순위 요약을 보여준다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue([
      { rank: 5, nickname: '나', totalXp: 150, level: 5, isMe: true },
      { rank: 1, nickname: '단짠주의보', totalXp: 3200, level: 25, isMe: false },
    ])
    render(<LeaderboardSummaryCard />)
    await waitFor(() => expect(screen.getByText(/내 순위/)).toBeInTheDocument())
    expect(screen.getByText(/5위/)).toBeInTheDocument()
    expect(screen.getByText(/Lv\.5/)).toBeInTheDocument()
  })

  it('카드를 누르면 전체 리더보드 모달이 열린다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue([{ rank: 1, nickname: '단짠주의보', totalXp: 3200, level: 25, isMe: false }])
    render(<LeaderboardSummaryCard />)
    await waitFor(() => expect(screen.getByRole('button')).not.toBeDisabled())

    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('오류가 나면 에러 문구를 보여준다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockRejectedValue(new Error('네트워크 오류'))
    render(<LeaderboardSummaryCard />)
    await waitFor(() => expect(screen.getByText('네트워크 오류')).toBeInTheDocument())
  })
})
