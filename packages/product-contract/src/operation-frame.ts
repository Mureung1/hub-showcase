import {
  invalidContract,
  isAssignmentField,
  isAssignmentId,
  isDecisionKey,
  isDigest,
  isExactObject,
  isMaterialId,
  isNonEmptyString,
  isPatchId,
  isProductInteractionId,
  isProductOperationId,
  isProductQuestionId,
  isRecord,
  isRunId,
  isValidationOutcome,
  utf8Bytes,
} from './contract-values.js'
import {
  isProductOperationRecovery,
  type ProductOperationRecovery,
} from './recovery.js'
import type { ProductEvidenceRef } from './workspace.js'

export type ProductQuestion = {
  readonly id: string
  readonly header: string
  readonly question: string
  readonly options: readonly {
    readonly label: string
    readonly description: string
  }[] | null
  readonly acceptsFreeform: boolean
}

export type ProductStatePatch = {
  readonly id: string
  readonly summary: string
  readonly changes: {
    readonly operation: 'assignment.upsert'
    readonly assignmentId?: string
    readonly values: {
      readonly title: string
      readonly dueAt: string
      readonly submissionMethod: string
    }
  }
  readonly evidence: readonly {
    readonly field: ProductEvidenceRef['field']
    readonly rawMaterialId: string
    readonly digest: string
    readonly quote: string
  }[]
  readonly status: 'pending' | 'superseded' | 'applied' | 'rejected' | 'interrupted'
}

type ProductFrameBase = { readonly operationId: string }
type ProductActivityFrameBase = ProductFrameBase & {
  readonly activityId: string
}

export type AssignmentOperationSettlement = {
  readonly status:
    | 'not_accepted'
    | 'acceptance_unknown'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly validationOutcome: 'passed' | 'failed' | 'unknown'
  readonly failureCode?: string
}

export type ChatOperationSettlement = {
  readonly status:
    | 'not_accepted'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly failureCode?: string
}

export type ProductOperationFrame =
  | (ProductFrameBase & {
      readonly type: 'operation.preparing' | 'operation.accepted'
      readonly runId: string
    })
  | (ProductFrameBase & {
      readonly type: 'operation.preparing' | 'operation.accepted'
      readonly runId?: never
    })
  | (ProductFrameBase & {
      readonly type: 'skill.requested'
      readonly skill: { readonly name: string; readonly version: string }
    })
  | (ProductActivityFrameBase & {
      readonly type: 'agent_message.delta' | 'plan.delta'
      readonly delta: string
    })
  | (ProductActivityFrameBase & {
      readonly type: 'agent_message.completed' | 'plan.completed'
      readonly text: string
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.started'
      readonly tool: 'propose_state_patch'
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.completed'
      readonly tool: 'propose_state_patch'
      readonly patch: ProductStatePatch
    })
  | (ProductActivityFrameBase & {
      readonly type: 'mcp_call.failed'
      readonly tool: 'propose_state_patch'
      readonly displayMessage: string
    })
  | (ProductFrameBase &
      ProductOperationRecovery & {
        readonly type: 'operation.recovery'
        readonly runId: string
      })
  | (ProductFrameBase & {
      readonly type: 'interaction.requested'
      readonly interactionId: string
      readonly questions: readonly ProductQuestion[]
    })
  | (ProductFrameBase & {
      readonly type: 'review.requested'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly patch: ProductStatePatch
      readonly questions: readonly ProductQuestion[]
    })
  | (ProductFrameBase & {
      readonly type: 'review.replaced'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly patch: ProductStatePatch
      readonly questions: readonly ProductQuestion[]
      readonly replaces: {
        readonly interactionId: string
        readonly patchId: string
        readonly decisionKey: string
      }
    })
  | (ProductFrameBase & {
      readonly type: 'interaction.resolved'
      readonly interactionId: string
      readonly resolution: 'answered' | 'cancelled'
    })
  | (ProductFrameBase & {
      readonly type: 'review.resolved'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly outcome: 'accepted' | 'revised' | 'rejected' | 'cancelled'
    })
  | (ProductFrameBase & { readonly type: 'interrupt.acknowledged' })
  | (ProductFrameBase & {
      readonly type: 'operation.error'
      readonly code: string
      readonly displayMessage: string
      readonly willRetry: boolean
    })
  | (ProductFrameBase &
      AssignmentOperationSettlement & {
        readonly type: 'operation.terminal'
        readonly runId: string
      })
  | (ProductFrameBase &
      ChatOperationSettlement & {
        readonly type: 'operation.terminal'
        readonly runId?: never
      })

export function decodeProductOperationFrame(
  value: unknown,
): ProductOperationFrame {
  if (
    !isRecord(value) ||
    typeof value.type !== 'string' ||
    !isProductOperationId(value.operationId)
  ) {
    throw invalidContract()
  }
  switch (value.type) {
    case 'operation.preparing':
    case 'operation.accepted':
      if (value.operationId.startsWith('action_')) {
        requireExact(value, ['operationId', 'runId', 'type'])
        if (!isRunId(value.runId)) throw invalidContract()
      } else {
        requireExact(value, ['operationId', 'type'])
      }
      break
    case 'skill.requested':
      requireExact(value, ['operationId', 'skill', 'type'])
      if (
        !value.operationId.startsWith('action_') ||
        !isExactObject(value.skill, ['name', 'version']) ||
        !isNonEmptyString(value.skill.name) ||
        !isNonEmptyString(value.skill.version)
      ) {
        throw invalidContract()
      }
      break
    case 'agent_message.delta':
    case 'plan.delta':
      requireExact(value, ['activityId', 'delta', 'operationId', 'type'])
      if (!isActivityId(value.activityId) || !isProductText(value.delta)) {
        throw invalidContract()
      }
      break
    case 'agent_message.completed':
    case 'plan.completed':
      requireExact(value, ['activityId', 'operationId', 'text', 'type'])
      if (!isActivityId(value.activityId) || !isProductText(value.text)) {
        throw invalidContract()
      }
      break
    case 'mcp_call.started':
      requireExact(value, ['activityId', 'operationId', 'tool', 'type'])
      requireMcpFrameBase(value)
      break
    case 'mcp_call.completed':
      requireExact(value, [
        'activityId',
        'operationId',
        'patch',
        'tool',
        'type',
      ])
      requireMcpFrameBase(value)
      decodeProductStatePatch(value.patch)
      break
    case 'mcp_call.failed':
      requireExact(value, [
        'activityId',
        'displayMessage',
        'operationId',
        'tool',
        'type',
      ])
      requireMcpFrameBase(value)
      if (!isProductText(value.displayMessage)) throw invalidContract()
      break
    case 'operation.recovery':
      requireExact(value, [
        ...(value.outcome === 'continuation_lost'
          ? ['confirmedRevision']
          : []),
        'operationId',
        'outcome',
        'retryable',
        'runId',
        'type',
      ])
      if (
        !value.operationId.startsWith('action_') ||
        !isRunId(value.runId) ||
        !isProductOperationRecovery({
          outcome: value.outcome,
          retryable: value.retryable,
          ...(value.confirmedRevision === undefined
            ? {}
            : { confirmedRevision: value.confirmedRevision }),
        })
      ) {
        throw invalidContract()
      }
      break
    case 'interaction.requested':
      requireExact(value, [
        'interactionId',
        'operationId',
        'questions',
        'type',
      ])
      if (!isProductInteractionId(value.interactionId)) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'review.requested':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'operationId',
        'patch',
        'patchId',
        'questions',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey)
      ) {
        throw invalidContract()
      }
      if (decodeProductStatePatch(value.patch).id !== value.patchId) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'review.replaced':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'operationId',
        'patch',
        'patchId',
        'questions',
        'replaces',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey) ||
        !isExactObject(value.replaces, [
          'decisionKey',
          'interactionId',
          'patchId',
        ]) ||
        !isProductInteractionId(value.replaces.interactionId) ||
        !isPatchId(value.replaces.patchId) ||
        !isDecisionKey(value.replaces.decisionKey)
      ) {
        throw invalidContract()
      }
      if (decodeProductStatePatch(value.patch).id !== value.patchId) {
        throw invalidContract()
      }
      decodeProductQuestions(value.questions)
      break
    case 'interaction.resolved':
      requireExact(value, [
        'interactionId',
        'operationId',
        'resolution',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isProductResolution(value.resolution)
      ) {
        throw invalidContract()
      }
      break
    case 'review.resolved':
      requireExact(value, [
        'decisionKey',
        'interactionId',
        'outcome',
        'operationId',
        'patchId',
        'type',
      ])
      if (
        !isProductInteractionId(value.interactionId) ||
        !isPatchId(value.patchId) ||
        !isDecisionKey(value.decisionKey) ||
        !isProductReviewOutcome(value.outcome)
      ) {
        throw invalidContract()
      }
      break
    case 'interrupt.acknowledged':
      requireExact(value, ['operationId', 'type'])
      break
    case 'operation.error':
      requireExact(value, [
        'code',
        'displayMessage',
        'operationId',
        'type',
        'willRetry',
      ])
      if (
        !isNonEmptyString(value.code) ||
        !isProductText(value.displayMessage) ||
        typeof value.willRetry !== 'boolean'
      ) {
        throw invalidContract()
      }
      break
    case 'operation.terminal':
      decodeProductTerminalFrame(value)
      break
    default:
      throw invalidContract()
  }
  return value as unknown as ProductOperationFrame
}

export function decodeProductStatePatch(value: unknown): ProductStatePatch {
  if (
    !isExactObject(value, [
      'changes',
      'evidence',
      'id',
      'status',
      'summary',
    ]) ||
    !isPatchId(value.id) ||
    !isProductText(value.summary) ||
    !isProductPatchStatus(value.status) ||
    !Array.isArray(value.evidence) ||
    !value.evidence.every(isProductPatchEvidence) ||
    !isRecord(value.changes)
  ) {
    throw invalidContract()
  }
  const changeKeys = Object.hasOwn(value.changes, 'assignmentId')
    ? ['assignmentId', 'operation', 'values']
    : ['operation', 'values']
  if (
    !isExactObject(value.changes, changeKeys) ||
    value.changes.operation !== 'assignment.upsert' ||
    (Object.hasOwn(value.changes, 'assignmentId') &&
      !isAssignmentId(value.changes.assignmentId)) ||
    !isExactObject(value.changes.values, [
      'dueAt',
      'submissionMethod',
      'title',
    ]) ||
    !isProductText(value.changes.values.title) ||
    !isProductText(value.changes.values.dueAt) ||
    !isProductText(value.changes.values.submissionMethod)
  ) {
    throw invalidContract()
  }
  return value as unknown as ProductStatePatch
}

export function decodeProductQuestion(value: unknown): ProductQuestion {
  if (
    !isExactObject(value, [
      'acceptsFreeform',
      'header',
      'id',
      'options',
      'question',
    ]) ||
    !isPublicQuestionId(value.id) ||
    !isProductText(value.header) ||
    !isProductText(value.question) ||
    typeof value.acceptsFreeform !== 'boolean' ||
    (value.options !== null &&
      (!Array.isArray(value.options) ||
        !value.options.every(
          (option) =>
            isExactObject(option, ['description', 'label']) &&
            isProductText(option.label) &&
            isProductText(option.description),
        )))
  ) {
    throw invalidContract()
  }
  return value as unknown as ProductQuestion
}

function requireExact(
  value: Record<string, unknown>,
  expectedKeys: readonly string[],
): void {
  if (!isExactObject(value, expectedKeys)) throw invalidContract()
}

function requireMcpFrameBase(value: Record<string, unknown>): void {
  if (
    !isActivityId(value.activityId) ||
    value.tool !== 'propose_state_patch'
  ) {
    throw invalidContract()
  }
}

function decodeProductQuestions(value: unknown): readonly ProductQuestion[] {
  if (!Array.isArray(value)) throw invalidContract()
  return value.map(decodeProductQuestion)
}

function decodeProductTerminalFrame(value: Record<string, unknown>): void {
  const hasFailureCode = Object.hasOwn(value, 'failureCode')
  if (value.operationId?.toString().startsWith('action_')) {
    requireExact(value, [
      ...(hasFailureCode ? ['failureCode'] : []),
      'operationId',
      'runId',
      'status',
      'type',
      'validationOutcome',
    ])
    if (
      !isRunId(value.runId) ||
      !isAssignmentTerminalStatus(value.status) ||
      !isValidationOutcome(value.validationOutcome)
    ) {
      throw invalidContract()
    }
  } else {
    requireExact(value, [
      ...(hasFailureCode ? ['failureCode'] : []),
      'operationId',
      'status',
      'type',
    ])
    if (!isChatTerminalStatus(value.status)) throw invalidContract()
  }
  if (hasFailureCode && !isNonEmptyString(value.failureCode)) {
    throw invalidContract()
  }
}

function isProductPatchEvidence(
  value: unknown,
): value is ProductStatePatch['evidence'][number] {
  return (
    isExactObject(value, ['digest', 'field', 'quote', 'rawMaterialId']) &&
    isAssignmentField(value.field) &&
    isMaterialId(value.rawMaterialId) &&
    isDigest(value.digest) &&
    isProductText(value.quote)
  )
}

function isProductPatchStatus(
  value: unknown,
): value is ProductStatePatch['status'] {
  return (
    value === 'pending' ||
    value === 'superseded' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'interrupted'
  )
}

function isAssignmentTerminalStatus(
  value: unknown,
): value is AssignmentOperationSettlement['status'] {
  return (
    value === 'not_accepted' ||
    value === 'acceptance_unknown' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isChatTerminalStatus(
  value: unknown,
): value is ChatOperationSettlement['status'] {
  return (
    value === 'not_accepted' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isProductResolution(
  value: unknown,
): value is 'answered' | 'cancelled' {
  return value === 'answered' || value === 'cancelled'
}

function isProductReviewOutcome(
  value: unknown,
): value is 'accepted' | 'revised' | 'rejected' | 'cancelled' {
  return (
    value === 'accepted' ||
    value === 'revised' ||
    value === 'rejected' ||
    value === 'cancelled'
  )
}

function isActivityId(value: unknown): value is string {
  return typeof value === 'string' && /^activity_[0-9a-f]{32}$/.test(value)
}

function isProductText(value: unknown): value is string {
  return typeof value === 'string' && utf8Bytes(value) <= 128 * 1024
}

function isPublicQuestionId(value: unknown): value is string {
  return value === 'assignment_review_decision' || isProductQuestionId(value)
}
