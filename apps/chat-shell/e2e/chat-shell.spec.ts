import { expect, type Page } from 'playwright/test'

import { scenarioPrompts, test } from './chat-shell-harness.js'

test('runs the two-TXT Assignment through product Review, Accept, authoritative bootstrap, and reload', async ({
  chatHarness,
  chatPage: page,
}) => {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  const chat = page.getByRole('complementary', { name: 'AY Chat' })
  await selectCanonicalMaterials(page)

  const action = materials.getByRole('button', {
    name: /선택한 자료 정리하기/u,
  })
  await expect(action).toBeEnabled()
  await action.click()

  const review = chat.getByRole('region', { name: '검토 대기' })
  await expect(review).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'awaiting-review',
  )
  await expect(review).toContainText('개요 작성하기')
  await expect(review).toContainText('2026년 7월 12일 23:59 KST')
  await expect(review).toContainText('LMS 과제함 업로드')
  await expect(review).toContainText('과제: 개요 작성하기')
  await expect(review).toContainText(
    'RFC 3339 마감 시각은 2026-07-12T23:59:00+09:00입니다.',
  )
  await expect(review).not.toContainText('unselected-control.txt')
  await expect(review.getByRole('button', { name: '수락' })).toBeEnabled()
  await expect(review.getByRole('button', { name: /수정|거절/u })).toHaveCount(0)
  await expect(chat.getByRole('button', { name: '작업 중단' })).toBeVisible()

  const activityText = await chat
    .locator('.product-activity-list > li')
    .allTextContents()
  expect(activityText.slice(0, 5).map(normalizeText)).toEqual([
    expect.stringContaining('선택한 자료 정리하기'),
    expect.stringContaining('ay-ple-first-assignment'),
    expect.stringContaining('선택한 두 자료에서 과제명, 마감, 제출 방식을 확인합니다.'),
    expect.stringContaining('근거가 연결된 변경 제안을 준비했습니다'),
    expect.stringContaining('변경 제안'),
  ])

  await expect(action).toBeDisabled()
  await expect(page.getByRole('textbox', { name: '메시지' })).toBeDisabled()
  await expect(
    materials.getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' }),
  ).toBeDisabled()

  await review.getByRole('button', { name: '과제명 근거 보기' }).click()
  await expect(
    page.getByRole('tab', { name: 'problem-solving-syllabus.txt' }),
  ).toHaveAttribute('aria-selected', 'true')
  const evidence = page.getByLabel('선택한 원문 근거')
  await expect(evidence).toHaveText('과제: 개요 작성하기')
  await expect(evidence).toBeFocused()

  await page.getByRole('button', { name: 'AY Chat 숨기기' }).click()
  await expect(chat).toBeHidden()
  await page.getByRole('button', { name: 'AY Chat 열기' }).click()
  await expect(review).toBeVisible()
  await expect(review).toContainText('개요 작성하기')

  const bootstrapCountBeforeAccept = chatHarness
    .requests()
    .filter((pathname) => pathname === '/api/product/bootstrap').length
  const reviewRequestPromise = page.waitForRequest((request) =>
    new URL(request.url()).pathname.startsWith('/api/product/reviews/'),
  )
  await review.getByRole('button', { name: '수락' }).click()
  const reviewRequest = await reviewRequestPromise
  const reviewPayload = reviewRequest.postDataJSON() as Record<string, unknown>
  expect(Object.keys(reviewPayload).sort()).toEqual([
    'decision',
    'decisionKey',
    'patchId',
  ])
  expect(reviewPayload.decision).toBe('accept')
  expect(reviewPayload.patchId).toEqual(expect.any(String))
  expect(reviewPayload.decisionKey).toEqual(expect.any(String))
  const settled = chat.getByRole('region', { name: '반영된 과제' })
  await expect(settled).toBeVisible()
  await expect(settled).toBeInViewport()
  await expect(settled).toContainText('반영됨')
  await expect(settled).toContainText('개요 작성하기')
  await expect(settled).toContainText('학생 확인 완료')
  await expect(settled).toContainText('반영 결과 확인됨')
  await expect(settled).toContainText('학기 정보 1번째 반영')
  await expect(chat.getByRole('region', { name: '검토 완료' })).toBeVisible()
  await expect(chat.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(chat.getByText('AY 작업을 완료했습니다.')).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )
  expect(
    chatHarness
      .requests()
      .filter((pathname) => pathname === '/api/product/bootstrap').length,
  ).toBeGreaterThan(bootstrapCountBeforeAccept)

  const calls = chatHarness.calls()
  expect(
    calls
      .map((call) => call.operation)
      .filter((operation) => operation !== 'readAccountReadiness'),
  ).toEqual([
    'startThread',
    'startProductTurn',
    'answerUserInput',
  ])
  expect(
    calls.filter((call) => call.operation === 'readAccountReadiness').length,
  ).toBeGreaterThanOrEqual(2)
  const accepted = calls.find((call) => call.operation === 'answerUserInput')
  expect(accepted?.input.answers).toEqual({
    assignment_review_decision: ['수락'],
  })
  expect(chatHarness.requests()).toEqual(
    expect.arrayContaining([
      '/api/product/actions/first-assignment',
      expect.stringMatching(/^\/api\/product\/reviews\/interaction-/u),
      '/api/product/bootstrap',
    ]),
  )
  expect(
    chatHarness.requests().some((pathname) =>
      pathname.startsWith('/api/codex-chat'),
    ),
  ).toBe(false)

  await page.reload()
  const reloadedChat = page.getByRole('complementary', { name: 'AY Chat' })
  const reloadedSettled = reloadedChat.getByRole('region', {
    name: '반영된 과제',
  })
  await expect(reloadedSettled).toContainText('개요 작성하기')
  await expect(reloadedSettled).toContainText('반영됨')
  await expect(reloadedSettled).toContainText('학기 정보 1번째 반영')
  await expect(reloadedChat.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(reloadedChat.getByText('AY 작업을 완료했습니다.')).toHaveCount(0)
  await expect(reloadedChat.getByText('자료와 함께 시작해 보세요')).toBeVisible()
})

test('answers and cancels product Chat clarification in one cumulative transcript', async ({
  chatHarness,
  chatPage: page,
}) => {
  const chat = page.getByRole('complementary', { name: 'AY Chat' })
  const composer = page.getByRole('textbox', { name: '메시지' })

  await sendMessage(page, scenarioPrompts.answer)
  const firstQuestion = chat.getByRole('region', { name: 'AY 질문' })
  await expect(firstQuestion).toContainText('어떤 자료부터 살펴볼까요?')
  await expect(composer).toBeDisabled()
  await firstQuestion.getByLabel('직접 답하기').fill('공지 자료부터')
  await firstQuestion.getByRole('button', { name: '질문 답변 보내기' }).click()
  await expect(chat.getByText('질문에 답했습니다')).toBeVisible()
  await expect(
    chat.getByText('답변을 바탕으로 준비 순서를 정리했습니다.'),
  ).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )

  await sendMessage(page, scenarioPrompts.cancel)
  const activeQuestion = chat
    .getByRole('region', { name: 'AY 질문' })
    .filter({ hasText: '어떤 자료부터 살펴볼까요?' })
    .last()
  await activeQuestion.getByRole('button', { name: '질문 취소' }).click()
  await expect(chat.getByText('질문을 취소했습니다')).toBeVisible()
  await expect(
    chat.getByText('질문을 취소하고 현재 정보만으로 정리했습니다.'),
  ).toBeVisible()
  await expect(chat.getByText(scenarioPrompts.answer, { exact: true })).toBeVisible()
  await expect(chat.getByText(scenarioPrompts.cancel, { exact: true })).toBeVisible()

  const calls = chatHarness.calls()
  expect(calls.filter((call) => call.operation === 'startThread')).toHaveLength(1)
  expect(calls.filter((call) => call.operation === 'startProductTurn')).toHaveLength(2)
  const answered = calls.find((call) => call.operation === 'answerUserInput')
  expect(answered?.input.answers).toEqual({
    'private-general-question': ['공지 자료부터'],
  })
  expect(calls.filter((call) => call.operation === 'cancelUserInput')).toHaveLength(1)
  expect(
    chatHarness.requests().some((pathname) =>
      pathname.startsWith('/api/codex-chat'),
    ),
  ).toBe(false)
  expect(
    chatHarness.requests().some((pathname) => pathname.endsWith('/answer')),
  ).toBe(true)
  expect(
    chatHarness.requests().some((pathname) => pathname.endsWith('/cancel')),
  ).toBe(true)
})

test.describe('account readiness projection', () => {
  test.describe('not ready', () => {
    test.use({ scenario: 'not-ready' })

    test('keeps the workspace readable but closes product mutations', async ({
      chatHarness,
      chatPage: page,
    }) => {
      await assertReadableWorkspaceWithClosedProduct(page)
      await expect(page.getByText('Codex 로그인이 필요합니다')).toBeVisible()
      const operations = chatHarness.calls().map((call) => call.operation)
      expect(operations.length).toBeGreaterThanOrEqual(1)
      expect(operations.every((operation) => operation === 'readAccountReadiness')).toBe(true)
    })
  })

  test.describe('unavailable', () => {
    test.use({ scenario: 'unavailable' })

    test('distinguishes unavailable from sign-in readiness without hiding materials', async ({
      chatHarness,
      chatPage: page,
    }) => {
      await assertReadableWorkspaceWithClosedProduct(page)
      await expect(page.getByText('AY Chat을 사용할 수 없습니다')).toBeVisible()
      await expect(page.getByText('Codex 로그인이 필요합니다')).toHaveCount(0)
      expect(chatHarness.calls()).toEqual([])
    })
  })
})

async function selectCanonicalMaterials(page: Page): Promise<void> {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  await expect(materials.getByText('문제해결글쓰기', { exact: true })).toBeVisible()
  await materials
    .getByRole('checkbox', { name: 'lms-outline-notice.txt 선택' })
    .check()
  await materials
    .getByRole('checkbox', { name: 'problem-solving-syllabus.txt 선택' })
    .check()
  await expect(materials.getByText('2 / 2 선택됨', { exact: true })).toBeVisible()
}

async function sendMessage(page: Page, message: string): Promise<void> {
  const composer = page.getByRole('textbox', { name: '메시지' })
  await expect(composer).toBeEnabled()
  await composer.fill(message)
  await page.getByRole('button', { name: '메시지 보내기' }).click()
}

async function assertReadableWorkspaceWithClosedProduct(page: Page): Promise<void> {
  const materials = page.getByRole('complementary', { name: '학기 자료' })
  await expect(materials.getByText('문제해결글쓰기', { exact: true })).toBeVisible()
  await expect(
    materials.getByText('lms-outline-notice.txt', { exact: true }),
  ).toBeVisible()
  await expect(
    materials.getByText('problem-solving-syllabus.txt', { exact: true }),
  ).toBeVisible()
  await selectCanonicalMaterials(page)
  await expect(
    materials.getByRole('button', { name: /선택한 자료 정리하기/u }),
  ).toBeDisabled()
  await expect(page.getByRole('textbox', { name: '메시지' })).toBeDisabled()
  await expect(page.getByRole('button', { name: '메시지 보내기' })).toBeDisabled()
}

function operationPhase(page: Page) {
  return page.locator('[data-product-operation-phase]')
}

function normalizeText(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}
