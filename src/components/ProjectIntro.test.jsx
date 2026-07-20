import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import ProjectIntro from './ProjectIntro'

const SAVED_STUDY_PLAN_ID = '123e4567-e89b-12d3-a456-426614174000'

const savedStudyPlan = {
  id: SAVED_STUDY_PLAN_ID,
  examType: 'TOEIC',
  isFirstAttempt: false,
  currentScore: '650',
  targetScore: '850',
  examDate: '2026-08-31',
  dailyStudyMinutes: 120,
  createdAt: '2026-07-20T00:00:00.000Z',
}

describe('ProjectIntro saved study plan restore', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('restores a saved study plan on first render when localStorage has a study plan id', async () => {
    localStorage.setItem('studyPlanId', SAVED_STUDY_PLAN_ID)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: savedStudyPlan }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/study-plans/${SAVED_STUDY_PLAN_ID}`)
    })

    expect(await screen.findByText('850')).toBeInTheDocument()
    expect(screen.getByText('650')).toBeInTheDocument()
    expect(screen.getByText(SAVED_STUDY_PLAN_ID)).toBeInTheDocument()
  })

  test('removes the saved id and shows a message when saved study plan lookup fails', async () => {
    localStorage.setItem('studyPlanId', SAVED_STUDY_PLAN_ID)
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: {
          code: 'STUDY_PLAN_NOT_FOUND',
          message: '저장된 학습 계획을 찾을 수 없습니다.',
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    expect(await screen.findByText('저장된 학습 계획을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })

  test('stores the created study plan id and completes the lookup after saving valid form values', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: SAVED_STUDY_PLAN_ID } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: savedStudyPlan }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await user.click(screen.getByRole('button', { name: '정보 입력' }))
    await user.type(screen.getByLabelText('현재 점수'), '650')
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await user.type(screen.getByLabelText('시험일'), '2026-08-31')
    await user.type(screen.getByLabelText('하루 가능 시간(분)'), '120')
    await user.click(screen.getByRole('button', { name: '저장하고 학습 계획 보기' }))

    await waitFor(() => {
      expect(localStorage.getItem('studyPlanId')).toBe(SAVED_STUDY_PLAN_ID)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/study-plans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        examType: 'TOEIC',
        isFirstAttempt: false,
        currentScore: '650',
        targetScore: '850',
        examDate: '2026-08-31',
        dailyStudyMinutes: 120,
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/study-plans/${SAVED_STUDY_PLAN_ID}`)
    expect(await screen.findByText(SAVED_STUDY_PLAN_ID)).toBeInTheDocument()
  })

  test('removes the created id and shows a message when the post-save lookup fails', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: SAVED_STUDY_PLAN_ID } }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: 'DATABASE_ERROR',
            message: '저장된 학습 계획을 다시 불러오지 못했습니다.',
          },
        }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await user.click(screen.getByRole('button', { name: '정보 입력' }))
    await user.type(screen.getByLabelText('현재 점수'), '650')
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await user.type(screen.getByLabelText('시험일'), '2026-08-31')
    await user.type(screen.getByLabelText('하루 가능 시간(분)'), '120')
    await user.click(screen.getByRole('button', { name: '저장하고 학습 계획 보기' }))

    expect(await screen.findByText('저장된 학습 계획을 다시 불러오지 못했습니다.')).toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })
})
