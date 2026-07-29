import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import QuestBoard from './QuestBoard.jsx'
import { useQuestBoard } from '../lib/useQuestBoard.js'

// QuestBoard.jsx는 리텐션 강화 v4부터 조회+자동클레임 로직을 전부 useQuestBoard.js(HomeQuestCard.jsx와
// 공유)로 옮기고 순수 프레젠테이션만 남았다 — 그 훅 자체의 동작(authLoading 게이팅, 자동클레임 등)은
// useQuestBoard.test.jsx가 검증하므로, 여기서는 훅을 모킹해 렌더 결과만 확인한다.
vi.mock('../lib/useQuestBoard.js', () => ({ useQuestBoard: vi.fn() }))

function quest(overrides = {}) {
  return { id: 'q', title: '퀘스트', description: '설명', xp: 10, completed: false, claimed: false, ...overrides }
}

function board(overrides = {}) {
  return { daily: [], weekly: [], dailyAllClear: false, weeklyAllClear: false, ...overrides }
}

describe('QuestBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('board가 없으면(로딩 중) 아무 것도 그리지 않는다', () => {
    useQuestBoard.mockReturnValue({ board: null, refresh: vi.fn(), loading: true })
    const { container } = render(<QuestBoard />)
    expect(container).toBeEmptyDOMElement()
  })

  it('오늘/이번 주 퀘스트 섹션과 각 항목을 렌더한다', () => {
    useQuestBoard.mockReturnValue({
      board: board({
        daily: [quest({ id: 'd1', title: '오늘 한 끼 기록', claimed: true }), quest({ id: 'd2' }), quest({ id: 'd3' })],
        weekly: [quest({ id: 'w1' }), quest({ id: 'w2' }), quest({ id: 'w3' }), quest({ id: 'w4' }), quest({ id: 'w5' })],
      }),
      refresh: vi.fn(),
      loading: false,
    })
    render(<QuestBoard />)

    expect(screen.getByText('오늘의 퀘스트')).toBeInTheDocument()
    expect(screen.getByText('이번 주 퀘스트')).toBeInTheDocument()
    expect(screen.getByText('오늘 한 끼 기록')).toBeInTheDocument()
    expect(screen.getAllByText('완료 ✓')).toHaveLength(1)
    expect(screen.getAllByText('진행 중')).toHaveLength(7)
  })

  it('dailyAllClear/weeklyAllClear이면 각각의 배너 문구를 보여준다', () => {
    useQuestBoard.mockReturnValue({
      board: board({ dailyAllClear: true, weeklyAllClear: true }),
      refresh: vi.fn(),
      loading: false,
    })
    render(<QuestBoard />)

    expect(screen.getByText(/오늘의 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
    expect(screen.getByText(/이번 주 퀘스트를 모두 완료했어요/)).toBeInTheDocument()
  })

  it('weeklyCount:5로 훅을 호출한다', () => {
    useQuestBoard.mockReturnValue({ board: board(), refresh: vi.fn(), loading: false })
    render(<QuestBoard />)
    expect(useQuestBoard).toHaveBeenCalledWith({ weeklyCount: 5 })
  })
})
