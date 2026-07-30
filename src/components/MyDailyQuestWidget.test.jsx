import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyDailyQuestWidget from './MyDailyQuestWidget.jsx'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

function quest(overrides = {}) {
  return { id: 'q', title: '퀘스트', xp: 10, claimed: false, ...overrides }
}

function renderWidget(questBoard) {
  return render(
    <MemoryRouter>
      <MyDailyQuestWidget questBoard={questBoard} />
    </MemoryRouter>,
  )
}

describe('MyDailyQuestWidget', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it('완료 개수와 각 퀘스트 제목을 보여준다', () => {
    renderWidget({
      daily: [quest({ id: 'd1', title: '오늘 한 끼 기록', claimed: true }), quest({ id: 'd2', title: '단백질 80%' }), quest({ id: 'd3' })],
      dailyAllClear: false,
    })
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText('오늘 한 끼 기록')).toBeInTheDocument()
    expect(screen.getByText('단백질 80%')).toBeInTheDocument()
    expect(screen.getByText('진행 중')).toBeInTheDocument()
  })

  it('모두 완료했으면 획득 XP 합계를 보여준다', () => {
    renderWidget({
      daily: [quest({ id: 'd1', xp: 10, claimed: true }), quest({ id: 'd2', xp: 15, claimed: true })],
      dailyAllClear: true,
    })
    expect(screen.getByText('모두 완료 · +25XP')).toBeInTheDocument()
  })

  it('카드를 누르면 /profile/quests로 이동한다', () => {
    renderWidget({ daily: [quest()], dailyAllClear: false })
    fireEvent.click(screen.getByText('오늘의 퀘스트'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile/quests')
  })

  it('questBoard가 아직 없으면(로딩) 빈 상태로 렌더한다', () => {
    renderWidget(null)
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})
