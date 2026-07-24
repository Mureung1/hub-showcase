import assert from 'node:assert/strict'
import test from 'node:test'

import * as productContract from '@ay-ple/product-contract'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  PRODUCT_REVIEW_FEEDBACK_MAX_BYTES,
  ProductContractError,
  decodeFirstAssignmentRequest,
  decodeFirstAssignmentRetryRequest,
  decodeProductBootstrap,
  decodeProductChatRequest,
  decodeProductCodexSettings,
  decodeProductError,
  decodeProductMaterialRefreshResponse,
  decodeProductMaterialPreview,
  decodeProductOperationFrame,
  decodeProductReviewRequest,
  decodeProductReviewResponse,
} from '@ay-ple/product-contract'

test('package root exposes the exact runtime contract surface', () => {
  assert.deepEqual(Object.keys(productContract).sort(), [
    'FIRST_ASSIGNMENT_ARGUMENTS',
    'FIRST_ASSIGNMENT_RECIPE_VERSION',
    'PRODUCT_JSON_ENVELOPE_MAX_BYTES',
    'PRODUCT_REVIEW_FEEDBACK_MAX_BYTES',
    'ProductContractError',
    'decodeCreateProductCourseRequest',
    'decodeEmptyProductRequest',
    'decodeFirstAssignmentRequest',
    'decodeFirstAssignmentRetryRequest',
    'decodeProductBootstrap',
    'decodeProductChatRequest',
    'decodeProductCodexSettings',
    'decodeProductCodexTurnSettings',
    'decodeProductError',
    'decodeProductInteractionAnswerRequest',
    'decodeProductMaterialPreview',
    'decodeProductMaterialRefreshResponse',
    'decodeProductOperationFrame',
    'decodeProductQuestion',
    'decodeProductReviewRequest',
    'decodeProductReviewResponse',
    'decodeProductStatePatch',
    'decodeProductWorkspace',
    'decodeProductWorkspaceActivationResponse',
    'decodeProductWorkspaceResponse',
    'isProductDecisionKey',
    'isProductDigest',
    'isProductInteractionId',
    'isProductMaterialId',
    'isProductOperationId',
    'isProductPatchId',
    'isProductQuestionId',
  ])
})

test('bootstrap decoder accepts the exact Browser-safe projection only', () => {
  const bootstrap = {
    accountReadiness: { state: 'ready' },
    operationStatus: 'idle',
    workspace: {
      state: 'ready',
      confirmedRevision: 0,
      course: null,
      materials: [],
      recovery: null,
    },
    history: {
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
    },
  } as const

  assert.deepEqual(decodeProductBootstrap(bootstrap), bootstrap)
  assert.throws(
    () =>
      decodeProductBootstrap({
        ...bootstrap,
        operationStatus: 'settling',
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeProductBootstrap({
        ...bootstrap,
        workspace: {
          ...bootstrap.workspace,
          storeFormatVersion: 2,
        },
      }),
    ProductContractError,
  )
})

test('workspace recovery and explicit material rebaseline use one exact shared contract', () => {
  const workspace = {
    state: 'ready',
    confirmedRevision: 0,
    course: null,
    materials: [],
    recovery: {
      state: 'source_conflict',
      displayMessage:
        '원본 자료가 실행 중 변경되었습니다. 자료 새로고침으로 현재 내용을 채택하세요.',
    },
  } as const
  const response = {
    outcome: 'source_rebaselined',
    workspace: { ...workspace, recovery: null },
  } as const

  assert.deepEqual(decodeProductMaterialRefreshResponse(response), response)
  assert.throws(
    () =>
      decodeProductMaterialRefreshResponse({
        ...response,
        outcome: 'automatically_recovered',
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeProductMaterialRefreshResponse({
        ...response,
        workspace,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeProductBootstrap({
        accountReadiness: { state: 'ready' },
        operationStatus: 'idle',
        workspace: {
          ...workspace,
          recovery: { ...workspace.recovery, baselineDigest: 'a'.repeat(64) },
        },
        history: {
          assignments: [],
          statePatches: [],
          userConfirmations: [],
          modelingRuns: [],
        },
      }),
    ProductContractError,
  )
})

test('first Assignment retry requires an exact prior Run binding', () => {
  const request = {
    courseId: `course_${'1'.repeat(32)}`,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials: [
      { id: `material_${'2'.repeat(32)}`, digest: 'a'.repeat(64) },
      { id: `material_${'3'.repeat(32)}`, digest: 'b'.repeat(64) },
    ],
    retryOfRunId: `run_${'4'.repeat(32)}`,
  } as const

  assert.deepEqual(decodeFirstAssignmentRetryRequest(request), request)
  assert.throws(
    () =>
      decodeFirstAssignmentRetryRequest({
        ...request,
        automatic: true,
      }),
    ProductContractError,
  )
  assert.throws(
    () =>
      decodeFirstAssignmentRetryRequest({
        ...request,
        retryOfRunId: `action_${'4'.repeat(32)}`,
      }),
    ProductContractError,
  )
})

test('operation frame decoder covers the closed Assignment and Chat families', () => {
  const actionId = `action_${'1'.repeat(32)}`
  const chatId = `chat_${'2'.repeat(32)}`
  const runId = `run_${'3'.repeat(32)}`
  const activityId = `activity_${'4'.repeat(32)}`
  const interactionId = `interaction_${'5'.repeat(32)}`
  const patchId = `patch_${'6'.repeat(32)}`
  const decisionKey = `decision_${'7'.repeat(32)}`
  const replacementInteractionId = `interaction_${'a'.repeat(32)}`
  const replacementPatchId = `patch_${'b'.repeat(32)}`
  const replacementDecisionKey = `decision_${'c'.repeat(32)}`
  const question = {
    id: `question_${'8'.repeat(32)}`,
    header: '자료 선택',
    question: '어떤 자료부터 볼까요?',
    options: null,
    acceptsFreeform: true,
  } as const
  const patch = {
    id: patchId,
    summary: '과제를 제안합니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '1차 과제',
        dueAt: '2026-07-25T23:59:00+09:00',
        submissionMethod: 'LMS',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: `material_${'9'.repeat(32)}`,
        digest: 'a'.repeat(64),
        quote: '1차 과제',
      },
    ],
    status: 'pending',
  } as const
  const replacementPatch = {
    ...patch,
    id: replacementPatchId,
    summary: '마감 근거를 고친 제안입니다.',
  } as const
  const frames = [
    { type: 'operation.preparing', operationId: actionId, runId },
    { type: 'operation.preparing', operationId: chatId },
    { type: 'operation.accepted', operationId: actionId, runId },
    {
      type: 'skill.requested',
      operationId: actionId,
      skill: { name: 'ay-ple-first-assignment', version: '1' },
    },
    {
      type: 'agent_message.delta',
      operationId: actionId,
      activityId,
      delta: '조각',
    },
    {
      type: 'plan.completed',
      operationId: actionId,
      activityId,
      text: '계획',
    },
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: actionId,
      activityId,
      tool: 'propose_state_patch',
      patch,
    },
    {
      type: 'mcp_call.failed',
      operationId: actionId,
      activityId,
      tool: 'propose_state_patch',
      displayMessage: '제안을 확인하지 못했습니다.',
    },
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId,
      outcome: 'interrupted',
      retryable: true,
    },
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId,
      outcome: 'unknown',
      retryable: true,
    },
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId,
      outcome: 'continuation_lost',
      retryable: false,
      confirmedRevision: 1,
    },
    {
      type: 'interaction.requested',
      operationId: chatId,
      interactionId,
      questions: [question],
    },
    {
      type: 'review.requested',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      patch,
      questions: [{ ...question, id: 'assignment_review_decision' }],
    },
    {
      type: 'interaction.resolved',
      operationId: chatId,
      interactionId,
      resolution: 'answered',
    },
    {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      outcome: 'revised',
    },
    {
      type: 'review.replaced',
      operationId: actionId,
      interactionId: replacementInteractionId,
      patchId: replacementPatchId,
      decisionKey: replacementDecisionKey,
      patch: replacementPatch,
      questions: [{ ...question, id: 'assignment_review_decision' }],
      replaces: { interactionId, patchId, decisionKey },
    },
    { type: 'interrupt.acknowledged', operationId: actionId },
    {
      type: 'operation.error',
      operationId: actionId,
      code: 'rate_limited',
      displayMessage: '잠시 뒤 다시 시도해 주세요.',
      willRetry: true,
    },
    {
      type: 'operation.terminal',
      operationId: actionId,
      runId,
      status: 'completed',
      validationOutcome: 'passed',
    },
    {
      type: 'operation.terminal',
      operationId: chatId,
      status: 'completed',
    },
  ] as const

  for (const frame of frames) {
    assert.deepEqual(decodeProductOperationFrame(frame), frame)
  }

  assert.throws(
    () =>
      decodeProductOperationFrame({
        type: 'operation.recovery',
        operationId: actionId,
        runId,
        outcome: 'continuation_lost',
        retryable: true,
        confirmedRevision: 1,
      }),
    ProductContractError,
  )
  for (const invalid of [
    { ...frames[0], nativeCorrelation: { turnId: 'private-turn' } },
    { ...frames[7], patch: { ...patch, absolutePath: '/private/source.txt' } },
    {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      resolution: 'answered',
    },
    {
      ...frames[13],
      replaces: {
        interactionId,
        patchId,
        decisionKey,
        nativeRequestId: 42,
      },
    },
    {
      type: 'operation.terminal',
      operationId: chatId,
      status: 'acceptance_unknown',
    },
    { type: 'native.item', operationId: actionId },
  ]) {
    assert.throws(() => decodeProductOperationFrame(invalid), ProductContractError)
  }
})

test('review lifecycle frames expose exact outcomes and replacement bindings', () => {
  const operationId = `action_${'1'.repeat(32)}`
  const interactionId = `interaction_${'2'.repeat(32)}`
  const patchId = `patch_${'3'.repeat(32)}`
  const decisionKey = `decision_${'4'.repeat(32)}`
  const replacementInteractionId = `interaction_${'5'.repeat(32)}`
  const replacementPatchId = `patch_${'6'.repeat(32)}`
  const replacementDecisionKey = `decision_${'7'.repeat(32)}`
  const binding = { operationId, interactionId, patchId, decisionKey } as const
  const patch = {
    id: replacementPatchId,
    summary: '수정한 과제를 제안합니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '수정한 1차 과제',
        dueAt: '2026-07-26T23:59:00+09:00',
        submissionMethod: 'LMS',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: `material_${'8'.repeat(32)}`,
        digest: '9'.repeat(64),
        quote: '수정한 1차 과제',
      },
    ],
    status: 'pending',
  } as const
  const question = {
    id: 'assignment_review_decision',
    header: '과제 변경 확인',
    question: '수정한 제안을 반영할까요?',
    options: [
      { label: '수락', description: '확인된 학기 상태에 반영합니다.' },
      { label: 'AY에게 수정 요청', description: '같은 작업에서 다시 제안합니다.' },
      { label: '거절', description: '학기 상태를 바꾸지 않습니다.' },
    ],
    acceptsFreeform: true,
  } as const
  const replaced = {
    type: 'review.replaced',
    operationId,
    interactionId: replacementInteractionId,
    patchId: replacementPatchId,
    decisionKey: replacementDecisionKey,
    patch,
    questions: [question],
    replaces: { interactionId, patchId, decisionKey },
  } as const

  for (const outcome of [
    'accepted',
    'revised',
    'rejected',
    'cancelled',
  ] as const) {
    const resolved = { type: 'review.resolved', ...binding, outcome } as const
    assert.deepEqual(decodeProductOperationFrame(resolved), resolved)
  }
  assert.deepEqual(decodeProductOperationFrame(replaced), replaced)

  for (const invalid of [
    { type: 'review.resolved', ...binding, outcome: 'answered' },
    { ...replaced, patchId },
    { ...replaced, nativeRequestId: 42 },
    {
      ...replaced,
      replaces: { ...replaced.replaces, nativeRequestId: 42 },
    },
    { ...replaced, patch: { ...patch, absolutePath: '/private/source.txt' } },
  ]) {
    assert.throws(
      () => decodeProductOperationFrame(invalid),
      ProductContractError,
    )
  }
})

test('request decoders keep the current literal and JSON envelope closed', () => {
  const courseId = `course_${'a'.repeat(32)}`
  const materials = [
    { id: `material_${'b'.repeat(32)}`, digest: 'c'.repeat(64) },
    { id: `material_${'d'.repeat(32)}`, digest: 'e'.repeat(64) },
  ]
  const assignment = {
    courseId,
    recipeVersion: FIRST_ASSIGNMENT_RECIPE_VERSION,
    arguments: FIRST_ASSIGNMENT_ARGUMENTS,
    materials,
  } as const

  assert.deepEqual(decodeFirstAssignmentRequest(assignment), assignment)
  assert.deepEqual(
    decodeProductChatRequest({
      text: '자료를 비교해 줘',
      materials: [],
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'fast',
      },
    }),
    {
      text: '자료를 비교해 줘',
      materials: [],
      codexSettings: {
        model: 'gpt-current',
        reasoningEffort: 'medium',
        serviceTier: 'fast',
      },
    },
  )
  for (const invalid of [
    { ...assignment, extra: true },
    { ...assignment, recipeVersion: '1' },
    { ...assignment, materials: [materials[0], materials[0]] },
    { text: ' ', materials: [] },
    { text: 'a'.repeat(16 * 1024), materials: [] },
    { text: '질문', materials: [], model: 'private-model' },
  ]) {
    assert.throws(() => decodeRequest(invalid), ProductContractError)
  }
})

test('Codex settings decoder keeps the advertised order and fast availability', () => {
  const settings = {
    models: [
      {
        model: 'gpt-current',
        displayName: 'GPT Current',
        description: 'Current model',
        isDefault: true,
        defaultReasoningEffort: 'medium',
        supportedReasoningEfforts: [
          { reasoningEffort: 'low', description: 'Quick' },
          { reasoningEffort: 'medium', description: 'Balanced' },
        ],
        fastModeAvailable: true,
        fastModeDefault: false,
      },
    ],
  } as const
  assert.deepEqual(decodeProductCodexSettings(settings), settings)
  assert.throws(
    () =>
      decodeProductCodexSettings({
        models: [
          {
            ...settings.models[0],
            defaultReasoningEffort: 'high',
          },
        ],
      }),
    ProductContractError,
  )
})

test('review request decoder accepts exact settled decisions and bounded revision feedback', () => {
  const patchId = `patch_${'a'.repeat(32)}`
  const decisionKey = `decision_${'b'.repeat(32)}`
  const accept = { patchId, decisionKey, decision: 'accept' } as const
  const reject = { patchId, decisionKey, decision: 'reject' } as const
  const revise = {
    patchId,
    decisionKey,
    decision: 'revise',
    feedback: '마감 근거를 다시 확인해 줘',
  } as const

  assert.equal(PRODUCT_REVIEW_FEEDBACK_MAX_BYTES, 8 * 1024)
  assert.deepEqual(decodeProductReviewRequest(accept), accept)
  assert.deepEqual(decodeProductReviewRequest(reject), reject)
  assert.deepEqual(decodeProductReviewRequest(revise), revise)
  assert.deepEqual(
    decodeProductReviewRequest({
      ...revise,
      feedback: 'a'.repeat(8 * 1024),
    }),
    { ...revise, feedback: 'a'.repeat(8 * 1024) },
  )
  const exactMultibyteFeedback = `${'가'.repeat(2_730)}ab`
  assert.deepEqual(
    decodeProductReviewRequest({
      ...revise,
      feedback: exactMultibyteFeedback,
    }),
    { ...revise, feedback: exactMultibyteFeedback },
  )

  for (const invalid of [
    { ...accept, feedback: '허용되지 않는 필드' },
    { ...reject, feedback: '허용되지 않는 필드' },
    { patchId, decisionKey, decision: 'revise' },
    { ...revise, feedback: '   ' },
    { ...revise, feedback: 'a'.repeat(8 * 1024 + 1) },
    { ...revise, feedback: `${exactMultibyteFeedback}c` },
    { ...revise, nativeRequestId: 42 },
  ]) {
    assert.throws(
      () => decodeProductReviewRequest(invalid),
      ProductContractError,
    )
  }
})

test('response decoders accept public fields and reject private metadata', () => {
  const patchId = `patch_${'a'.repeat(32)}`
  const decisionKey = `decision_${'b'.repeat(32)}`
  const preview = {
    materialId: `material_${'c'.repeat(32)}`,
    relativePath: 'notice.txt',
    digest: 'd'.repeat(64),
    mediaType: 'text/plain; charset=utf-8',
    size: 6,
    text: 'notice',
    truncated: false,
  } as const
  const review = {
    patchId,
    decisionKey,
    decision: 'accepted',
    outcome: 'applied',
    confirmedRevision: 1,
    replayed: false,
    continuation: 'continued',
  } as const

  assert.deepEqual(decodeProductMaterialPreview(preview), preview)
  assert.deepEqual(
    decodeProductReviewRequest({ patchId, decisionKey, decision: 'accept' }),
    { patchId, decisionKey, decision: 'accept' },
  )
  assert.deepEqual(decodeProductReviewResponse(review), review)
  assert.deepEqual(
    decodeProductError({ code: 'invalid_request', displayMessage: '확인 필요' }),
    { code: 'invalid_request', displayMessage: '확인 필요' },
  )
  assert.throws(
    () =>
      decodeProductMaterialPreview({
        ...preview,
        absolutePath: '/private/workspace/notice.txt',
      }),
    ProductContractError,
  )
  assert.throws(
    () => decodeProductReviewResponse({ ...review, nativeRequestId: 42 }),
    ProductContractError,
  )
})

test('review response decoder keeps each decision paired with its exact outcome', () => {
  const patchId = `patch_${'a'.repeat(32)}`
  const decisionKey = `decision_${'b'.repeat(32)}`
  const binding = { patchId, decisionKey, confirmedRevision: 3 } as const
  const responses = [
    {
      ...binding,
      decision: 'accepted',
      outcome: 'applied',
      replayed: false,
      continuation: 'lost',
    },
    {
      ...binding,
      decision: 'rejected',
      outcome: 'not_applied',
      replayed: true,
      continuation: 'continued',
    },
    {
      ...binding,
      decision: 'revision_requested',
      outcome: 'replacement_pending',
      replayed: false,
      continuation: 'continued',
    },
  ] as const

  for (const response of responses) {
    assert.deepEqual(decodeProductReviewResponse(response), response)
  }

  for (const invalid of [
    { ...responses[0], outcome: 'not_applied' },
    { ...responses[1], outcome: 'applied' },
    { ...responses[2], outcome: 'applied' },
    { ...responses[2], decision: 'revised' },
    { ...responses[0], continuation: 'unknown' },
    { ...responses[2], continuation: 'lost' },
    { ...responses[2], nativeRequestId: 42 },
  ]) {
    assert.throws(
      () => decodeProductReviewResponse(invalid),
      ProductContractError,
    )
  }
})

test('private and unsettled value families are rejected by the shared owner', () => {
  const courseId = `course_${'a'.repeat(32)}`
  const bootstrap = {
    accountReadiness: { state: 'ready' },
    operationStatus: 'idle',
    workspace: {
      state: 'ready',
      confirmedRevision: 0,
      course: { id: courseId, displayName: '알고리즘' },
      materials: [],
      recovery: null,
    },
    history: {
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [],
    },
  } as const
  const privateBootstrapValues = [
    {
      ...bootstrap,
      workspace: { ...bootstrap.workspace, storeFormatVersion: 2 },
    },
    {
      ...bootstrap,
      history: {
        ...bootstrap.history,
        statePatches: [
          {
            id: `patch_${'b'.repeat(32)}`,
            courseId,
            baseRevision: 0,
            status: 'pending',
            createdAt: '2026-07-20T00:00:00.000Z',
            applyOutcome: null,
          },
        ],
      },
    },
    { ...bootstrap, nativeRequestId: 42 },
    { ...bootstrap, mcpToken: 'private-token' },
    { ...bootstrap, traceback: '/private/server.ts:10' },
  ]

  for (const value of privateBootstrapValues) {
    assert.throws(() => decodeProductBootstrap(value), ProductContractError)
  }
})

test('settled Run history owns retry ancestry and exact recovery state', () => {
  const courseId = `course_${'a'.repeat(32)}`
  const runId = `run_${'b'.repeat(32)}`
  const bootstrap = {
    accountReadiness: { state: 'ready' },
    operationStatus: 'idle',
    workspace: {
      state: 'ready',
      confirmedRevision: 0,
      course: { id: courseId, displayName: '알고리즘' },
      materials: [],
      recovery: null,
    },
    history: {
      assignments: [],
      statePatches: [],
      userConfirmations: [],
      modelingRuns: [
        {
          id: runId,
          actionId: `action_${'c'.repeat(32)}`,
          courseId,
          recipe: {
            name: 'first-assignment',
            version: FIRST_ASSIGNMENT_RECIPE_VERSION,
            requestedSkillName: 'ay-ple-first-assignment',
          },
          sources: [
            { materialId: `material_${'d'.repeat(32)}`, digest: 'e'.repeat(64) },
            { materialId: `material_${'f'.repeat(32)}`, digest: '0'.repeat(64) },
          ],
          retryOfRunId: null,
          recovery: { outcome: 'interrupted', retryable: true },
          status: 'interrupted',
          validationOutcome: 'passed',
          createdAt: '2026-07-20T00:00:00.000Z',
          updatedAt: '2026-07-20T00:01:00.000Z',
          settledAt: '2026-07-20T00:01:00.000Z',
        },
      ],
    },
  } as const

  assert.deepEqual(decodeProductBootstrap(bootstrap), bootstrap)
  assert.throws(
    () =>
      decodeProductBootstrap({
        ...bootstrap,
        history: {
          ...bootstrap.history,
          modelingRuns: [
            {
              ...bootstrap.history.modelingRuns[0],
              recovery: {
                outcome: 'continuation_lost',
                retryable: true,
                confirmedRevision: 1,
              },
            },
          ],
        },
      }),
    ProductContractError,
  )
  for (const invalidRun of [
    { ...bootstrap.history.modelingRuns[0], retryOfRunId: runId },
    { ...bootstrap.history.modelingRuns[0], status: 'completed' },
  ]) {
    assert.throws(
      () =>
        decodeProductBootstrap({
          ...bootstrap,
          history: { ...bootstrap.history, modelingRuns: [invalidRun] },
        }),
      ProductContractError,
    )
  }
})

function decodeRequest(value: unknown): unknown {
  try {
    return decodeFirstAssignmentRequest(value)
  } catch {
    return decodeProductChatRequest(value)
  }
}
