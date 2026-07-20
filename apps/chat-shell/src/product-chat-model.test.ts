import assert from 'node:assert/strict'
import test from 'node:test'

import type {
  ProductOperationFrame,
  ProductStatePatch,
} from './product-api.js'
import {
  createInitialProductChatState,
  reduceProductChatState,
} from './product-chat-model.js'

const actionId = `action_${'a'.repeat(32)}`
const chatId = `chat_${'b'.repeat(32)}`
const runId = `run_${'c'.repeat(32)}`
const planActivityId = `activity_${'d'.repeat(32)}`
const mcpActivityId = `activity_${'e'.repeat(32)}`
const agentActivityId = `activity_${'f'.repeat(32)}`
const interactionId = `interaction_${'1'.repeat(32)}`
const decisionKey = `decision_${'2'.repeat(32)}`
const patchId = `patch_${'3'.repeat(32)}`
const questionId = `question_${'4'.repeat(32)}`
const noticeMaterial = {
  id: `material_${'5'.repeat(32)}`,
  digest: '6'.repeat(64),
}
const syllabusMaterial = {
  id: `material_${'7'.repeat(32)}`,
  digest: '8'.repeat(64),
}

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

test('requires an authoritative terminal before the product stream can end', () => {
  let state = acceptedAssignmentState()
  state = reduceProductChatState(state, { type: 'operation.stream-ended' })

  assert.equal(state.phase, 'stream-failed')
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
      resolution: 'answered',
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
      resolution: 'answered',
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

function acceptedAssignmentState() {
  let state = createInitialProductChatState()
  state = reduceProductChatState(state, {
    type: 'operation.started',
    kind: 'assignment',
    materials: [noticeMaterial, syllabusMaterial],
  })
  return applyFrames(state, [
    { type: 'operation.preparing', operationId: actionId, runId },
    { type: 'operation.accepted', operationId: actionId, runId },
  ])
}

function pendingReviewState() {
  let state = acceptedAssignmentState()
  return applyFrames(state, [
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
      questions: [],
    },
  ])
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
