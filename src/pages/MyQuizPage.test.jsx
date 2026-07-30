import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MyQuizPage from './MyQuizPage.jsx'
import { useUser } from '../context/UserContext.jsx'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { playConfetti } from '../lib/confetti.js'
import { pickTodayTrivia } from '../lib/nutritionTrivia.js'
import { getWeekQuizStreak } from '../lib/questWeekContext.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ claimQuest: vi.fn(), getClaimedQuestIds: vi.fn() }))
vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))
vi.mock('../lib/nutritionTrivia.js', () => ({ pickTodayTrivia: vi.fn() }))
vi.mock('../lib/questWeekContext.js', () => ({ getWeekQuizStreak: vi.fn() }))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

const TRIVIA = {
  id: 'vitc-1',
  question: '이 중 비타민C가 가장 많은 것은?',
  category: 'vitaminC',
  choices: ['레몬', '우유', '식초', '흰쌀밥'],
  correctIndex: 0,
}

const WEEK_STREAK = {
  streak: 5,
  days: [
    { dateKey: '2026-07-27', isFuture: false, success: true },
    { dateKey: '2026-07-28', isFuture: false, success: true },
    { dateKey: '2026-07-29', isFuture: false, success: true },
    { dateKey: '2026-07-30', isFuture: false, success: true },
    { dateKey: '2026-07-31', isFuture: false, success: true },
    { dateKey: '2026-08-01', isFuture: true, success: false },
    { dateKey: '2026-08-02', isFuture: true, success: false },
  ],
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyQuizPage />
    </MemoryRouter>,
  )
}

describe('MyQuizPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    useUser.mockReturnValue({ effectiveUserId: 'u1' })
    getClaimedQuestIds.mockResolvedValue([])
    claimQuest.mockResolvedValue({ totalXp: 100 })
    pickTodayTrivia.mockReturnValue(TRIVIA)
    getWeekQuizStreak.mockResolvedValue(WEEK_STREAK)
  })

  it('오늘 이미 완료했으면 완료 문구만 보여주고 시작 버튼을 그리지 않는다', async () => {
    getClaimedQuestIds.mockResolvedValue(['special-quiz'])
    renderPage()
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '퀴즈 시작' })).not.toBeInTheDocument()
  })

  it('아직 완료 전이면 시작 버튼만 보이고, 문제/타이머는 아직 없다', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: '퀴즈 시작' })).toBeInTheDocument())
    expect(pickTodayTrivia).not.toHaveBeenCalled()
    expect(screen.queryByText(TRIVIA.question)).not.toBeInTheDocument()
  })

  it('시작 버튼을 누르면 그때 문제를 고르고 4개의 보기를 렌더한다', async () => {
    renderPage()
    const startButton = await screen.findByRole('button', { name: '퀴즈 시작' })
    fireEvent.click(startButton)

    expect(pickTodayTrivia).toHaveBeenCalledWith(expect.any(Array), 'u1', expect.any(String))
    expect(screen.getByText(TRIVIA.question)).toBeInTheDocument()
    for (const choice of TRIVIA.choices) {
      expect(screen.getByRole('button', { name: choice })).toBeInTheDocument()
    }
  })

  it('정답을 고르면 퀘스트를 수령하고 컨페티를 재생한 뒤 완료 상태가 된다', async () => {
    renderPage()
    fireEvent.click(await screen.findByRole('button', { name: '퀴즈 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '레몬' }))

    await waitFor(() =>
      expect(claimQuest).toHaveBeenCalledWith({ dateKey: expect.any(String), questId: 'special-quiz', xpAwarded: 15 }),
    )
    expect(playConfetti).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument(), { timeout: 3000 })
  })

  it('이번 주 참여 요일별 점과 연속 일수를 보여준다', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('5일 연속')).toBeInTheDocument())
    expect(screen.getByText('이번 주 참여')).toBeInTheDocument()
    expect(screen.getAllByText('월')[0]).toBeInTheDocument()
  })

  it('뒤로가기를 누르면 /profile로 이동한다', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: '뒤로가기' })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '뒤로가기' }))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })
})
