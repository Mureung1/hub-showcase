import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import QuizCard from './QuizCard.jsx'
import { useUser } from '../context/UserContext.jsx'
import { claimQuest, getClaimedQuestIds } from '../lib/dataStore.js'
import { playConfetti } from '../lib/confetti.js'
import { fetchCalorieNeighbors } from '../lib/quizApi.js'

vi.mock('../context/UserContext.jsx', () => ({ useUser: vi.fn() }))
vi.mock('../lib/dataStore.js', () => ({ claimQuest: vi.fn(), getClaimedQuestIds: vi.fn() }))
vi.mock('../lib/quizApi.js', () => ({ fetchCalorieNeighbors: vi.fn() }))
vi.mock('../lib/confetti.js', () => ({ playConfetti: vi.fn() }))

const QUIZ_DATA = {
  targetFood: '김치찌개',
  targetCalories: 400,
  neighbors: [{ name: '김치찌개', calories: 400 }],
  farOptions: [
    { name: '치킨', calories: 900 },
    { name: '삼겹살', calories: 850 },
    { name: '떡볶이', calories: 700 },
  ],
}

describe('QuizCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useUser.mockReturnValue({ effectiveUserId: 'u1' })
    getClaimedQuestIds.mockResolvedValue([])
    claimQuest.mockResolvedValue({ totalXp: 100 })
    fetchCalorieNeighbors.mockResolvedValue(QUIZ_DATA)
  })

  it('오늘 이미 완료했으면 완료 문구만 보여주고 문제를 새로 불러오지 않는다', async () => {
    getClaimedQuestIds.mockResolvedValue(['special-quiz'])
    render(<QuizCard />)
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument())
    expect(fetchCalorieNeighbors).not.toHaveBeenCalled()
  })

  it('문제와 4개의 보기를 렌더한다', async () => {
    render(<QuizCard />)
    await waitFor(() => expect(screen.getByText(/1인분과 칼로리가 비슷한 음식은\?/)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '김치찌개' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '치킨' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '삼겹살' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '떡볶이' })).toBeInTheDocument()
  })

  it('정답을 고르면 퀘스트를 수령하고 컨페티를 재생한 뒤 완료 상태가 된다', async () => {
    render(<QuizCard />)
    const correctButton = await screen.findByRole('button', { name: '김치찌개' })
    correctButton.click()

    await waitFor(() =>
      expect(claimQuest).toHaveBeenCalledWith({ dateKey: expect.any(String), questId: 'special-quiz', xpAwarded: 15 }),
    )
    expect(playConfetti).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.getByText(/오늘의 퀴즈를 완료했어요/)).toBeInTheDocument(), { timeout: 3000 })
  })

  it('오답을 고르면 퀘스트를 수령하지 않고, 잠시 후 다시 도전할 수 있다', async () => {
    render(<QuizCard />)
    const wrongButton = await screen.findByRole('button', { name: '치킨' })
    wrongButton.click()

    expect(claimQuest).not.toHaveBeenCalled()
    await waitFor(
      () => expect(screen.getByRole('button', { name: '김치찌개' })).not.toBeDisabled(),
      { timeout: 3000 },
    )
  })

  it('음식 정보를 못 찾으면 아무것도 렌더하지 않는다', async () => {
    fetchCalorieNeighbors.mockResolvedValue(null)
    const { container } = render(<QuizCard />)
    await waitFor(() => expect(container).toBeEmptyDOMElement())
  })
})
