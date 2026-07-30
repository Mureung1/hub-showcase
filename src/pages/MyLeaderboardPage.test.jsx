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

  // get_xp_leaderboard()는 SQL에서 `where total_xp > 0`으로 거른다 — 갓 가입해 XP가 0이면 **결과에
  // 본인이 아예 없다**(rows는 정상인데 isMe가 하나도 없음). 예전에는 이때 "내 순위" 카드와 "내 순위
  // 주변" 목록이 둘 다 조건에서 탈락해 **남의 포디움만 덩그러니** 남았고, 실제로 "리더보드가 제대로
  // 안 뜬다"로 신고됐다. 조회 실패와 구분되는 정상 상태이므로 그렇게 보여야 한다.
  it('XP가 0이라 순위에 없으면 그 사실과 다음 행동을 안내한다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(3, null)) // isMe가 하나도 없다
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('아직 순위에 없어요')).toBeInTheDocument()
    expect(screen.getByText(/퀘스트를 완료해 XP를 얻으면/)).toBeInTheDocument()
    // 남의 포디움은 그대로 보여야 한다 — 데이터는 정상이라 숨길 이유가 없다.
    expect(screen.getByText('👑')).toBeInTheDocument()
  })

  it('순위 없음 안내에서 퀘스트 화면으로 바로 갈 수 있다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(3, null))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByText('퀘스트 보러 가기'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/quests')
  })

  it('순위에 있으면 "아직 순위에 없어요"는 뜨지 않는다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockResolvedValue(rows(4, 4))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByText(/4위/).length).toBeGreaterThan(0))
    expect(screen.queryByText('아직 순위에 없어요')).not.toBeInTheDocument()
  })

  it('조회 실패는 "순위 없음"과 다른 상태다 — 오류와 재시도 수단을 보여준다', async () => {
    // 둘이 같은 화면으로 보이면 사용자는 앱이 고장난 건지 자기가 XP가 없는 건지 알 수 없다.
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockRejectedValue(new Error('JWT expired'))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText('JWT expired')).toBeInTheDocument()
    expect(screen.getByText('다시 시도')).toBeInTheDocument()
    expect(screen.queryByText('아직 순위에 없어요')).not.toBeInTheDocument()
  })

  it('다시 시도를 누르면 재조회한다', async () => {
    useUser.mockReturnValue({ authMode: 'user' })
    getXpLeaderboard.mockRejectedValueOnce(new Error('JWT expired')).mockResolvedValueOnce(rows(3, null))
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    fireEvent.click(await screen.findByText('다시 시도'))
    await waitFor(() => expect(getXpLeaderboard).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('아직 순위에 없어요')).toBeInTheDocument()
  })

  it('세션 복원 중에는 게스트 안내를 띄우지 않는다', () => {
    // authMode는 세션이 오기 전까지 'guest'다 — 로그인 사용자에게 "로그인하면…"이 잠깐 보였다.
    useUser.mockReturnValue({ authMode: 'guest', authLoading: true })
    render(
      <MemoryRouter>
        <MyLeaderboardPage />
      </MemoryRouter>,
    )
    expect(screen.queryByText(/로그인하면 다른 사용자와/)).not.toBeInTheDocument()
    expect(getXpLeaderboard).not.toHaveBeenCalled()
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
