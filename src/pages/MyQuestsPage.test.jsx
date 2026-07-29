import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyQuestsPage from './MyQuestsPage.jsx'
import { useUser } from '../context/UserContext.jsx'
import { useQuestBoard } from '../lib/useQuestBoard.js'
import { getXpEarnedInRange } from '../lib/dataStore.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/useQuestBoard.js', () => ({ useQuestBoard: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ getXpEarnedInRange: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function quest(overrides = {}) {
  return { id: 'q', title: '퀘스트', description: '설명', xp: 10, completed: false, claimed: false, ...overrides }
}

function board(overrides = {}) {
  return { daily: [], weekly: [], dailyAllClear: false, weeklyAllClear: false, ...overrides }
}

describe('MyQuestsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    useUser.mockReturnValue({ levelProgress: { level: 3, xpIntoLevel: 5, xpForNextLevel: 40, isMaxLevel: false } })
    useQuestBoard.mockReturnValue({ board: board() })
    getXpEarnedInRange.mockResolvedValue(150)
  })

  it('뒤로가기를 누르면 /profile로 이동한다', () => {
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('이번 주 획득 XP와 다음 레벨까지 남은 XP를 보여준다', async () => {
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('150 XP')).toBeInTheDocument())
    expect(screen.getByText('35 XP')).toBeInTheDocument() // 40-5
  })

  it('오늘의 퀘스트/이번 주 퀘스트 섹션과 항목을 렌더한다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        daily: [quest({ id: 'd1', title: '오늘 한 끼 기록', claimed: true }), quest({ id: 'd2' }), quest({ id: 'd3' })],
        weekly: [quest({ id: 'w1', title: '물 목표 3일', progress: { current: 1, target: 3 } })],
      }),
    })
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('오늘의 퀘스트')).toBeInTheDocument()
    expect(screen.getByText('이번 주 퀘스트')).toBeInTheDocument()
    expect(screen.getByText('오늘 한 끼 기록')).toBeInTheDocument()
    expect(screen.getByText('완료 ✓')).toBeInTheDocument()
    expect(screen.getAllByText('진행 중')).toHaveLength(2) // d2, d3
  })

  it('진행 중인 주간 퀘스트는 완료✓/진행중 대신 진행률(current/target)을 보여준다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        weekly: [quest({ id: 'w1', title: '물 목표 3일', progress: { current: 1, target: 3 } })],
      }),
    })
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.queryByText('진행 중')).not.toBeInTheDocument()
  })

  it('조회에 실패하면 재시도 버튼을 보여주고, 누르면 refresh를 다시 부른다', () => {
    const refresh = vi.fn()
    useQuestBoard.mockReturnValue({ board: null, error: true, refresh })
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText('퀘스트를 불러오지 못했어요.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('다시 시도'))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('dailyAllClear/weeklyAllClear이면 각각의 배너 문구를 보여준다', () => {
    useQuestBoard.mockReturnValue({ board: board({ dailyAllClear: true, weeklyAllClear: true }) })
    render(
      <MemoryRouter>
        <MyQuestsPage />
      </MemoryRouter>,
    )
    expect(screen.getByText(/오늘의 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
    expect(screen.getByText(/이번 주 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
  })
})
