import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyLeaderboardPage from './MyLeaderboardPage.jsx'
import { useUser } from '../context/UserContext.jsx'
import { getXpLeaderboard } from '../lib/xpLeaderboard.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/xpLeaderboard.js', () => ({ getXpLeaderboard: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function rows(n, meRank) {
  return Array.from({ length: n }, (_, i) => ({
    rank: i + 1,
    nickname: `유저${i + 1}`,
    totalXp: (n - i) * 10,
    level: 3,
    isMe: i + 1 === meRank,
  }))
}

describe('MyLeaderboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  it('게스트면 로그인 유도 문구만 보여주고 리더보드를 불러오지 않는다', () => {
    useUser.mockReturnValue({ authMode: 'guest' })
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/로그인하면 다른 사용자와/)).toBeInTheDocument()
    expect(getXpLeaderboard).not.toHaveBeenCalled()
  })

  it('내 순위·레벨·상위 %를 보여준다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(30, 23))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByText(/내 순위/).length).toBeGreaterThan(0))
    expect(screen.getAllByText(/23위/).length).toBeGreaterThan(0)
    expect(screen.getByText(/상위 77%/)).toBeInTheDocument() // round(23/30*100)
  })

  it('상위 3명은 포디움으로, 내 순위 주변(21~25위)만 목록으로 보여준다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(30, 23))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('👑')).toBeInTheDocument())
    expect(screen.getByText('내 순위 주변')).toBeInTheDocument()
    // 23위(나)는 "내 순위" 요약 카드에도 한 번 더 나오므로 getAllByText로 확인한다.
    for (const rank of [21, 22, 23, 24, 25]) {
      expect(screen.getAllByText(`${rank}위`).length).toBeGreaterThan(0)
    }
    expect(screen.queryByText('10위')).not.toBeInTheDocument()
    expect(screen.queryByText('26위')).not.toBeInTheDocument()
  })

  it('3명 미만이면 포디움 없이 전체를 나열한다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(2, 1))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('유저1 (나)')).toBeInTheDocument())
    expect(screen.queryByText('👑')).not.toBeInTheDocument()
    expect(screen.getByText('유저2')).toBeInTheDocument()
  })

  it('불러오기 실패 시 에러 문구를 보여준다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockRejectedValue(new Error('네트워크 오류'))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('네트워크 오류')).toBeInTheDocument())
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    useUser.mockReturnValue({ authMode: 'guest' })
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
