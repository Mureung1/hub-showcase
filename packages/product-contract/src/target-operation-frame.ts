import {
  invalidContract,
  isExactObject,
  isNonEmptyString,
  isProductInteractionId,
  isProductOperationId,
  isProductQuestionId,
  isRecord,
  utf8Bytes,
} from './contract-values.js'

export type TargetProductQuestion = {
  readonly id: string
  readonly header: string
  readonly question: string
  readonly options: readonly {
    readonly label: string
    readonly description: string
  }[] | null
  readonly acceptsFreeform: boolean
}

type TargetFrameBase = { readonly operationId: string }
type TargetActivityFrameBase = TargetFrameBase & {
  readonly activityId: string
}

export type TargetProductOperationFrame =
  | (TargetFrameBase & {
      readonly type: 'operation.preparing' | 'operation.accepted'
    })
  | (TargetActivityFrameBase & {
      readonly type: 'agent_message.delta' | 'plan.delta'
      readonly delta: string
    })
  | (TargetActivityFrameBase & {
      readonly type: 'agent_message.completed' | 'plan.completed'
      readonly text: string
    })
  | (TargetFrameBase & {
      readonly type: 'interaction.requested'
      readonly interactionId: string
      readonly questions: readonly TargetProductQuestion[]
    })
  | (TargetFrameBase & {
      readonly type: 'interaction.resolved'
      readonly interactionId: string
      readonly resolution: 'answered' | 'cancelled'
    })
  | (TargetFrameBase & {
      readonly type: 'interrupt.acknowledged'
    })
  | (TargetFrameBase & {
      readonly type: 'operation.error'
      readonly code: string
      readonly displayMessage: string
      readonly willRetry: boolean
    })
  | (TargetFrameBase & {
      readonly type: 'operation.terminal'
      readonly status:
        | 'not_accepted'
        | 'completed'
        | 'failed'
        | 'interrupted'
        | 'unknown'
      readonly failureCode?: string
    })

export function decodeTargetProductOperationFrame(
  value: unknown,
): TargetProductOperationFrame {
  if (
    !isRecord(value) ||
    !isProductOperationId(value.operationId) ||
    typeof value.type !== 'string'
  ) {
    throw invalidContract()
  }
  switch (value.type) {
    case 'operation.preparing':
    case 'operation.accepted':
    case 'interrupt.acknowledged':
      requireExact(value, ['operationId', 'type'])
      break
    case 'agent_message.delta':
    case 'plan.delta':
      requireExact(value, ['activityId', 'delta', 'operationId', 'type'])
      requireActivity(value.activityId)
      requireText(value.delta)
      break
    case 'agent_message.completed':
    case 'plan.completed':
      requireExact(value, ['activityId', 'operationId', 'text', 'type'])
      requireActivity(value.activityId)
      requireText(value.text)
      break
    case 'interaction.requested':
      requireExact(value, [
        'interactionId',
        'operationId',
        'questions',
        'type',
      ])
      requireInteraction(value.interactionId)
      if (!Array.isArray(value.questions)) throw invalidContract()
      value.questions.map(decodeTargetQuestion)
      break
    case 'interaction.resolved':
      requireExact(value, [
        'interactionId',
        'operationId',
        'resolution',
        'type',
      ])
      requireInteraction(value.interactionId)
      if (
        value.resolution !== 'answered' &&
        value.resolution !== 'cancelled'
      ) {
        throw invalidContract()
      }
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
        typeof value.willRetry !== 'boolean'
      ) {
        throw invalidContract()
      }
      requireText(value.displayMessage)
      break
    case 'operation.terminal': {
      const hasFailure = Object.hasOwn(value, 'failureCode')
      requireExact(value, [
        ...(hasFailure ? ['failureCode'] : []),
        'operationId',
        'status',
        'type',
      ])
      if (
        value.status !== 'not_accepted' &&
        value.status !== 'completed' &&
        value.status !== 'failed' &&
        value.status !== 'interrupted' &&
        value.status !== 'unknown'
      ) {
        throw invalidContract()
      }
      if (hasFailure && !isNonEmptyString(value.failureCode)) {
        throw invalidContract()
      }
      break
    }
    default:
      throw invalidContract()
  }
  return value as unknown as TargetProductOperationFrame
}

function decodeTargetQuestion(value: unknown): TargetProductQuestion {
  if (
    !isExactObject(value, [
      'acceptsFreeform',
      'header',
      'id',
      'options',
      'question',
    ]) ||
    !isProductQuestionId(value.id) ||
    typeof value.acceptsFreeform !== 'boolean'
  ) {
    throw invalidContract()
  }
  requireText(value.header)
  requireText(value.question)
  if (
    value.options !== null &&
    (!Array.isArray(value.options) ||
      !value.options.every(
        (option) =>
          isExactObject(option, ['description', 'label']) &&
          isProductText(option.label) &&
          isProductText(option.description),
      ))
  ) {
    throw invalidContract()
  }
  return value as unknown as TargetProductQuestion
}

function requireExact(
  value: Record<string, unknown>,
  keys: readonly string[],
): void {
  if (!isExactObject(value, keys)) throw invalidContract()
}

function requireActivity(value: unknown): void {
  if (
    typeof value !== 'string' ||
    !/^activity_[0-9a-f]{32}$/u.test(value)
  ) {
    throw invalidContract()
  }
}

function requireInteraction(value: unknown): void {
  if (!isProductInteractionId(value)) throw invalidContract()
}

function requireText(value: unknown): asserts value is string {
  if (!isProductText(value)) throw invalidContract()
}

function isProductText(value: unknown): value is string {
  return typeof value === 'string' && utf8Bytes(value) <= 128 * 1024
}
