import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCodexTurnSettings,
  isCodexSettingsSettled,
  reducePreparedProductFailure,
  reducePreparedProductFrame,
  type PreparedChatState,
  type PreparedClarificationEntry,
  type PreparedSemanticReviewEntry,
} from './use-prepared-product-chat.js'

test('maps one advertised prepared Chat selection to exact Turn settings', () => {
  const model = {
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
  } as const

  assert.deepEqual(createCodexTurnSettings(model, 'low', true), {
    model: 'gpt-current',
    reasoningEffort: 'low',
    serviceTier: 'fast',
  })
  assert.equal(createCodexTurnSettings(model, 'unknown', false), undefined)
})

test('unblocks prepared Chat after Codex settings load or fail', () => {
  assert.equal(isCodexSettingsSettled('idle'), false)
  assert.equal(isCodexSettingsSettled('loading'), false)
  assert.equal(isCodexSettingsSettled('loaded'), true)
  assert.equal(isCodexSettingsSettled('failed'), true)
})

test('settles a published semantic Review when the stream transport fails', () => {
  const requested = requestReview(activeChatState())

  const failed = reducePreparedProductFailure(
    requested,
    'AY 작업 흐름을 계속하지 못했습니다.',
  )

  assert.equal(failed.semanticReview, undefined)
  assert.deepEqual(reviewEntries(failed), [
    {
      ...requested.semanticReview,
      failure: 'transport_failed',
    },
  ])
})

test('settles an unresolved semantic Review on operation terminal', () => {
  const requested = requestReview(activeChatState())

  const terminal = reducePreparedProductFrame(requested, {
    type: 'operation.terminal',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    status: 'interrupted',
  })

  assert.equal(terminal.semanticReview, undefined)
  assert.deepEqual(reviewEntries(terminal), [
    {
      ...requested.semanticReview,
      failure: 'turn_interrupted',
    },
  ])
})

test('preserves an explicitly resolved semantic Review on later terminal', () => {
  const requested = requestReview(activeChatState())
  const resolved = reducePreparedProductFrame(requested, {
    type: 'review.resolved',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    interactionId: 'interaction_0123456789abcdef0123456789abcdef',
    result: { outcome: 'accept' },
  })

  const terminal = reducePreparedProductFrame(resolved, {
    type: 'operation.terminal',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    status: 'completed',
  })

  assert.deepEqual(reviewEntries(terminal), [
    {
      ...requested.semanticReview,
      result: { outcome: 'accept' },
    },
  ])
})

test('settles a published clarification when the stream transport fails', () => {
  const requested = requestClarification(activeChatState())

  const failed = reducePreparedProductFailure(
    requested,
    'AY 작업 흐름을 계속하지 못했습니다.',
  )

  assert.equal(failed.clarification, undefined)
  assert.deepEqual(clarificationEntries(failed), [
    {
      ...requested.clarification,
      failure: 'transport_failed',
    },
  ])
})

test('settles an unresolved clarification on operation terminal', () => {
  const requested = requestClarification(activeChatState())

  const terminal = reducePreparedProductFrame(requested, {
    type: 'operation.terminal',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    status: 'failed',
  })

  assert.equal(terminal.clarification, undefined)
  assert.deepEqual(clarificationEntries(terminal), [
    {
      ...requested.clarification,
      failure: 'runtime_terminated',
    },
  ])
})

test('preserves an explicitly resolved clarification on later terminal', () => {
  const requested = requestClarification(activeChatState())
  const resolved = reducePreparedProductFrame(requested, {
    type: 'interaction.resolved',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    interactionId: 'interaction_0123456789abcdef0123456789abcdef',
    resolution: 'answered',
  })

  const terminal = reducePreparedProductFrame(resolved, {
    type: 'operation.terminal',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    status: 'completed',
  })

  assert.deepEqual(clarificationEntries(terminal), [
    {
      ...requested.clarification,
      resolution: 'answered',
    },
  ])
})

function activeChatState(): PreparedChatState {
  return {
    phase: 'running',
    transcript: [],
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    accepted: true,
    terminal: false,
  }
}

function requestReview(state: PreparedChatState): PreparedChatState {
  return reducePreparedProductFrame(state, {
    type: 'review.requested',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    interactionId: 'interaction_0123456789abcdef0123456789abcdef',
    review: {
      summary: '과제 파일 변경',
      question: '이 변경을 반영할까요?',
      changes: [
        {
          label: '마감',
          description: '마감 정보를 갱신합니다.',
        },
      ],
    },
  })
}

function requestClarification(state: PreparedChatState): PreparedChatState {
  return reducePreparedProductFrame(state, {
    type: 'interaction.requested',
    operationId: 'operation_0123456789abcdef0123456789abcdef',
    interactionId: 'interaction_0123456789abcdef0123456789abcdef',
    questions: [
      {
        id: 'deadline',
        header: '마감',
        question: '마감 시각을 확인해 주세요.',
        acceptsFreeform: false,
        options: [
          {
            label: '23:59',
            description: '당일 자정 직전입니다.',
          },
          {
            label: '18:00',
            description: '업무 시간 종료입니다.',
          },
        ],
      },
    ],
  })
}

function reviewEntries(
  state: PreparedChatState,
): readonly PreparedSemanticReviewEntry[] {
  return state.transcript.filter(
    (entry): entry is PreparedSemanticReviewEntry =>
      entry.kind === 'semantic-review',
  )
}

function clarificationEntries(
  state: PreparedChatState,
): readonly PreparedClarificationEntry[] {
  return state.transcript.filter(
    (entry): entry is PreparedClarificationEntry =>
      entry.kind === 'clarification',
  )
}
