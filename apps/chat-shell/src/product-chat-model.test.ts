import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ProductOperationFrame,
  ProductStatePatch,
} from './product-api.js'
import {
  canRespondToProductClarification,
  canRespondToProductReview,
  canRespondToProductSemanticReview,
  createInitialProductChatState,
  reduceProductChatState,
  type ProductChatState,
} from './product-chat-model.js'

type ProductTerminalFrame = Extract<
  ProductOperationFrame,
  { readonly type: 'operation.terminal' }
>
type AssignmentTerminalFrame = Extract<
  ProductTerminalFrame,
  { readonly runId: string }
>
type ChatTerminalFrame = Exclude<
  ProductTerminalFrame,
  AssignmentTerminalFrame
>

const actionId = `action_${'a'.repeat(32)}`
const chatId = `chat_${'b'.repeat(32)}`
const runId = `run_${'c'.repeat(32)}`
const planActivityId = `activity_${'d'.repeat(32)}`
const mcpActivityId = `activity_${'e'.repeat(32)}`
const agentActivityId = `activity_${'f'.repeat(32)}`
const interactionId = `interaction_${'1'.repeat(32)}`
const decisionKey = `decision_${'2'.repeat(32)}`
const patchId = `patch_${'3'.repeat(32)}`
const replacementInteractionId = `interaction_${'9'.repeat(32)}`
const replacementDecisionKey = `decision_${'a'.repeat(32)}`
const replacementPatchId = `patch_${'b'.repeat(32)}`
const replacementActivityId = `activity_${'c'.repeat(32)}`
const questionId = `question_${'4'.repeat(32)}`
const targetOperationId = `operation_${'5'.repeat(32)}`
const semanticInteractionId = `interaction_${'6'.repeat(32)}`
const replacementSemanticInteractionId = `interaction_${'7'.repeat(32)}`
const noticeMaterial = {
  id: `material_${'5'.repeat(32)}`,
  digest: '6'.repeat(64),
}
const syllabusMaterial = {
  id: `material_${'7'.repeat(32)}`,
  digest: '8'.repeat(64),
}

test('appends fresh semantic Reviews and settles only from exact Review frames', () => {
  let state = acceptedChatState()
  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: semanticReviewRequested(semanticInteractionId),
  })
  const first = state.activeOperation?.semanticReview
  assert.ok(first)
  assert.equal(state.phase, 'awaiting-review')
  assert.equal(canRespondToProductSemanticReview(state, first), true)

  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: {
      type: 'review.resolved',
      operationId: targetOperationId,
      interactionId: semanticInteractionId,
      result: {
        outcome: 'revise',
        feedback: '마감 근거를 다시 확인해 주세요.',
      },
    },
  })
  assert.equal(state.phase, 'running')
  assert.equal(state.activeOperation?.semanticReview, undefined)
  assert.equal(canRespondToProductSemanticReview(state, first), false)

  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: semanticReviewRequested(replacementSemanticInteractionId),
  })
  const reviews = state.transcript.filter(
    (entry) => entry.kind === 'semantic-review',
  )
  assert.equal(reviews.length, 2)
  assert.equal(reviews[0]?.kind, 'semantic-review')
  if (reviews[0]?.kind === 'semantic-review') {
    assert.deepEqual(reviews[0].result, {
      outcome: 'revise',
      feedback: '마감 근거를 다시 확인해 주세요.',
    })
  }
  assert.equal(reviews[1]?.kind, 'semantic-review')
  if (reviews[1]?.kind === 'semantic-review') {
    assert.equal(reviews[1].result, undefined)
    assert.equal(reviews[1].failureReason, undefined)
  }
})

test('leaves a control-free semantic Review card after continuity failure', () => {
  let state = acceptedChatState()
  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: semanticReviewRequested(semanticInteractionId),
  })
  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: {
      type: 'review.failed',
      operationId: targetOperationId,
      interactionId: semanticInteractionId,
      reason: 'turn_interrupted',
    },
  })

  assert.equal(state.phase, 'running')
  assert.equal(state.activeOperation?.semanticReview, undefined)
  const review = state.transcript.find(
    (entry) => entry.kind === 'semantic-review',
  )
  assert.equal(review?.kind, 'semantic-review')
  if (review?.kind === 'semantic-review') {
    assert.equal(review.result, undefined)
    assert.equal(review.failureReason, 'turn_interrupted')
  }
})

test('reconciles the cumulative Assignment activity and exact pending Review binding', () => {
  let state = createInitialProductChatState()
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'assignment',
    materials: [noticeMaterial, syllabusMaterial],
  })
  state = applyFrames(state, [
    { type: 'operation.preparing', operationId: actionId, runId },
    { type: 'operation.accepted', operationId: actionId, runId },
    {
      type: 'skill.requested',
      operationId: actionId,
      skill: { name: 'ay-ple-first-assignment', version: '1' },
    },
    {
      type: 'plan.delta',
      operationId: actionId,
      activityId: planActivityId,
      delta: '두 자료의 ',
    },
    {
      type: 'plan.completed',
      operationId: actionId,
      activityId: planActivityId,
      text: '두 자료의 과제 정보를 확인합니다.',
    },
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId: mcpActivityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: actionId,
      activityId: mcpActivityId,
      tool: 'propose_state_patch',
      patch: assignmentPatch(),
    },
    {
      type: 'review.requested',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      patch: assignmentPatch(),
      questions: [
        {
          id: 'assignment_review_decision',
          header: '변경 제안 검토',
          question: '이 변경 제안을 반영할까요?',
          options: null,
          acceptsFreeform: true,
        },
      ],
    },
  ])

  assert.equal(state.phase, 'awaiting-review')
  assert.deepEqual(state.activeOperation?.review, {
    operationId: actionId,
    interactionId,
    patchId,
    decisionKey,
    patch: assignmentPatch(),
    questions: [
      {
        id: 'assignment_review_decision',
        header: '변경 제안 검토',
        question: '이 변경 제안을 반영할까요?',
        options: null,
        acceptsFreeform: true,
      },
    ],
  })
  assert.deepEqual(
    state.transcript.map((entry) => entry.kind),
    ['operation', 'skill', 'plan', 'mcp', 'review'],
  )
  const plan = state.transcript.find((entry) => entry.kind === 'plan')
  assert.equal(plan?.kind, 'plan')
  if (plan?.kind === 'plan') {
    assert.equal(plan.text, '두 자료의 과제 정보를 확인합니다.')
    assert.equal(plan.status, 'completed')
  }
})

test('keeps Review and general clarification on separate bindings in one cumulative stream', () => {
  let state = createInitialProductChatState()
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'chat',
    text: '제출 전에 무엇을 확인해야 해?',
    materials: [],
  })
  state = applyFrames(state, [
    { type: 'operation.preparing', operationId: chatId },
    { type: 'operation.accepted', operationId: chatId },
    {
      type: 'interaction.requested',
      operationId: chatId,
      interactionId,
      questions: [
        {
          id: questionId,
          header: '범위',
          question: '어느 항목을 먼저 볼까요?',
          options: [
            { label: '마감', description: '마감을 먼저 확인합니다.' },
            { label: '제출 방식', description: '제출 방식을 먼저 확인합니다.' },
          ],
          acceptsFreeform: true,
        },
      ],
    },
  ])

  assert.equal(state.phase, 'awaiting-clarification')
  assert.equal(state.activeOperation?.review, undefined)
  assert.deepEqual(state.activeOperation?.interaction, {
    operationId: chatId,
    interactionId,
    questions: [
      {
        id: questionId,
        header: '범위',
        question: '어느 항목을 먼저 볼까요?',
        options: [
          { label: '마감', description: '마감을 먼저 확인합니다.' },
          { label: '제출 방식', description: '제출 방식을 먼저 확인합니다.' },
        ],
        acceptsFreeform: true,
      },
    ],
  })

  state = applyFrames(state, [
    {
      type: 'interaction.resolved',
      operationId: chatId,
      interactionId,
      resolution: 'cancelled',
    },
    {
      type: 'agent_message.completed',
      operationId: chatId,
      activityId: agentActivityId,
      text: '다음 메시지에서 다시 물어볼게요.',
    },
    {
      type: 'operation.terminal',
      operationId: chatId,
      status: 'completed',
    },
  ])
  state = reduceProductChatState(state, { type: 'operation.stream-ended' })

  assert.equal(state.phase, 'completed')
  assert.equal(state.activeOperation, undefined)
  const clarification = state.transcript.find(
    (entry) => entry.kind === 'clarification',
  )
  assert.equal(clarification?.kind, 'clarification')
  if (clarification?.kind === 'clarification') {
    assert.equal(clarification.resolution, 'cancelled')
  }
})

test('fails closed when Review evidence cites an unselected material', () => {
  let state = acceptedAssignmentState()
  const original = assignmentPatch()
  const patch: ProductStatePatch = {
    ...original,
    evidence: original.evidence.map((evidence, index) =>
      index === 0
        ? {
            ...evidence,
            rawMaterialId: `material_${'9'.repeat(32)}`,
            digest: '0'.repeat(64),
          }
        : evidence,
    ),
  }

  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: {
      type: 'review.requested',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      patch,
      questions: [],
    },
  })

  assert.equal(state.phase, 'stream-failed')
  assert.equal(state.activeOperation, undefined)
  assert.equal(state.failure?.code, 'invalid_product_stream')
})

test('fails closed when MCP reuses a Plan or Agent activity identity', () => {
  let state = acceptedAssignmentState()
  state = applyFrames(state, [
    {
      type: 'plan.completed',
      operationId: actionId,
      activityId: mcpActivityId,
      text: '선택 자료를 확인했습니다.',
    },
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId: mcpActivityId,
      tool: 'propose_state_patch',
    },
  ])

  assert.equal(state.phase, 'stream-failed')
  assert.equal(state.activeOperation, undefined)
  assert.equal(state.failure?.code, 'invalid_product_stream')
})

test('requires an authoritative terminal before the product stream can end', () => {
  let state = acceptedAssignmentState()
  state = reduceProductChatState(state, { type: 'operation.stream-ended' })

  assert.equal(state.phase, 'stream-failed')
  assert.equal(state.activeOperation, undefined)
})

test('enforces the Assignment terminal matrix across native acceptance', () => {
  for (const [status, outcome, phase] of [
    ['not_accepted', 'failed', 'failed'],
    ['acceptance_unknown', 'unknown', 'unknown'],
    ['failed', 'failed', 'failed'],
    ['unknown', 'unknown', 'unknown'],
  ] as const) {
    assertTerminalPhase(
      preparingAssignmentState(),
      assignmentTerminal(status, outcome),
      phase,
    )
  }

  for (const [status, outcome] of [
    ['completed', 'passed'],
    ['interrupted', 'unknown'],
  ] as const) {
    assertInvalidTerminal(
      preparingAssignmentState(),
      assignmentTerminal(status, outcome),
    )
  }

  for (const [status, outcome, phase] of [
    ['completed', 'passed', 'completed'],
    ['failed', 'failed', 'failed'],
    ['interrupted', 'unknown', 'interrupted'],
    ['unknown', 'unknown', 'unknown'],
  ] as const) {
    assertTerminalPhase(
      acceptedAssignmentState(),
      assignmentTerminal(status, outcome),
      phase,
    )
  }

  for (const [status, outcome] of [
    ['not_accepted', 'failed'],
    ['acceptance_unknown', 'unknown'],
  ] as const) {
    assertInvalidTerminal(
      acceptedAssignmentState(),
      assignmentTerminal(status, outcome),
    )
  }
})

test('accepts recovery only for the exact Assignment and closes the pending Review', () => {
  for (const frame of [
    {
      type: 'operation.recovery',
      operationId: chatId,
      runId,
      outcome: 'interrupted',
      retryable: true,
    },
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId: `run_${'0'.repeat(32)}`,
      outcome: 'interrupted',
      retryable: true,
    },
  ] as const satisfies readonly ProductOperationFrame[]) {
    assertInvalidProductStream(applyFrames(pendingReviewState(), [frame]))
  }

  for (const recovery of [
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
  ] as const satisfies readonly ProductOperationFrame[]) {
    let state = pendingReviewState()
    const review = state.activeOperation!.review!

    state = applyFrames(state, [recovery])

    assert.equal(state.phase, recovery.outcome)
    assert.deepEqual(state.recovery, recovery)
    assert.equal(state.activeOperation?.review, undefined)
    assert.equal(canRespondToProductReview(state, review), false)

    state = applyFrames(state, [
      assignmentTerminal(recovery.outcome, 'unknown'),
    ])
    assert.equal(state.phase, recovery.outcome)
    assert.equal(state.activeOperation, undefined)
    assert.deepEqual(state.recovery, recovery)
  }
})

test('fails closed when recovery arrives after the authoritative terminal', () => {
  const terminal = applyFrames(acceptedAssignmentState(), [
    assignmentTerminal('completed', 'passed'),
  ])
  const state = applyFrames(terminal, [
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId,
      outcome: 'interrupted',
      retryable: true,
    },
  ])

  assertInvalidProductStream(state)
})

test('reconciles settled recovery when the native acceptance frame was lost', () => {
  for (const [recovery, terminal, phase] of [
    [
      {
        type: 'operation.recovery',
        operationId: actionId,
        runId,
        outcome: 'unknown',
        retryable: true,
      },
      assignmentTerminal('unknown', 'unknown'),
      'unknown',
    ],
    [
      {
        type: 'operation.recovery',
        operationId: actionId,
        runId,
        outcome: 'interrupted',
        retryable: true,
      },
      assignmentTerminal('interrupted', 'unknown'),
      'interrupted',
    ],
    [
      {
        type: 'operation.recovery',
        operationId: actionId,
        runId,
        outcome: 'continuation_lost',
        retryable: false,
        confirmedRevision: 1,
      },
      assignmentTerminal('unknown', 'unknown'),
      'continuation-lost',
    ],
  ] as const satisfies readonly [
    ProductOperationFrame,
    ProductOperationFrame,
    ProductChatState['phase'],
  ][]) {
    const state = applyFrames(preparingAssignmentState(), [recovery, terminal])

    assert.equal(state.phase, phase)
    assert.equal(state.activeOperation, undefined)
    assert.deepEqual(state.recovery, recovery)
  }
})

test('preserves confirmed continuation loss after the unknown terminal', () => {
  const recovery = {
    type: 'operation.recovery',
    operationId: actionId,
    runId,
    outcome: 'continuation_lost',
    retryable: false,
    confirmedRevision: 1,
  } as const satisfies ProductOperationFrame
  let state = pendingReviewState()
  const review = state.activeOperation!.review!

  state = applyFrames(state, [recovery])

  assert.equal(state.phase, 'continuation-lost')
  assert.deepEqual(state.recovery, recovery)
  assert.equal(state.activeOperation?.review, undefined)
  assert.equal(canRespondToProductReview(state, review), false)

  state = applyFrames(state, [assignmentTerminal('unknown', 'unknown')])

  assert.equal(state.phase, 'continuation-lost')
  assert.equal(state.activeOperation, undefined)
  assert.deepEqual(state.recovery, recovery)
})

test('allows one fresh Review on an explicit retry after the interrupted Review closes', () => {
  const retryActionId = `action_${'9'.repeat(32)}`
  const retryRunId = `run_${'8'.repeat(32)}`
  const retryPatch = { ...assignmentPatch(), id: replacementPatchId }
  let state = pendingReviewState()
  state = applyFrames(state, [
    {
      type: 'operation.recovery',
      operationId: actionId,
      runId,
      outcome: 'interrupted',
      retryable: true,
    },
    assignmentTerminal('interrupted', 'unknown'),
  ])
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'assignment',
    materials: [noticeMaterial, syllabusMaterial],
  })
  state = applyFrames(state, [
    {
      type: 'operation.preparing',
      operationId: retryActionId,
      runId: retryRunId,
    },
    {
      type: 'operation.accepted',
      operationId: retryActionId,
      runId: retryRunId,
    },
    {
      type: 'mcp_call.started',
      operationId: retryActionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: retryActionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
      patch: retryPatch,
    },
    {
      type: 'review.requested',
      operationId: retryActionId,
      interactionId: replacementInteractionId,
      patchId: replacementPatchId,
      decisionKey: replacementDecisionKey,
      patch: retryPatch,
      questions: [],
    },
  ])

  assert.equal(state.phase, 'awaiting-review')
  assert.equal(state.activeOperation?.review?.operationId, retryActionId)
  assert.equal(
    state.transcript.filter((entry) => entry.kind === 'review').length,
    2,
  )
})

test('enforces the Chat terminal matrix across native acceptance', () => {
  for (const [status, phase] of [
    ['not_accepted', 'failed'],
    ['unknown', 'unknown'],
  ] as const) {
    assertTerminalPhase(preparingChatState(), chatTerminal(status), phase)
  }

  for (const status of ['completed', 'failed', 'interrupted'] as const) {
    assertInvalidTerminal(preparingChatState(), chatTerminal(status))
  }

  for (const [status, phase] of [
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['interrupted', 'interrupted'],
    ['unknown', 'unknown'],
  ] as const) {
    assertTerminalPhase(acceptedChatState(), chatTerminal(status), phase)
  }

  assertInvalidTerminal(acceptedChatState(), chatTerminal('not_accepted'))
})

test('keeps a clarification resolution in stopping until terminal settlement', () => {
  const normallyResolved = applyFrames(pendingClarificationState(), [
    clarificationResolved(),
  ])
  assert.equal(normallyResolved.phase, 'running')
  assert.equal(normallyResolved.activeOperation?.stage, 'running')

  let state = reduceProductChatState(pendingClarificationState(), {
    type: 'operation.interrupt-requested',
    operationId: chatId,
  })
  state = applyFrames(state, [clarificationResolved()])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.interaction, undefined)
  const clarification = state.transcript.find(
    (entry) => entry.kind === 'clarification',
  )
  assert.equal(clarification?.kind, 'clarification')
  if (clarification?.kind === 'clarification') {
    assert.equal(clarification.resolution, 'cancelled')
  }

  state = applyFrames(state, [chatTerminal('interrupted')])
  assert.equal(state.phase, 'interrupted')
  assert.equal(state.activeOperation, undefined)
})

test('keeps stopping when a clarification request arrives after interrupt', () => {
  const pending = pendingClarificationState()
  assert.equal(
    canRespondToProductClarification(
      pending,
      pending.activeOperation!.interaction!,
    ),
    true,
  )

  let state = reduceProductChatState(acceptedChatState(), {
    type: 'operation.interrupt-requested',
    operationId: chatId,
  })
  state = applyFrames(state, [clarificationRequested()])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.interaction?.interactionId, interactionId)
  assert.equal(
    canRespondToProductClarification(
      state,
      state.activeOperation!.interaction!,
    ),
    false,
  )
  const recoveredWithClarification = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: chatId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(recoveredWithClarification.phase, 'awaiting-clarification')
  assert.equal(
    recoveredWithClarification.activeOperation?.stage,
    'awaiting-clarification',
  )
  assert.equal(
    canRespondToProductClarification(
      recoveredWithClarification,
      recoveredWithClarification.activeOperation!.interaction!,
    ),
    true,
  )

  state = applyFrames(state, [
    {
      type: 'interrupt.acknowledged',
      operationId: chatId,
    },
    clarificationResolved(),
  ])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.interaction, undefined)
  const recoveredAfterResolution = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: chatId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(recoveredAfterResolution.phase, 'stopping')
  assert.equal(recoveredAfterResolution.activeOperation?.stage, 'stopping')

  state = recoveredAfterResolution
  state = applyFrames(state, [chatTerminal('interrupted')])
  assert.equal(state.phase, 'interrupted')
  assert.equal(state.activeOperation, undefined)
})

test('keeps an acknowledged interrupt sticky across a late clarification and HTTP failure', () => {
  let state = reduceProductChatState(acceptedChatState(), {
    type: 'operation.interrupt-requested',
    operationId: chatId,
  })
  state = applyFrames(state, [
    {
      type: 'interrupt.acknowledged',
      operationId: chatId,
    },
    clarificationRequested(),
  ])

  const failedInterrupt = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: chatId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })

  assert.equal(failedInterrupt.phase, 'stopping')
  assert.equal(failedInterrupt.activeOperation?.stage, 'stopping')
  assert.equal(
    canRespondToProductClarification(
      failedInterrupt,
      failedInterrupt.activeOperation!.interaction!,
    ),
    false,
  )
})

test('recovers only a matching pre-ack interrupt failure and honors a later acknowledgement', () => {
  const accepted = acceptedChatState()
  const mismatchedRequest = reduceProductChatState(accepted, {
    type: 'operation.interrupt-requested',
    operationId: actionId,
  })
  assert.equal(mismatchedRequest, accepted)

  let state = reduceProductChatState(accepted, {
    type: 'operation.interrupt-requested',
    operationId: chatId,
  })
  const mismatchedFailure = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: actionId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(mismatchedFailure, state)

  state = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: chatId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(state.phase, 'running')
  assert.equal(state.activeOperation?.stage, 'running')
  assert.equal(state.controlFailure?.code, 'interrupt_failed')

  state = applyFrames(state, [
    {
      type: 'interrupt.acknowledged',
      operationId: chatId,
    },
  ])
  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.controlFailure, undefined)

  const terminal = applyFrames(state, [chatTerminal('interrupted')])
  const lateFailure = reduceProductChatState(terminal, {
    type: 'operation.interrupt-failed',
    operationId: chatId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(lateFailure, terminal)
})

test('keeps a Review resolution in stopping until terminal settlement', () => {
  const normallyResolved = applyFrames(pendingReviewState(), [reviewResolved()])
  assert.equal(normallyResolved.phase, 'running')
  assert.equal(normallyResolved.activeOperation?.stage, 'running')

  let state = reduceProductChatState(pendingReviewState(), {
    type: 'operation.interrupt-requested',
    operationId: actionId,
  })
  state = applyFrames(state, [reviewResolved()])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.review, undefined)
  const review = state.transcript.find((entry) => entry.kind === 'review')
  assert.equal(review?.kind, 'review')
  if (review?.kind === 'review') {
    assert.equal(review.outcome, 'accepted')
  }

  state = applyFrames(state, [assignmentTerminal('interrupted', 'unknown')])
  assert.equal(state.phase, 'interrupted')
  assert.equal(state.activeOperation, undefined)
})

test('keeps stopping when a Review request arrives after interrupt acknowledgement', () => {
  const pending = pendingReviewState()
  assert.equal(
    canRespondToProductReview(pending, pending.activeOperation!.review!),
    true,
  )

  let state = reviewReadyState()
  state = reduceProductChatState(state, {
    type: 'operation.interrupt-requested',
    operationId: actionId,
  })
  state = applyFrames(state, [
    {
      type: 'interrupt.acknowledged',
      operationId: actionId,
    },
    reviewRequested(),
  ])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.review?.interactionId, interactionId)
  assert.equal(
    canRespondToProductReview(state, state.activeOperation!.review!),
    false,
  )
  const failedResponse = reduceProductChatState(state, {
    type: 'operation.control-failed',
    failure: {
      code: 'review_failed',
      displayMessage: '변경 제안의 반영 결과를 확인하지 못했습니다.',
    },
  })
  assert.equal(failedResponse.phase, 'stopping')
  assert.equal(failedResponse.activeOperation?.stage, 'stopping')
  assert.equal(
    canRespondToProductReview(
      failedResponse,
      failedResponse.activeOperation!.review!,
    ),
    false,
  )
  const recoveredWithReview = reduceProductChatState(state, {
    type: 'operation.interrupt-failed',
    operationId: actionId,
    failure: {
      code: 'interrupt_failed',
      displayMessage: '작업 중단 요청을 전달하지 못했습니다.',
    },
  })
  assert.equal(recoveredWithReview.phase, 'stopping')
  assert.equal(recoveredWithReview.activeOperation?.stage, 'stopping')
  assert.equal(
    canRespondToProductReview(
      recoveredWithReview,
      recoveredWithReview.activeOperation!.review!,
    ),
    false,
  )

  state = applyFrames(recoveredWithReview, [reviewResolved()])

  assert.equal(state.phase, 'stopping')
  assert.equal(state.activeOperation?.stage, 'stopping')
  assert.equal(state.activeOperation?.review, undefined)

  state = applyFrames(state, [assignmentTerminal('unknown', 'unknown')])
  assert.equal(state.phase, 'unknown')
  assert.equal(state.activeOperation, undefined)
})

test('settles Review only when operation, interaction, patch, and decision binding all match', () => {
  let state = pendingReviewState()
  state = reduceProductChatState(state, {
    type: 'operation.frame',
    frame: {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey: `decision_${'a'.repeat(32)}`,
      outcome: 'accepted',
    },
  })
  assert.equal(state.phase, 'stream-failed')

  state = pendingReviewState()
  state = applyFrames(state, [
    {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      outcome: 'accepted',
    },
    {
      type: 'agent_message.completed',
      operationId: actionId,
      activityId: agentActivityId,
      text: '과제 정보를 반영했습니다.',
    },
    {
      type: 'operation.terminal',
      operationId: actionId,
      runId,
      status: 'completed',
      validationOutcome: 'passed',
    },
  ])
  state = reduceProductChatState(state, { type: 'operation.stream-ended' })
  assert.equal(state.phase, 'completed')
})

test('replaces one revised Review with one exact pending Review', () => {
  let state = pendingReviewState()
  state = applyFrames(state, [
    {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      outcome: 'revised',
    },
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: actionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
      patch: replacementPatch(),
    },
    {
      type: 'review.replaced',
      operationId: actionId,
      interactionId: replacementInteractionId,
      patchId: replacementPatchId,
      decisionKey: replacementDecisionKey,
      patch: replacementPatch(),
      questions: [],
      replaces: { interactionId, patchId, decisionKey },
    },
  ])

  assert.equal(state.phase, 'awaiting-review')
  assert.deepEqual(state.activeOperation?.review, {
    operationId: actionId,
    interactionId: replacementInteractionId,
    patchId: replacementPatchId,
    decisionKey: replacementDecisionKey,
    patch: replacementPatch(),
    questions: [],
  })
  const reviews = state.transcript.filter((entry) => entry.kind === 'review')
  assert.equal(reviews.length, 2)
  assert.equal(reviews[0]?.kind, 'review')
  if (reviews[0]?.kind === 'review') {
    assert.equal(reviews[0].outcome, 'revised')
  }
  assert.equal(reviews[1]?.kind, 'review')
  if (reviews[1]?.kind === 'review') {
    assert.equal(reviews[1].patch.id, replacementPatchId)
    assert.equal(reviews[1].outcome, undefined)
  }
})

test('fails closed when a replacement does not name the exact revised Review', () => {
  let state = pendingReviewState()
  state = applyFrames(state, [
    {
      type: 'review.resolved',
      operationId: actionId,
      interactionId,
      patchId,
      decisionKey,
      outcome: 'revised',
    },
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: actionId,
      activityId: replacementActivityId,
      tool: 'propose_state_patch',
      patch: replacementPatch(),
    },
    {
      type: 'review.replaced',
      operationId: actionId,
      interactionId: replacementInteractionId,
      patchId: replacementPatchId,
      decisionKey: replacementDecisionKey,
      patch: replacementPatch(),
      questions: [],
      replaces: {
        interactionId,
        patchId,
        decisionKey: `decision_${'f'.repeat(32)}`,
      },
    },
  ])

  assertInvalidProductStream(state)
})

function acceptedAssignmentState() {
  return applyFrames(preparingAssignmentState(), [
    { type: 'operation.accepted', operationId: actionId, runId },
  ])
}

function preparingAssignmentState() {
  let state = createInitialProductChatState()
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'assignment',
    materials: [noticeMaterial, syllabusMaterial],
  })
  return applyFrames(state, [
    { type: 'operation.preparing', operationId: actionId, runId },
  ])
}

function acceptedChatState() {
  return applyFrames(preparingChatState(), [
    { type: 'operation.accepted', operationId: chatId },
  ])
}

function preparingChatState() {
  let state = createInitialProductChatState()
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'chat',
    materials: [],
  })
  return applyFrames(state, [
    { type: 'operation.preparing', operationId: chatId },
  ])
}

function pendingClarificationState() {
  return applyFrames(acceptedChatState(), [clarificationRequested()])
}

function clarificationRequested(): ProductOperationFrame {
  return {
    type: 'interaction.requested',
    operationId: chatId,
    interactionId,
    questions: [
      {
        id: questionId,
        header: '범위',
        question: '어느 항목을 먼저 볼까요?',
        options: null,
        acceptsFreeform: true,
      },
    ],
  }
}

function reviewReadyState() {
  return applyFrames(acceptedAssignmentState(), [
    {
      type: 'mcp_call.started',
      operationId: actionId,
      activityId: mcpActivityId,
      tool: 'propose_state_patch',
    },
    {
      type: 'mcp_call.completed',
      operationId: actionId,
      activityId: mcpActivityId,
      tool: 'propose_state_patch',
      patch: assignmentPatch(),
    },
  ])
}

function pendingReviewState() {
  return applyFrames(reviewReadyState(), [reviewRequested()])
}

function reviewRequested(): ProductOperationFrame {
  return {
    type: 'review.requested',
    operationId: actionId,
    interactionId,
    patchId,
    decisionKey,
    patch: assignmentPatch(),
    questions: [],
  }
}

function semanticReviewRequested(interactionId: string) {
  return {
    type: 'review.requested' as const,
    operationId: targetOperationId,
    interactionId,
    review: {
      summary: '마감 정보를 정리합니다.',
      question: '이 변경 방향을 반영할까요?',
      changes: [
        {
          label: '마감',
          description: '강의계획서의 마감을 반영합니다.',
          before: '미정',
          after: '8월 3일',
          evidence: [
            {
              relativePath: 'materials/syllabus.txt',
              contentDigest: 'a'.repeat(64),
              quote: '8월 3일까지 제출',
              occurrence: 1,
              contextBefore: '과제는 ',
              contextAfter: '입니다.',
            },
          ],
        },
      ],
    },
  }
}

function applyFrames(
  state: ReturnType<typeof createInitialProductChatState>,
  frames: readonly ProductOperationFrame[],
) {
  return frames.reduce(
    (current, frame) =>
      reduceProductChatState(current, { type: 'operation.frame', frame }),
    state,
  )
}

function assignmentTerminal(
  status: AssignmentTerminalFrame['status'],
  validationOutcome: AssignmentTerminalFrame['validationOutcome'],
): AssignmentTerminalFrame {
  return {
    type: 'operation.terminal',
    operationId: actionId,
    runId,
    status,
    validationOutcome,
  }
}

function chatTerminal(status: ChatTerminalFrame['status']): ChatTerminalFrame {
  return { type: 'operation.terminal', operationId: chatId, status }
}

function clarificationResolved(): ProductOperationFrame {
  return {
    type: 'interaction.resolved',
    operationId: chatId,
    interactionId,
    resolution: 'cancelled',
  }
}

function reviewResolved(): ProductOperationFrame {
  return {
    type: 'review.resolved',
    operationId: actionId,
    interactionId,
    patchId,
    decisionKey,
    outcome: 'accepted',
  }
}

function assertTerminalPhase(
  state: ReturnType<typeof createInitialProductChatState>,
  frame: ProductTerminalFrame,
  expected: ReturnType<typeof createInitialProductChatState>['phase'],
) {
  const settled = applyFrames(state, [frame])
  assert.equal(settled.phase, expected)
  assert.equal(settled.activeOperation, undefined)
}

function assertInvalidTerminal(
  state: ReturnType<typeof createInitialProductChatState>,
  frame: ProductTerminalFrame,
) {
  assertInvalidProductStream(applyFrames(state, [frame]))
}

function assertInvalidProductStream(
  state: ReturnType<typeof createInitialProductChatState>,
) {
  assert.equal(state.phase, 'stream-failed')
  assert.equal(state.activeOperation, undefined)
  assert.equal(state.failure?.code, 'invalid_product_stream')
}

function assignmentPatch(): ProductStatePatch {
  return {
    id: patchId,
    summary: '선택 자료에서 과제 정보를 확인했습니다.',
    changes: {
      operation: 'assignment.upsert',
      values: {
        title: '개요 작성하기',
        dueAt: '2026-07-12T23:59:00+09:00',
        submissionMethod: 'LMS 과제함 업로드',
      },
    },
    evidence: [
      {
        field: 'title',
        rawMaterialId: syllabusMaterial.id,
        digest: syllabusMaterial.digest,
        quote: '과제: 개요 작성하기',
      },
      {
        field: 'dueAt',
        rawMaterialId: noticeMaterial.id,
        digest: noticeMaterial.digest,
        quote: '2026-07-12T23:59:00+09:00',
      },
      {
        field: 'submissionMethod',
        rawMaterialId: syllabusMaterial.id,
        digest: syllabusMaterial.digest,
        quote: '제출 방식: LMS 과제함 업로드',
      },
    ],
    status: 'pending',
  }
}

function replacementPatch(): ProductStatePatch {
  return {
    ...assignmentPatch(),
    id: replacementPatchId,
    summary: '수정 요청을 반영해 마감을 다시 확인했습니다.',
    changes: {
      ...assignmentPatch().changes,
      values: {
        ...assignmentPatch().changes.values,
        dueAt: '2026-07-13T23:59:00+09:00',
      },
    },
    evidence: assignmentPatch().evidence.map((evidence) =>
      evidence.field === 'dueAt'
        ? { ...evidence, quote: '2026-07-13T23:59:00+09:00' }
        : evidence,
    ),
  }
}
