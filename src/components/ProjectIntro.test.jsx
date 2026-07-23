import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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

function jsonResponse(body, ok = true) {
  return {
    ok,
    text: async () => JSON.stringify(body),
  }
}

function textResponse(body, ok = true) {
  return {
    ok,
    text: async () => body,
  }
}

async function goToInfo(user) {
  await user.click(screen.getByRole('button', { name: '정보 입력' }))
}

async function goToExam(user, examName) {
  await user.click(screen.getByRole('button', { name: '시험 선택' }))
  await user.click(screen.getByRole('button', { name: new RegExp(examName) }))
  await goToInfo(user)
}

async function fillCommonFields(user) {
  await user.type(screen.getByLabelText('시험일'), '2026-08-31')
  await user.type(screen.getByLabelText('하루 공부 시간(분)'), '120')
}

async function saveForm(user) {
  await user.click(screen.getByRole('button', { name: '저장하고 학습 계획 보기' }))
}

function mockSuccessfulSave(fetchMock, planOverrides = {}) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ data: { id: SAVED_STUDY_PLAN_ID } }))
    .mockResolvedValueOnce(jsonResponse({ data: { ...savedStudyPlan, ...planOverrides } }))
}

async function openExamSelection(user) {
  const menuList = document.querySelector('.menu-list')
  const examMenuButton = within(menuList).getAllByRole('button')[1]
  await user.click(examMenuButton)
}

function getToeicExamCard() {
  return screen
    .getAllByRole('button')
    .find((button) => within(button).queryByRole('heading', { name: 'TOEIC' }))
}

describe('ProjectIntro exam selection next action', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('moves to the service introduction screen after the previous button is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    await user.click(screen.getByRole('button', { name: '이전' }))

    expect(screen.getByText('STEP 1/5')).toBeInTheDocument()
    expect(document.querySelector('.feature-section')).toBeInTheDocument()
    expect(document.querySelector('.exam-section')).not.toBeInTheDocument()
  })

  test('disables the next button before an exam is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  test('enables the next button after TOEIC is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())

    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled()
  })

  test('stays on the exam selection screen immediately after TOEIC is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())

    expect(document.querySelector('.exam-section')).toBeInTheDocument()
    expect(document.querySelector('.form-section')).not.toBeInTheDocument()
  })

  test('marks the selected TOEIC card as selected for assistive technology', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    const toeicCard = getToeicExamCard()

    await user.click(toeicCard)

    expect(toeicCard).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows a check mark on the selected TOEIC card', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    const toeicCard = getToeicExamCard()

    await user.click(toeicCard)

    expect(within(toeicCard).getByText('✓')).toBeInTheDocument()
  })

  test('moves to the information input screen after the next button is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('STEP 3/5')).toBeInTheDocument()
    expect(document.querySelector('.form-section')).toBeInTheDocument()
    expect(document.querySelector('.exam-section')).not.toBeInTheDocument()
  })
})

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
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: savedStudyPlan }))
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
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: 'STUDY_PLAN_NOT_FOUND',
            message: '저장된 학습 계획을 찾을 수 없습니다.',
          },
        },
        false,
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    expect(await screen.findByText('저장된 학습 계획을 찾을 수 없습니다.')).toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })

  test('stores the created study plan id and completes the lookup after saving valid TOEIC form values', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('현재 점수'), '650')
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(localStorage.getItem('studyPlanId')).toBe(SAVED_STUDY_PLAN_ID)
    })

    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/study-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      .mockResolvedValueOnce(jsonResponse({ data: { id: SAVED_STUDY_PLAN_ID } }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: {
              code: 'DATABASE_ERROR',
              message: '저장된 학습 계획을 다시 불러오지 못했습니다.',
            },
          },
          false,
        ),
      )
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('현재 점수'), '650')
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('저장된 학습 계획을 다시 불러오지 못했습니다.')).toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })

  test('allows selecting multiple weak areas and toggling a selected area off', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await user.click(screen.getByRole('button', { name: '취약 영역 진단' }))

    const lcButton = screen.getByRole('button', { name: /LC/ })
    const rcButton = screen.getByRole('button', { name: /RC/ })

    expect(lcButton).toHaveAttribute('aria-pressed', 'false')
    expect(rcButton).toHaveAttribute('aria-pressed', 'false')

    await user.click(lcButton)
    await user.click(rcButton)

    expect(lcButton).toHaveAttribute('aria-pressed', 'true')
    expect(lcButton).toHaveClass('weak-card-active')
    expect(rcButton).toHaveAttribute('aria-pressed', 'true')
    expect(rcButton).toHaveClass('weak-card-active')

    await user.click(lcButton)

    expect(lcButton).toHaveAttribute('aria-pressed', 'false')
    expect(lcButton).not.toHaveClass('weak-card-active')
    expect(rcButton).toHaveAttribute('aria-pressed', 'true')
  })

  test('shows weak areas for the selected exam only', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /TOEFL/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역 진단' }))

    expect(screen.getByRole('button', { name: /Reading/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Listening/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Speaking/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Writing/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /LC/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /OPIc/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역 진단' }))

    expect(screen.getByRole('button', { name: /묘사 문항/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /일상 경험 설명/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reading/ })).not.toBeInTheDocument()
  })

  test('resets selected weak areas after changing the selected exam', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await user.click(screen.getByRole('button', { name: '취약 영역 진단' }))
    const lcButton = screen.getByRole('button', { name: /LC/ })

    await user.click(lcButton)
    expect(lcButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /TOEIC Speaking/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역 진단' }))

    const photoDescriptionButton = screen.getByRole('button', { name: /사진 묘사/ })
    expect(photoDescriptionButton).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('button', { name: /LC/ })).not.toBeInTheDocument()
  })
})

describe('ProjectIntro score validation', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('allows valid TOEIC scores and sends current score as null when omitted', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock, { currentScore: null, targetScore: '850' })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(requestBody.currentScore).toBeNull()
    expect(requestBody.targetScore).toBe('850')
  })

  test('blocks TOEIC scores outside the valid range', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '995')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 10~990 범위로 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('blocks TOEIC scores that are not in 5-point increments', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '852')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 5 단위로 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test.each(['3', '3.0', '3.5'])('allows TOEFL 1.0 to 6.0 score %s', async (score) => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock, { examType: 'TOEFL', targetScore: score })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('목표 점수'), score)
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })
  })

  test('blocks TOEFL 1.0 to 6.0 score 3.2', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('목표 점수'), '3.2')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 0.5 단위로 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('allows valid TOEFL 1.0 to 6.0 scores and rejects 4.3', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock, { examType: 'TOEFL', targetScore: '6' })
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('현재 점수'), '5.5')
    await user.type(screen.getByLabelText('목표 점수'), '6')
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
    const failingFetchMock = vi.fn()
    vi.stubGlobal('fetch', failingFetchMock)
    const failingUser = userEvent.setup()

    render(<ProjectIntro />)

    await goToExam(failingUser, 'TOEFL')
    await failingUser.type(screen.getByLabelText('목표 점수'), '4.3')
    await fillCommonFields(failingUser)
    await saveForm(failingUser)

    expect(await screen.findByText('목표 점수는 0.5 단위로 입력해 주세요.')).toBeInTheDocument()
    expect(failingFetchMock).not.toHaveBeenCalled()
  })

  test('allows valid TOEFL 0 to 120 scores and rejects decimals', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'TOEFL')
    await user.click(screen.getByRole('button', { name: '0~120 점수' }))
    await user.type(screen.getByLabelText('목표 점수'), '95.5')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 정수로 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('compares OPIc grades using the declared grade order', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'OPIc')
    await user.click(within(screen.getByRole('group', { name: '현재 등급' })).getByRole('button', { name: 'IM2' }))
    await user.click(within(screen.getByRole('group', { name: '목표 등급' })).getByRole('button', { name: 'IM2' }))
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 등급은 현재 등급보다 높아야 합니다.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('toggles optional current OPIc grade off when the selected button is clicked again', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await goToExam(user, 'OPIc')
    const currentGradeGroup = screen.getByRole('group', { name: '현재 등급' })
    const im2Button = within(currentGradeGroup).getByRole('button', { name: 'IM2' })

    await user.click(im2Button)
    expect(im2Button).toHaveAttribute('aria-pressed', 'true')

    await user.click(im2Button)
    expect(im2Button).toHaveAttribute('aria-pressed', 'false')
  })

  test('blocks TOEIC Speaking scores that are not in 10-point increments', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToExam(user, 'TOEIC Speaking')
    await user.type(screen.getByLabelText('목표 점수'), '155')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 10 단위로 입력해 주세요.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('blocks saving when the target score is not higher than the entered current score', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('현재 점수'), '850')
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('목표 점수는 현재 점수보다 높아야 합니다.')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  test('resets score inputs after changing the selected exam', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('현재 점수'), '650')
    await user.type(screen.getByLabelText('목표 점수'), '850')

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /TOEFL/ }))
    await goToInfo(user)

    expect(screen.getByLabelText('현재 점수')).toHaveValue(null)
    expect(screen.getByLabelText('목표 점수')).toHaveValue(null)
  })

  test('resets score inputs after changing the TOEFL score system', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('현재 점수'), '5.5')
    await user.type(screen.getByLabelText('목표 점수'), '6')
    await user.click(screen.getByRole('button', { name: '0~120 점수' }))

    expect(screen.getByLabelText('현재 점수')).toHaveValue(null)
    expect(screen.getByLabelText('목표 점수')).toHaveValue(null)
  })

  test('shows a friendly message for empty API responses', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(textResponse('', false))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('학습 계획을 저장하지 못했습니다. 입력값을 확인하고 다시 시도해 주세요.')).toBeInTheDocument()
  })

  test('shows a friendly message for non-JSON API responses', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(textResponse('<html>error</html>', false))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
  })
})
