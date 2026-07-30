import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import HomeQuestCard from './HomeQuestCard.jsx'
import { useQuestBoard } from '../lib/useQuestBoard.js'

vi.mock('../lib/useQuestBoard.js', () => ({ useQuestBoard: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function quest(overrides = {}) {
  return { id: 'q', title: '퀘스트', description: '설명', xp: 10, completed: false, claimed: false, ...overrides }
}

function board(overrides = {}) {
  return { daily: [], dailyAllClear: false, ...overrides }
}

describe('HomeQuestCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('조회에 실패하면 조용히 아무 것도 그리지 않는다(장식용 위젯이라 에러 카드나 영구 스켈레톤을 안 띄움)', () => {
    useQuestBoard.mockReturnValue({ board: null, loading: true, error: true })
    const { container } = render(<HomeQuestCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('로딩 중이면 스켈레톤만 보인다', () => {
    useQuestBoard.mockReturnValue({ board: null, loading: true })
    render(<HomeQuestCard />)
    expect(screen.queryByText('오늘의 퀘스트')).not.toBeInTheDocument()
  })

  it('오늘의 퀘스트가 하나도 없으면 아무 것도 그리지 않는다', () => {
    useQuestBoard.mockReturnValue({ board: { daily: [] }, loading: false })
    const { container } = render(<HomeQuestCard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('MY 탭과 같은 3개 중 첫 번째 퀘스트를 보여주고, autoClaim:false로 조회한다', () => {
    useQuestBoard.mockReturnValue({
      board: { daily: [quest({ id: 'd1', title: '오늘 한 끼 기록' }), quest({ id: 'd2', title: '두 번째' }), quest({ id: 'd3', title: '세 번째' })] },
      loading: false,
    })
    render(<HomeQuestCard />)

    expect(screen.getByText('오늘 한 끼 기록')).toBeInTheDocument()
    expect(useQuestBoard).toHaveBeenCalledWith({ autoClaim: false })
  })

  it('10초마다 다음 퀘스트로 순환한다', () => {
    useQuestBoard.mockReturnValue({
      board: { daily: [quest({ id: 'd1', title: '첫 번째' }), quest({ id: 'd2', title: '두 번째' }), quest({ id: 'd3', title: '세 번째' })] },
      loading: false,
    })
    render(<HomeQuestCard />)
    expect(screen.getByText('첫 번째')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('두 번째')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('세 번째')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('첫 번째')).toBeInTheDocument()
  })

  it('완료(수령)한 퀘스트는 로테이션에서 사라지고, 남은 미완료 퀘스트만 순환한다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        daily: [
          quest({ id: 'd1', title: '완료된 것', claimed: true }),
          quest({ id: 'd2', title: '남은 것 A' }),
          quest({ id: 'd3', title: '남은 것 B' }),
        ],
      }),
      loading: false,
    })
    render(<HomeQuestCard />)

    expect(screen.queryByText('완료된 것')).not.toBeInTheDocument()
    expect(screen.getByText('남은 것 A')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('남은 것 B')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(10000))
    expect(screen.getByText('남은 것 A')).toBeInTheDocument()
  })

  it('일간 퀘스트를 모두 완료하면 순환 대신 획득 XP 합계가 붙은 배너를 보여준다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        daily: [
          quest({ id: 'd1', xp: 10, claimed: true }),
          quest({ id: 'd2', xp: 15, claimed: true }),
          quest({ id: 'd3', xp: 20, claimed: true }),
        ],
        dailyAllClear: true,
      }),
      loading: false,
    })
    render(<HomeQuestCard />)
    expect(screen.getByText(/오늘의 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
    expect(screen.getByText('+45XP ›')).toBeInTheDocument()
  })

  it('모두 완료 배너를 누르면 /profile/quests로 이동한다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        daily: [quest({ id: 'd1', xp: 10, claimed: true })],
        dailyAllClear: true,
      }),
      loading: false,
    })
    render(<HomeQuestCard />)
    fireEvent.click(screen.getByText(/오늘의 퀘스트를 모두 완료했어요/))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/quests')
  })
})
