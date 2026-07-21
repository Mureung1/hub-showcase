import { expect, type Page } from 'playwright/test'

import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  type ProductBootstrap,
  type ProductSettledHistory,
} from '@ay-ple/product-contract'

import {
  scenarioPrompts,
  selectCanonicalMaterials,
  test,
} from './chat-shell-harness.js'

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
  const feedbackInput = review.getByRole('textbox', { name: '수정 요청 내용' })
  await expect(feedbackInput).toBeEnabled()
  await expect(
    review.getByRole('button', { name: 'AY에게 수정 요청' }),
  ).toBeDisabled()
  await expect(review.getByRole('button', { name: '거절' })).toBeEnabled()
  const interrupt = chat.getByRole('button', { name: '작업 중단' })
  await expect(interrupt).toBeVisible()

  const reviewButtons = review.getByRole('button')
  await expect(reviewButtons).toHaveCount(6)
  await feedbackInput.fill('키보드 이동 확인')
  await interrupt.focus()
  for (let index = 0; index < 3; index += 1) {
    await page.keyboard.press('Tab')
    await expect(reviewButtons.nth(index)).toBeFocused()
    expect(
      await reviewButtons
        .nth(index)
        .evaluate((element) => element.matches(':focus-visible')),
    ).toBe(true)
  }
  await page.keyboard.press('Tab')
  await expect(feedbackInput).toBeFocused()
  expect(await feedbackInput.evaluate((element) => element.matches(':focus-visible'))).toBe(
    true,
  )
  for (let index = 3; index < 6; index += 1) {
    await page.keyboard.press('Tab')
    await expect(reviewButtons.nth(index)).toBeFocused()
    expect(
      await reviewButtons
        .nth(index)
        .evaluate((element) => element.matches(':focus-visible')),
    ).toBe(true)
  }

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
  const completedActivityText = (
    await chat.locator('.product-activity-list > li').allTextContents()
  ).map(normalizeText)
  expect(completedActivityText.slice(-2)).toEqual([
    expect.stringContaining('확인한 과제 정보를 학기 작업공간에 반영했습니다.'),
    expect.stringContaining('AY 작업을 완료했습니다.'),
  ])
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

test('revises the pending proposal in the same Turn and accepts its replacement', async ({
  chatHarness,
  chatPage: page,
}) => {
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()

  const firstReview = page.getByRole('region', { name: '검토 대기' })
  await expect(firstReview.locator('.assignment-values')).toContainText(
    'LMS 과제함 업로드',
  )
  const feedback = '제출 방식을 LMS로 간단히 표시해 주세요.'
  const bootstrapCountBeforeRevise = chatHarness
    .requests()
    .filter((pathname) => pathname === '/api/product/bootstrap').length
  await firstReview.getByRole('textbox', { name: '수정 요청 내용' }).fill(feedback)
  const reviseRequestPromise = page.waitForRequest((request) =>
    new URL(request.url()).pathname.startsWith('/api/product/reviews/'),
  )
  await firstReview.getByRole('button', { name: 'AY에게 수정 요청' }).click()
  const reviseRequest = await reviseRequestPromise
  expect(reviseRequest.postDataJSON()).toEqual({
    patchId: expect.any(String),
    decisionKey: expect.any(String),
    decision: 'revise',
    feedback,
  })

  await expect(page.getByRole('region', { name: '수정 요청됨' })).toBeVisible()
  const replacementReview = page.getByRole('region', { name: '검토 대기' })
  await expect(
    replacementReview.locator('.assignment-values').getByText('LMS', {
      exact: true,
    }),
  ).toBeVisible()
  await expect(
    replacementReview
      .locator('.assignment-values')
      .getByText('LMS 과제함 업로드', { exact: true }),
  ).toHaveCount(0)
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'awaiting-review',
  )
  expect(
    chatHarness
      .requests()
      .filter((pathname) => pathname === '/api/product/bootstrap').length,
  ).toBe(bootstrapCountBeforeRevise)
  await replacementReview.getByRole('button', { name: '수락' }).click()

  const settled = page.getByRole('region', { name: '반영된 과제' })
  await expect(
    settled.locator('.assignment-values').getByText('LMS', { exact: true }),
  ).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )
  const bootstrap = await readProductBootstrap(page)
  expect(bootstrap.workspace?.state).toBe('ready')
  if (bootstrap.workspace?.state === 'ready') {
    expect(bootstrap.workspace.confirmedRevision).toBe(1)
  }
  expect(bootstrap.history.statePatches.map((patch) => patch.status)).toEqual([
    'superseded',
    'applied',
  ])
  expect(bootstrap.history.userConfirmations).toHaveLength(1)
  expect(bootstrap.history.userConfirmations[0]).toMatchObject({
    patchId: bootstrap.history.statePatches[1]?.id,
    decision: 'accepted',
    outcome: 'applied',
  })
  expect(
    chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
  ).toHaveLength(1)
  expect(
    chatHarness.calls().filter((call) => call.operation === 'answerUserInput'),
  ).toHaveLength(2)
  expect(await page.locator('body').textContent()).not.toMatch(
    /proposal_[0-9a-f]{32}/u,
  )
})

test('rejects a proposal without changing the confirmed model across reload', async ({
  chatPage: page,
}) => {
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()

  const review = page.getByRole('region', { name: '검토 대기' })
  const rejectRequestPromise = page.waitForRequest((request) =>
    new URL(request.url()).pathname.startsWith('/api/product/reviews/'),
  )
  await review.getByRole('button', { name: '거절' }).click()
  const rejectRequest = await rejectRequestPromise
  expect(rejectRequest.postDataJSON()).toEqual({
    patchId: expect.any(String),
    decisionKey: expect.any(String),
    decision: 'reject',
  })

  await expect(page.getByRole('region', { name: '거절됨' })).toBeVisible()
  await expect(page.getByRole('region', { name: '반영된 과제' })).toHaveCount(0)
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )
  const beforeReload = await readProductBootstrap(page)
  expect(beforeReload.workspace?.state).toBe('ready')
  if (beforeReload.workspace?.state === 'ready') {
    expect(beforeReload.workspace.confirmedRevision).toBe(0)
  }
  expect(beforeReload.history.assignments).toEqual([])
  expect(beforeReload.history.statePatches).toEqual([
    expect.objectContaining({
      status: 'rejected',
      applyOutcome: { type: 'not_applied', revision: 0 },
    }),
  ])
  expect(beforeReload.history.userConfirmations).toEqual([
    expect.objectContaining({ decision: 'rejected', outcome: 'not_applied' }),
  ])

  await page.reload()
  await expect(page.getByRole('region', { name: '반영된 과제' })).toHaveCount(0)
  const afterReload = await readProductBootstrap(page)
  expect(afterReload).toEqual(beforeReload)
})

test('interrupts the active product Review through its public operation and terminal stream', async ({
  chatHarness,
  chatPage: page,
}) => {
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()
  await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()

  const interruptRequest = page.waitForRequest((request) =>
    new URL(request.url()).pathname.endsWith('/interrupt'),
  )
  await page.getByRole('button', { name: '작업 중단' }).click()
  expect(new URL((await interruptRequest).url()).pathname).toMatch(
    /^\/api\/product\/operations\/action_[0-9a-f]{32}\/interrupt$/u,
  )

  await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'interrupted',
  )
  await expect(page.getByRole('region', { name: '검토 종료' })).toBeVisible()
  await expect(page.getByRole('region', { name: '반영된 과제' })).toHaveCount(0)
  expect(
    chatHarness
      .calls()
      .map((call) => call.operation)
      .filter((operation) => operation !== 'readAccountReadiness'),
  ).toEqual(['startThread', 'startProductTurn', 'interrupt'])
  expect(
    chatHarness.requests().some((pathname) =>
      pathname.startsWith('/api/codex-chat'),
    ),
  ).toBe(false)
})

test('preserves the authoritative terminal when settled bootstrap hydration fails', async ({
  chatPage: page,
}) => {
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()
  await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
  const { failed: bootstrapFailure } = await failNextProductBootstrap(page)

  await page.getByRole('button', { name: '작업 중단' }).click()

  await bootstrapFailure
  await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'interrupted',
  )
  await expect(page.getByText('AY 작업을 계속하지 못했습니다')).toHaveCount(0)
})

test('settles a lost Assignment stream before Review answer and retries only from the explicit recovery action', async ({
  chatHarness,
  chatPage: page,
}) => {
  const chat = page.getByRole('complementary', { name: 'AY Chat' })
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()

  await expect(chat.getByRole('region', { name: '검토 대기' })).toBeVisible()
  await chatHarness.disconnectAssignmentStream()

  const recovery = chat.getByRole('region', { name: '작업 복구 기록' })
  await expect(recovery.getByText(/작업 연결이 끊겨/u)).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'interrupted',
  )
  await expect(chat.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(chat.getByRole('button', { name: '수락' })).toHaveCount(0)
  await expect(chat.getByRole('button', { name: 'AY에게 수정 요청' })).toHaveCount(0)
  await expect(chat.getByRole('button', { name: '거절' })).toHaveCount(0)

  await expect
    .poll(async () => {
      const bootstrap = await readProductBootstrap(page)
      return {
        confirmedRevision:
          bootstrap.workspace?.state === 'ready'
            ? bootstrap.workspace.confirmedRevision
            : undefined,
        assignments: bootstrap.history.assignments.length,
        confirmations: bootstrap.history.userConfirmations.length,
        patches: bootstrap.history.statePatches.map((patch) => ({
          status: patch.status,
          applyOutcome: patch.applyOutcome,
        })),
        runs: bootstrap.history.modelingRuns.map((run) => ({
          status: run.status,
          retryOfRunId: run.retryOfRunId,
          recovery: run.recovery,
        })),
      }
    })
    .toEqual({
      confirmedRevision: 0,
      assignments: 0,
      confirmations: 0,
      patches: [{ status: 'interrupted', applyOutcome: null }],
      runs: [
        {
          status: 'interrupted',
          retryOfRunId: null,
          recovery: { outcome: 'interrupted', retryable: true },
        },
      ],
    })

  const interrupted = await readProductBootstrap(page)
  const interruptedRun = interrupted.history.modelingRuns[0]
  expect(interruptedRun).toBeDefined()
  expect(
    chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
  ).toHaveLength(1)
  expect(
    chatHarness.requests().filter(
      (pathname) => pathname === '/api/product/actions/first-assignment/retry',
    ),
  ).toHaveLength(0)

  const reactivationRequest = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname === '/api/product/workspaces/activate',
  )
  await page.getByRole('button', { name: '다른 학기 폴더 열기' }).click()
  await reactivationRequest
  await page.reload()
  await expect(recovery.getByText(/작업 연결이 끊겨/u)).toBeVisible()
  await expect(chat.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(chat.getByRole('button', { name: '수락' })).toHaveCount(0)
  await expect(
    recovery.getByRole('button', { name: '이 자료로 다시 시도' }),
  ).toBeVisible()

  const retryRequestPromise = page.waitForRequest(
    (request) =>
      new URL(request.url()).pathname ===
      '/api/product/actions/first-assignment/retry',
  )
  await recovery.getByRole('button', { name: '이 자료로 다시 시도' }).click()
  const retryRequest = await retryRequestPromise
  const retryPayload = retryRequest.postDataJSON() as Record<string, unknown>
  expect(Object.keys(retryPayload).sort()).toEqual([
    'arguments',
    'courseId',
    'materials',
    'recipeVersion',
    'retryOfRunId',
  ])
  expect(retryPayload).toEqual({
    courseId: interruptedRun!.courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials: interruptedRun!.sources.map((source) => ({
      id: source.materialId,
      digest: source.digest,
    })),
    retryOfRunId: interruptedRun!.id,
  })

  const retryReview = chat.getByRole('region', { name: '검토 대기' })
  await expect(retryReview).toBeVisible()
  await retryReview.getByRole('button', { name: '수락' }).click()
  await expect(chat.getByRole('region', { name: '반영된 과제' })).toBeVisible()
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )

  await expect
    .poll(async () => {
      const bootstrap = await readProductBootstrap(page)
      return {
        confirmedRevision:
          bootstrap.workspace?.state === 'ready'
            ? bootstrap.workspace.confirmedRevision
            : undefined,
        assignments: bootstrap.history.assignments.length,
        confirmations: bootstrap.history.userConfirmations.length,
        patchStatuses: bootstrap.history.statePatches.map(
          (patch) => patch.status,
        ),
        runStatuses: bootstrap.history.modelingRuns.map((run) => run.status),
      }
    })
    .toEqual({
      confirmedRevision: 1,
      assignments: 1,
      confirmations: 1,
      patchStatuses: ['interrupted', 'applied'],
      runStatuses: ['interrupted', 'completed'],
    })

  const retried = await readProductBootstrap(page)
  const [firstRun, retryRun] = retried.history.modelingRuns
  expect(firstRun).toMatchObject({
    id: interruptedRun!.id,
    retryOfRunId: null,
    recovery: { outcome: 'interrupted', retryable: false },
  })
  expect(retryRun).toMatchObject({
    retryOfRunId: interruptedRun!.id,
    recovery: null,
  })
  expect(retryRun?.id).not.toBe(firstRun?.id)
  expect(retryRun?.actionId).not.toBe(firstRun?.actionId)
  expect(retried.history.statePatches[0]?.id).not.toBe(
    retried.history.statePatches[1]?.id,
  )
  expect(retried.history.userConfirmations[0]).toMatchObject({
    patchId: retried.history.statePatches[1]?.id,
    decision: 'accepted',
    outcome: 'applied',
    resultingRevision: 1,
  })
  expect(
    chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
  ).toHaveLength(2)
  expect(
    chatHarness.calls().filter((call) => call.operation === 'answerUserInput'),
  ).toHaveLength(1)
  expect(
    chatHarness.requests().filter(
      (pathname) => pathname === '/api/product/actions/first-assignment/retry',
    ),
  ).toHaveLength(1)
  await expect(
    chat.getByRole('button', { name: '이 자료로 다시 시도' }),
  ).toHaveCount(0)
})

test.describe('unresponsive disconnect interrupt', () => {
  test.use({ scenario: 'disconnect-drain-timeout' })

  test('polls coarse operation status through the final idle read before surfacing recovery', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await selectCanonicalMaterials(page)
    await page
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .click()
    await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
    const operationStatuses = observeBootstrapOperationStatuses(page)

    await chatHarness.disconnectAssignmentStream()

    const recovery = page.getByRole('region', { name: '작업 복구 기록' })
    await expect(
      recovery.getByRole('button', { name: '이 자료로 다시 시도' }),
    ).toBeVisible()
    await expect(page.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
    await expect
      .poll(() => operationStatuses.filter((status) => status === 'active').length)
      .toBeGreaterThan(1)
    await expect.poll(() => operationStatuses.at(-1)).toBe('idle')

    const bootstrap = await readProductBootstrap(page)
    expect(bootstrap.operationStatus).toBe('idle')
    expect(bootstrap.history.assignments).toEqual([])
    expect(bootstrap.history.userConfirmations).toEqual([])
    expect(bootstrap.history.statePatches).toEqual([
      expect.objectContaining({ status: 'interrupted', applyOutcome: null }),
    ])
    expect(bootstrap.history.modelingRuns).toEqual([
      expect.objectContaining({
        status: 'interrupted',
        recovery: { outcome: 'interrupted', retryable: true },
      }),
    ])
    expect(
      chatHarness.calls().filter((call) => call.operation === 'interrupt'),
    ).toHaveLength(1)
    expect(
      chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
    ).toHaveLength(1)
  })
})

test.describe('reload before interrupt settlement', () => {
  test.use({ scenario: 'reload-before-interrupt-settlement' })

  test('does not restore the pending Review and observes settled recovery after release', async ({
    chatHarness,
    chatPage: page,
  }) => {
    await selectCanonicalMaterials(page)
    await page
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .click()
    await expect(page.getByRole('region', { name: '검토 대기' })).toBeVisible()
    const operationStatuses = observeBootstrapOperationStatuses(page)

    await page.reload()

    await expect
      .poll(
        () =>
          chatHarness
            .calls()
            .filter((call) => call.operation === 'interrupt').length,
      )
      .toBe(1)
    await expect.poll(() => [...operationStatuses]).toContain('active')
    await expect(page.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '수락' })).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '이 자료로 다시 시도' }),
    ).toHaveCount(0)

    chatHarness.releaseInterruptSettlement()

    const recovery = page.getByRole('region', { name: '작업 복구 기록' })
    await expect(recovery.getByText(/작업 연결이 끊겨/u)).toBeVisible()
    await expect(
      recovery.getByRole('button', { name: '이 자료로 다시 시도' }),
    ).toBeVisible()
    await expect.poll(() => operationStatuses.at(-1)).toBe('idle')
    await expect(page.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '수락' })).toHaveCount(0)

    const bootstrap = await readProductBootstrap(page)
    expect(bootstrap.operationStatus).toBe('idle')
    expect(bootstrap.history.assignments).toEqual([])
    expect(bootstrap.history.userConfirmations).toEqual([])
    expect(bootstrap.history.statePatches).toEqual([
      expect.objectContaining({ status: 'interrupted', applyOutcome: null }),
    ])
    expect(bootstrap.history.modelingRuns).toEqual([
      expect.objectContaining({
        status: 'interrupted',
        recovery: { outcome: 'interrupted', retryable: true },
      }),
    ])
    expect(
      chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
    ).toHaveLength(1)
    expect(
      chatHarness.calls().filter((call) => call.operation === 'answerUserInput'),
    ).toHaveLength(0)
  })
})

test('reconciles a confirmed Assignment without inventing continuation loss when the finite Review response is lost', async ({
  chatHarness,
  chatPage: page,
}) => {
  const reviewResponse = await loseNextReviewResponse(page)
  chatHarness.pauseReviewContinuation()
  const chat = page.getByRole('complementary', { name: 'AY Chat' })
  await selectCanonicalMaterials(page)
  await page
    .getByRole('button', { name: /선택한 자료 정리하기/u })
    .click()

  const review = chat.getByRole('region', { name: '검토 대기' })
  await expect(review).toBeVisible()
  await review.getByRole('button', { name: '수락' }).click()
  expect(await reviewResponse.lost).toBe(200)

  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'running',
  )
  await expect(chat.getByText(/이어짐이 끊겼/u)).toHaveCount(0)
  chatHarness.releaseReviewContinuation()
  await expect(
    chat.getByText('확인한 과제 정보를 학기 작업공간에 반영했습니다.'),
  ).toBeVisible()
  await expect(chat.getByText(/이어짐이 끊겼/u)).toHaveCount(0)
  await expect(operationPhase(page)).toHaveAttribute(
    'data-product-operation-phase',
    'completed',
  )
  const settled = chat.getByRole('region', { name: '반영된 과제' })
  await expect(settled).toBeVisible()
  await expect(settled).toContainText('개요 작성하기')
  await expect(settled).toContainText('학기 정보 1번째 반영')
  await expect(chat.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(
    chat.getByRole('button', { name: '이 자료로 다시 시도' }),
  ).toHaveCount(0)

  await expect
    .poll(async () => {
      const bootstrap = await readProductBootstrap(page)
      return {
        confirmedRevision:
          bootstrap.workspace?.state === 'ready'
            ? bootstrap.workspace.confirmedRevision
            : undefined,
        assignments: bootstrap.history.assignments.length,
        confirmations: bootstrap.history.userConfirmations.length,
        patches: bootstrap.history.statePatches.map((patch) => patch.status),
        runs: bootstrap.history.modelingRuns.map((run) => ({
          status: run.status,
          retryOfRunId: run.retryOfRunId,
          recovery: run.recovery,
        })),
      }
    })
    .toEqual({
      confirmedRevision: 1,
      assignments: 1,
      confirmations: 1,
      patches: ['applied'],
      runs: [{ status: 'completed', retryOfRunId: null, recovery: null }],
    })

  const beforeReload = await readProductBootstrap(page)
  expect(beforeReload.history.userConfirmations[0]).toMatchObject({
    patchId: beforeReload.history.statePatches[0]?.id,
    decision: 'accepted',
    outcome: 'applied',
    resultingRevision: 1,
  })
  expect(
    chatHarness.calls().filter((call) => call.operation === 'startProductTurn'),
  ).toHaveLength(1)
  expect(
    chatHarness.calls().filter((call) => call.operation === 'answerUserInput'),
  ).toHaveLength(1)
  expect(
    chatHarness.requests().filter(
      (pathname) => pathname === '/api/product/actions/first-assignment/retry',
    ),
  ).toHaveLength(0)

  await page.reload()
  const reloaded = page.getByRole('complementary', { name: 'AY Chat' })
  await expect(reloaded.getByRole('region', { name: '반영된 과제' })).toContainText(
    '개요 작성하기',
  )
  await expect(
    reloaded.getByRole('region', { name: '반영된 과제' }),
  ).toContainText('학기 정보 1번째 반영')
  await expect(reloaded.getByRole('region', { name: '검토 대기' })).toHaveCount(0)
  await expect(
    reloaded.getByRole('button', { name: '이 자료로 다시 시도' }),
  ).toHaveCount(0)
  expect(await readProductBootstrap(page)).toEqual(beforeReload)
})

test.describe('acknowledged interrupt response loss', () => {
  test.use({ scenario: 'acknowledged-interrupt-response-loss' })

  test('keeps a late Review read-only after losing the interrupt HTTP response', async ({
    chatHarness,
    chatPage: page,
  }) => {
    const interruptResponse = await loseNextInterruptResponse(page)
    await selectCanonicalMaterials(page)
    await page
      .getByRole('button', { name: /선택한 자료 정리하기/u })
      .click()
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'running',
    )

    await page.getByRole('button', { name: '작업 중단' }).click()

    const review = page.getByRole('region', { name: '검토 대기' })
    await expect(page.getByText('중단 요청을 전달했습니다.')).toBeVisible()
    await expect(review).toBeVisible()
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'stopping',
    )
    await expect(review.getByRole('button', { name: '과제명 근거 보기' })).toBeEnabled()
    const feedback = review.getByRole('textbox', { name: '수정 요청 내용' })
    const accept = review.getByRole('button', { name: '수락' })
    const revise = review.getByRole('button', { name: 'AY에게 수정 요청' })
    const reject = review.getByRole('button', { name: '거절' })
    await expect(feedback).toBeDisabled()
    await expect(accept).toBeDisabled()
    await expect(revise).toBeDisabled()
    await expect(reject).toBeDisabled()

    chatHarness.releaseInterruptResponse()
    expect(await interruptResponse.lost).toBe(202)
    await flushProductController(page)
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'stopping',
    )
    await expect(feedback).toBeDisabled()
    await expect(accept).toBeDisabled()
    await expect(revise).toBeDisabled()
    await expect(reject).toBeDisabled()
    await expect(
      page.getByText('작업 중단 요청을 전달하지 못했습니다.'),
    ).toHaveCount(0)

    for (const control of [accept, revise, reject]) {
      await control.evaluate((element) => {
        const button = element as typeof element & {
          disabled: boolean
          click(): void
        }
        button.disabled = false
        button.click()
      })
    }
    chatHarness.releaseLateInteraction()

    await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'interrupted',
    )
    expect(
      chatHarness.requests().some((pathname) =>
        pathname.startsWith('/api/product/reviews/'),
      ),
    ).toBe(false)
    expect(
      chatHarness
        .calls()
        .some((call) => call.operation === 'answerUserInput'),
    ).toBe(false)
    await expect(page.getByRole('region', { name: '반영된 과제' })).toHaveCount(0)
    const history = await readProductHistory(page)
    expect(history.assignments).toEqual([])
    expect(history.userConfirmations).toEqual([])
    expect(history.statePatches).toEqual([
      expect.objectContaining({
        status: 'interrupted',
        applyOutcome: null,
      }),
    ])
  })

  test('keeps late clarification controls closed after losing the interrupt HTTP response', async ({
    chatHarness,
    chatPage: page,
  }) => {
    const interruptResponse = await loseNextInterruptResponse(page)
    await sendMessage(page, scenarioPrompts.cancel)
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'running',
    )

    await page.getByRole('button', { name: '작업 중단' }).click()

    const question = page.getByRole('region', { name: 'AY 질문' })
    await expect(page.getByText('중단 요청을 전달했습니다.')).toBeVisible()
    await expect(question).toBeVisible()
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'stopping',
    )
    await expect(question.getByLabel('직접 답하기')).toBeDisabled()
    await expect(
      question.getByRole('button', { name: '질문 답변 보내기' }),
    ).toBeDisabled()
    const cancel = question.getByRole('button', { name: '질문 취소' })
    await expect(cancel).toBeDisabled()

    chatHarness.releaseInterruptResponse()
    expect(await interruptResponse.lost).toBe(202)
    await flushProductController(page)
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'stopping',
    )
    await expect(question.getByLabel('직접 답하기')).toBeDisabled()
    await expect(
      question.getByRole('button', { name: '질문 답변 보내기' }),
    ).toBeDisabled()
    await expect(cancel).toBeDisabled()
    await expect(
      page.getByText('작업 중단 요청을 전달하지 못했습니다.'),
    ).toHaveCount(0)

    await cancel.evaluate((element) => {
      const button = element as typeof element & {
        disabled: boolean
        click(): void
      }
      button.disabled = false
      button.click()
    })
    chatHarness.releaseLateInteraction()

    await expect(page.getByText('AY 작업을 중단했습니다.')).toBeVisible()
    await expect(operationPhase(page)).toHaveAttribute(
      'data-product-operation-phase',
      'interrupted',
    )
    expect(
      chatHarness.requests().some(
        (pathname) => pathname.endsWith('/answer') || pathname.endsWith('/cancel'),
      ),
    ).toBe(false)
    expect(
      chatHarness.calls().some(
        (call) =>
          call.operation === 'answerUserInput' ||
          call.operation === 'cancelUserInput',
      ),
    ).toBe(false)
  })
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
  const firstFreeform = firstQuestion.getByLabel('직접 답하기')
  const answerButton = firstQuestion.getByRole('button', {
    name: '질문 답변 보내기',
  })
  await firstFreeform.focus()
  await firstFreeform.fill('공지 자료부터')
  await page.keyboard.press('Tab')
  await expect(answerButton).toBeFocused()
  await page.keyboard.press('Enter')
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
  await activeQuestion.getByLabel('직접 답하기').focus()
  await page.keyboard.press('Tab')
  const cancelButton = activeQuestion.getByRole('button', { name: '질문 취소' })
  await expect(cancelButton).toBeFocused()
  await page.keyboard.press('Enter')
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

async function sendMessage(page: Page, message: string): Promise<void> {
  const composer = page.getByRole('textbox', { name: '메시지' })
  await expect(composer).toBeEnabled()
  await composer.fill(message)
  await page.getByRole('button', { name: '메시지 보내기' }).click()
}

async function loseNextInterruptResponse(page: Page): Promise<{
  readonly lost: Promise<number>
}> {
  let resolve!: (status: number) => void
  let reject!: (error: unknown) => void
  const lost = new Promise<number>((settle, fail) => {
    resolve = settle
    reject = fail
  })
  await page.route(
    '**/api/product/operations/*/interrupt',
    async (route) => {
      try {
        const response = await route.fetch()
        const status = response.status()
        await route.abort('failed')
        resolve(status)
      } catch (error) {
        reject(error)
      }
    },
    { times: 1 },
  )
  return { lost }
}

async function loseNextReviewResponse(page: Page): Promise<{
  readonly lost: Promise<number>
}> {
  let resolve!: (status: number) => void
  let reject!: (error: unknown) => void
  const lost = new Promise<number>((settle, fail) => {
    resolve = settle
    reject = fail
  })
  await page.route(
    '**/api/product/reviews/*',
    async (route) => {
      try {
        const response = await route.fetch()
        const status = response.status()
        await route.abort('failed')
        resolve(status)
      } catch (error) {
        reject(error)
      }
    },
    { times: 1 },
  )
  return { lost }
}

async function failNextProductBootstrap(page: Page): Promise<{
  readonly failed: Promise<void>
}> {
  let resolve!: () => void
  const failed = new Promise<void>((settle) => {
    resolve = settle
  })
  await page.route(
    '**/api/product/bootstrap',
    async (route) => {
      await route.abort('failed')
      resolve()
    },
    { times: 1 },
  )
  return { failed }
}

function observeBootstrapOperationStatuses(
  page: Page,
): ProductBootstrap['operationStatus'][] {
  const statuses: ProductBootstrap['operationStatus'][] = []
  page.on('response', (response) => {
    if (new URL(response.url()).pathname !== '/api/product/bootstrap') return
    void response
      .json()
      .then((body: unknown) => {
        if (
          typeof body === 'object' &&
          body !== null &&
          'operationStatus' in body &&
          (body.operationStatus === 'active' || body.operationStatus === 'idle')
        ) {
          statuses.push(body.operationStatus)
        }
      })
      .catch(() => undefined)
  })
  return statuses
}

async function flushProductController(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(() => setTimeout(resolve, 0), 0)
      }),
  )
}

async function readProductHistory(page: Page): Promise<ProductSettledHistory> {
  return page.evaluate(async () => {
    const response = await fetch('/api/product/bootstrap')
    if (!response.ok) throw new Error('Product bootstrap failed.')
    const bootstrap = (await response.json()) as {
      readonly history: ProductSettledHistory
    }
    return bootstrap.history
  })
}

async function readProductBootstrap(page: Page): Promise<ProductBootstrap> {
  return page.evaluate(async () => {
    const response = await fetch('/api/product/bootstrap')
    if (!response.ok) throw new Error('Product bootstrap failed.')
    return response.json() as Promise<ProductBootstrap>
  })
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
