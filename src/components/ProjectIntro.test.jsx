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

const dailyStudyRecord = {
  id: '223e4567-e89b-12d3-a456-426614174001',
  studyPlanId: SAVED_STUDY_PLAN_ID,
  studyDate: '2026-07-27',
  examType: 'TOEFL',
  generatedTasks: [
    { id: 'reading-1', area: 'Reading', title: 'Reading 지문 독해', minutes: 30 },
    { id: 'speaking-1', area: 'Speaking', title: 'Speaking 답변 녹음', minutes: 20 },
  ],
  completedTaskIds: ['reading-1'],
  actualStudyEntries: [
    { id: 'actual-1', area: 'Speaking', title: '독립형 답변 추가 연습', minutes: 15 },
  ],
  difficultArea: 'Speaking',
  nextPriorityArea: 'Reading',
  reflectionNote: '말하기에서 멈칫했다.',
  createdAt: '2026-07-27T09:00:00.000Z',
  updatedAt: '2026-07-27T10:00:00.000Z',
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
  const toeicCard = getToeicExamCard()
  const hasSelectedExam = screen
    .getAllByRole('button')
    .some((button) => button.classList.contains('exam-card-selected'))

  if (!hasSelectedExam && toeicCard && toeicCard.getAttribute('aria-pressed') === 'false') {
    await user.click(toeicCard)
  }

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
  await user.click(screen.getByRole('button', { name: '다음' }))

  if (!document.querySelector('.diagnosis-section')) {
    return
  }

  const weakAreaButton = document.querySelector('.weak-grid button')

  if (weakAreaButton) {
    await user.click(weakAreaButton)
  }

  await user.click(screen.getByRole('button', { name: '학습 계획 생성하기' }))
}

async function createToeicPlanAndOpenToday(user, fetchMock, renderProps = {}) {
  mockSuccessfulSave(fetchMock)
  vi.stubGlobal('fetch', fetchMock)

  render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} {...renderProps} />)

  await goToInfo(user)
  await user.type(screen.getByLabelText('목표 점수'), '850')
  await fillCommonFields(user)
  await saveForm(user)
  await screen.findByRole('heading', { name: '학습 계획' })
  await user.click(screen.getByRole('button', { name: '오늘의 학습 보기' }))
}

function mockSuccessfulSave(fetchMock, planOverrides = {}) {
  fetchMock
    .mockResolvedValueOnce(jsonResponse({ data: { id: SAVED_STUDY_PLAN_ID } }))
    .mockResolvedValueOnce(jsonResponse({ data: { ...savedStudyPlan, ...planOverrides } }))
    .mockResolvedValueOnce(jsonResponse({ data: null }))
}

async function openExamSelection(user) {
  const menuList = document.querySelector('.menu-list')
  const examMenuButton = within(menuList).getAllByRole('button')[0]
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

  test('moves to the integrated exam selection screen after the previous button is clicked from info', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '이전' }))

    expect(screen.getByText('STEP 1/5')).toBeInTheDocument()
    expect(document.querySelector('.start-layout')).toBeInTheDocument()
    expect(document.querySelector('.exam-section')).not.toBeInTheDocument()
  })

  test('disables the next button before an exam is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)

    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
    expect(screen.getAllByText('선택 전').length).toBeGreaterThan(0)
  })

  test('enables the next button after TOEIC is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())

    expect(screen.getByRole('button', { name: '다음' })).toBeEnabled()
  })

  test('stays on the exam selection screen immediately after TOEIC is selected', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())

    expect(document.querySelector('.start-exam-section')).toBeInTheDocument()
    expect(document.querySelector('.form-section')).not.toBeInTheDocument()
  })

  test('marks the selected TOEIC card as selected for assistive technology', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    const toeicCard = getToeicExamCard()

    await user.click(toeicCard)

    expect(toeicCard).toHaveAttribute('aria-pressed', 'true')
  })

  test('marks the selected TOEFL card with the selected card class', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    const toeflCard = screen.getByRole('button', { name: /TOEFL/ })

    await user.click(toeflCard)

    expect(toeflCard).toHaveClass('exam-card-selected')
    expect(toeflCard).toHaveAttribute('aria-pressed', 'true')
  })

  test('moves to the information input screen after the next button is clicked', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await openExamSelection(user)
    await user.click(getToeicExamCard())
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('STEP 2/5')).toBeInTheDocument()
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

  test('restores the latest saved study plan for the signed-in user on first render', async () => {
    localStorage.setItem('studyPlanId', SAVED_STUDY_PLAN_ID)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: savedStudyPlan }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/study-plans/me/latest', {
        headers: { Authorization: 'Bearer test-token' },
      })
    })

    expect(await screen.findByText('850')).toBeInTheDocument()
    expect(screen.getByText('650')).toBeInTheDocument()
    expect(screen.getByText(SAVED_STUDY_PLAN_ID)).toBeInTheDocument()
  })

  test('keeps the initial state when the signed-in user has no saved study plan', async () => {
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

    render(<ProjectIntro accessToken="test-token" />)

    expect(await screen.findByText('선택 시험: 선택 전')).toBeInTheDocument()
    expect(screen.getByText('STEP 1/5')).toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })

  test('treats a non-JSON latest-plan 404 as no saved plan and keeps the exam selection screen', async () => {
    localStorage.setItem('studyPlanId', SAVED_STUDY_PLAN_ID)
    const fetchMock = vi.fn().mockResolvedValue(textResponse('<html>not found</html>', false))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" />)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/study-plans/me/latest', {
        headers: { Authorization: 'Bearer test-token' },
      })
    })

    expect(screen.getByText('STEP 1/5')).toBeInTheDocument()
    expect(screen.getByText('선택 시험: 선택 전')).toBeInTheDocument()
    expect(screen.queryByText('서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')).not.toBeInTheDocument()
    expect(localStorage.getItem('studyPlanId')).toBeNull()
  })

  test('stores the created study plan id and completes the lookup after saving valid TOEIC form values', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        examType: 'TOEIC',
        isFirstAttempt: false,
        currentScore: '650',
        targetScore: '850',
        examDate: '2026-08-31',
        dailyStudyMinutes: 120,
      }),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, `/api/study-plans/${SAVED_STUDY_PLAN_ID}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await user.click(getToeicExamCard())
    await user.click(screen.getByRole('button', { name: '취약 영역' }))

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /TOEFL/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역' }))

    expect(screen.getByRole('button', { name: /Reading/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Listening/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Speaking/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Writing/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /LC/ })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /OPIc/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역' }))

    expect(screen.getByRole('button', { name: /묘사 문항/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /일상 경험 설명/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reading/ })).not.toBeInTheDocument()
  })

  test('resets selected weak areas after changing the selected exam', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn())

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await user.click(getToeicExamCard())
    await user.click(screen.getByRole('button', { name: '취약 영역' }))
    const lcButton = screen.getByRole('button', { name: /LC/ })

    await user.click(lcButton)
    expect(lcButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '시험 선택' }))
    await user.click(screen.getByRole('button', { name: /TOEIC Speaking/ }))
    await user.click(screen.getByRole('button', { name: '취약 영역' }))

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('목표 점수'), score)
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })

  test('blocks TOEFL 1.0 to 6.0 score 3.2', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToExam(user, 'TOEFL')
    await user.type(screen.getByLabelText('현재 점수'), '5.5')
    await user.type(screen.getByLabelText('목표 점수'), '6')
    await fillCommonFields(user)
    await saveForm(user)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })

    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
    const failingFetchMock = vi.fn()
    vi.stubGlobal('fetch', failingFetchMock)
    const failingUser = userEvent.setup()

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

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

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
  })
})

describe('ProjectIntro today study records', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('adds and deletes an actual study entry from the today screen', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    await createToeicPlanAndOpenToday(user, fetchMock)

    await user.selectOptions(screen.getByLabelText('영역 선택'), 'RC')
    await user.type(screen.getByLabelText('학습 내용'), 'Part 5 오답 복습')
    await user.type(screen.getByLabelText('실제 공부 시간(분)'), '25')
    await user.click(screen.getByRole('button', { name: '추가하기' }))

    expect(screen.getByText('Part 5 오답 복습')).toBeInTheDocument()
    expect(screen.getByText('25분')).toBeInTheDocument()
    expect(screen.getByLabelText('학습 내용')).toHaveValue('')
    expect(screen.getByLabelText('실제 공부 시간(분)')).toHaveValue(null)

    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(screen.queryByText('Part 5 오답 복습')).not.toBeInTheDocument()
    expect(screen.getByText('추가된 학습 기록이 없습니다.')).toBeInTheDocument()
  })

  test('blocks adding an actual study entry without content or at least one minute', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    await createToeicPlanAndOpenToday(user, fetchMock)

    await user.click(screen.getByRole('button', { name: '추가하기' }))

    expect(screen.getByText('학습 영역, 내용, 1분 이상의 시간을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('추가된 학습 기록이 없습니다.')).toBeInTheDocument()
  })

  test('keeps reflection fields after saving today study records', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    await createToeicPlanAndOpenToday(user, fetchMock)
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'daily-record-1' } }))

    await user.selectOptions(screen.getByLabelText('오늘 가장 어려웠던 영역'), 'LC')
    await user.selectOptions(screen.getByLabelText('내일 더 공부하고 싶은 영역'), 'RC')
    await user.type(screen.getByLabelText('오늘의 메모'), '집중력이 후반에 떨어졌다.')
    await user.click(screen.getByRole('button', { name: '오늘 학습 기록 저장하기' }))

    expect(screen.getByLabelText('오늘 가장 어려웠던 영역')).toHaveValue('LC')
    expect(screen.getByLabelText('내일 더 공부하고 싶은 영역')).toHaveValue('RC')
    expect(screen.getByLabelText('오늘의 메모')).toHaveValue('집중력이 후반에 떨어졌다.')
    expect(await screen.findByText('오늘의 학습 기록을 저장했습니다.')).toBeInTheDocument()
  })

  test('saves today study records with authorization for signed-in users', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock)
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: { id: 'daily-record-1' } }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)
    await screen.findByRole('heading', { name: '학습 계획' })
    await user.click(screen.getByRole('button', { name: '오늘의 학습 보기' }))
    await user.click(screen.getAllByRole('checkbox')[0])
    await user.selectOptions(screen.getByLabelText('영역 선택'), 'RC')
    await user.type(screen.getByLabelText('학습 내용'), 'Part 5 오답 복습')
    await user.type(screen.getByLabelText('실제 공부 시간(분)'), '25')
    await user.click(screen.getByRole('button', { name: '추가하기' }))
    await user.selectOptions(screen.getByLabelText('오늘 가장 어려웠던 영역'), 'LC')
    await user.selectOptions(screen.getByLabelText('내일 더 공부하고 싶은 영역'), 'RC')
    await user.type(screen.getByLabelText('오늘의 메모'), '집중력이 후반에 떨어졌다.')
    await user.click(screen.getByRole('button', { name: '오늘 학습 기록 저장하기' }))

    expect(fetchMock).toHaveBeenNthCalledWith(4, '/api/daily-study-records', {
      method: 'POST',
      headers: { Authorization: 'Bearer test-token', 'Content-Type': 'application/json' },
      body: expect.any(String),
    })

    const requestBody = JSON.parse(fetchMock.mock.calls[3][1].body)
    expect(requestBody.studyPlanId).toBe(SAVED_STUDY_PLAN_ID)
    expect(requestBody.recordDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(requestBody.generatedTasks.length).toBeGreaterThan(0)
    expect(requestBody.completedTaskIds).toHaveLength(1)
    expect(requestBody.actualStudyEntries).toEqual([
      expect.objectContaining({ area: 'RC', title: 'Part 5 오답 복습', minutes: 25 }),
    ])
    expect(requestBody.difficultArea).toBe('LC')
    expect(requestBody.nextPriorityArea).toBe('RC')
    expect(requestBody.reflectionNote).toBe('집중력이 후반에 떨어졌다.')
    expect(await screen.findByText('오늘의 학습 기록을 저장했습니다.')).toBeInTheDocument()
  })

  test('shows a session-expired message when today study record save returns 401', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    mockSuccessfulSave(fetchMock)
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, false),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)
    await screen.findByRole('heading', { name: '학습 계획' })
    await user.click(screen.getByRole('button', { name: '오늘의 학습 보기' }))
    await user.click(screen.getByRole('button', { name: '오늘 학습 기록 저장하기' }))

    expect(await screen.findByText('로그인이 만료되었습니다. 다시 로그인해 주세요.')).toBeInTheDocument()
  })

  test('asks guests to log in when they try to save today study records', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    const onAuthRequired = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    render(
      <ProjectIntro
        accessToken=""
        isAuthenticated={false}
        onAuthRequired={onAuthRequired}
        restoreLatestPlan={false}
      />,
    )

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)
    await user.click(screen.getByRole('button', { name: '오늘의 학습 보기' }))
    await user.click(screen.getByRole('button', { name: '오늘 학습 기록 저장하기' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onAuthRequired).toHaveBeenCalledTimes(2)
  })
})

describe('ProjectIntro daily study record history', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('shows the study record menu only for signed-in users', async () => {
    vi.stubGlobal('fetch', vi.fn())

    const { rerender } = render(<ProjectIntro accessToken="" isAuthenticated={false} restoreLatestPlan={false} />)

    expect(screen.queryByRole('button', { name: '학습 기록' })).not.toBeInTheDocument()

    rerender(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    expect(screen.getByRole('button', { name: '학습 기록' })).toBeInTheDocument()
  })

  test('renders record list calculations for signed-in users', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [dailyStudyRecord] }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '학습 기록' }))

    expect(await screen.findByText('2026.07.27 · TOEFL')).toBeInTheDocument()
    expect(screen.getByText('1/2개 완료 · 달성률 50%')).toBeInTheDocument()
    expect(screen.getByText('계획 50분 · 추가 학습 15분')).toBeInTheDocument()
    expect(screen.getByText('어려웠던 영역 Speaking')).toBeInTheDocument()
    expect(screen.getByText('다음 우선 영역 Reading')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/daily-study-records', {
      headers: { Authorization: 'Bearer test-token' },
    })
  })

  test('shows an empty state when there are no daily records', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: [] })))

    render(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '학습 기록' }))

    expect(await screen.findByText('아직 저장된 학습 기록이 없습니다. 오늘의 학습을 완료하고 첫 기록을 남겨 보세요.')).toBeInTheDocument()
  })

  test('opens record detail and returns to the list', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: [dailyStudyRecord] }))
      .mockResolvedValueOnce(jsonResponse({ data: dailyStudyRecord }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '학습 기록' }))
    await user.click(await screen.findByRole('button', { name: '자세히 보기' }))

    expect(await screen.findByRole('heading', { name: '2026.07.27 · TOEFL' })).toBeInTheDocument()
    expect(screen.getByText('Reading 지문 독해')).toBeInTheDocument()
    expect(screen.getByText('완료')).toBeInTheDocument()
    expect(screen.getByText('Speaking 답변 녹음')).toBeInTheDocument()
    expect(screen.getByText('미완료')).toBeInTheDocument()
    expect(screen.getByText('독립형 답변 추가 연습')).toBeInTheDocument()
    expect(screen.getByText('말하기에서 멈칫했다.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '목록으로 돌아가기' }))

    expect(screen.getByText('2026.07.27 · TOEFL')).toBeInTheDocument()
  })

  test('shows session and server error messages while loading records', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, false),
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '학습 기록' }))

    expect(await screen.findByText('로그인이 만료되었습니다. 다시 로그인해 주세요.')).toBeInTheDocument()

    cleanup()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse({ error: { code: 'DATABASE_ERROR', message: 'Database failed' } }, false),
    ))

    render(<ProjectIntro accessToken="test-token" isAuthenticated restoreLatestPlan={false} />)

    await user.click(screen.getByRole('button', { name: '학습 기록' }))

    expect(await screen.findByText('학습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')).toBeInTheDocument()
  })
})

describe('ProjectIntro adaptive study plan', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  test('loads the latest previous record and shows an adaptive plan for signed-in users', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ data: { ...savedStudyPlan, examType: 'TOEFL', dailyStudyMinutes: 120 } }))
      .mockResolvedValueOnce(jsonResponse({
        data: {
          ...dailyStudyRecord,
          studyDate: '2026-07-26',
          examType: 'TOEFL',
          difficultArea: 'Speaking',
          nextPriorityArea: 'Reading',
          generatedTasks: [
            { id: 'reading-1', area: 'Reading', title: 'Reading 지문 독해', minutes: 30 },
            { id: 'reading-2', area: 'Reading', title: 'Reading 오답 정리', minutes: 30 },
            { id: 'speaking-1', area: 'Speaking', title: 'Speaking 답변 녹음', minutes: 30 },
          ],
          completedTaskIds: ['speaking-1'],
        },
      }))
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" isAuthenticated />)

    expect(await screen.findByText('이전 학습 기록 반영')).toBeInTheDocument()
    expect(await screen.findByText(/2026-07-26 기록에서 Reading 미완료 항목이 많고 다음 우선 영역으로 선택되어/)).toBeInTheDocument()
    expect(screen.getByText('이전 기록 반영')).toBeInTheDocument()
    expect(screen.getByText('2026.07.26')).toBeInTheDocument()
    expect(screen.getAllByText('Reading').length).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledWith(`/api/daily-study-records/latest-before-today?studyPlanId=${SAVED_STUDY_PLAN_ID}`, {
      headers: { Authorization: 'Bearer test-token' },
    })
  })

  test('uses the basic plan message when there is no previous record', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()

    mockSuccessfulSave(fetchMock)
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="test-token" restoreLatestPlan={false} />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(await screen.findByText('저장된 이전 기록이 없어 선택한 취약 영역을 기준으로 계획을 만들었습니다.')).toBeInTheDocument()
    expect(screen.getByText('기본 계획')).toBeInTheDocument()
  })

  test('does not request previous records for guest plans', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    const onAuthRequired = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<ProjectIntro accessToken="" isAuthenticated={false} onAuthRequired={onAuthRequired} restoreLatestPlan={false} />)

    await goToInfo(user)
    await user.type(screen.getByLabelText('목표 점수'), '850')
    await fillCommonFields(user)
    await saveForm(user)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(await screen.findByText('저장된 이전 기록이 없어 선택한 취약 영역을 기준으로 계획을 만들었습니다.')).toBeInTheDocument()
  })
})


