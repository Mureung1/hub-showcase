import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import QuizCard from './QuizCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { playConfetti } from '../lib/confetti.js'
import { pickTodayTrivia } from '../lib/nutritionTrivia.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ claimQuest: vi.fn(), getClaimedQuestIds: vi.fn() }))
vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))
vi.mock('../lib/nutritionTrivia.js', () => ({ pickTodayTrivia: vi.fn() }))

const TRIVIA = {
  id: 'vitc-1',
  question: '이 중 비타민C가 가장 많은 것은?',
  category: 'vitaminC',
  choices: ['레몬', '우유', '식초', '흰쌀밥'],
  correctIndex: 0,
}

describe('QuizCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUser.mockReturnValue({ effectiveUserId: 'u1' })
    getClaimedQuestIds.mockResolvedValue([])
    claimQuest.mockResolvedValue({ totalXp: 100 })
    pickTodayTrivia.mockReturnValue(TRIVIA)
  })

  it('오늘 이미 완료했으면 완료 문구만 보여주고 시작 버튼을 그리지 않는다', async () => {
    getClaimedQuestIds.mockResolvedValue(['special-quiz'])
    render(<QuizCard />)
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '퀴즈 시작' })).not.toBeInTheDocument()
  })

  it('아직 완료 전이면 시작 버튼만 보이고, 문제/타이머는 아직 없다(선-확인 후-시작)', async () => {
    render(<QuizCard />)
    await waitFor(() => expect(screen.getByRole('button', { name: '퀴즈 시작' })).toBeInTheDocument())
    expect(pickTodayTrivia).not.toHaveBeenCalled()
    expect(screen.queryByText(TRIVIA.question)).not.toBeInTheDocument()
  })

  it('시작 버튼을 누르면 그때 문제를 고르고 4개의 보기를 렌더한다', async () => {
    render(<QuizCard />)
    const startButton = await screen.findByRole('button', { name: '퀴즈 시작' })
    fireEvent.click(startButton)

    expect(pickTodayTrivia).toHaveBeenCalledWith(expect.any(Array), 'u1', expect.any(String))
    expect(screen.getByText(TRIVIA.question)).toBeInTheDocument()
    for (const choice of TRIVIA.choices) {
      expect(screen.getByRole('button', { name: choice })).toBeInTheDocument()
    }
  })

  it('정답을 고르면 퀘스트를 수령하고 컨페티를 재생한 뒤 완료 상태가 된다', async () => {
    render(<QuizCard />)
    fireEvent.click(await screen.findByRole('button', { name: '퀴즈 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '레몬' }))

    await waitFor(() =>
      expect(claimQuest).toHaveBeenCalledWith({ dateKey: expect.any(String), questId: 'special-quiz', xpAwarded: 15 }),
    )
    expect(playConfetti).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument(), { timeout: 3000 })
  })

  it('오답을 고르면 퀘스트를 수령하지 않고, 잠시 후 다시 도전할 수 있다', async () => {
    render(<QuizCard />)
    fireEvent.click(await screen.findByRole('button', { name: '퀴즈 시작' }))
    fireEvent.click(screen.getByRole('button', { name: '우유' }))

    expect(claimQuest).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('button', { name: '레몬' })).not.toBeDisabled(), { timeout: 3000 })
  })
})
