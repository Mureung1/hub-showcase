import { createHash, randomUUID } from 'node:crypto'

import {
  CodexChatRuntimeError,
  type CodexProductActivity,
  type CodexProductTurn,
} from '@ay-ple/codex-chat-runtime'
import type {
  ProductCodexTurnSettings,
  ProductInteractionAnswerRequest,
  ProductReviewFrame,
  TargetProductOperationFrame,
  TargetProductQuestion,
} from '@ay-ple/product-contract'

import {
  CodexChatService,
  type CodexProductStreamSink,
  type ProductOperationLease,
  type ProductTurnSettlement,
} from './codex-chat-service.js'
import type { ActiveInteractionProductTurn } from './interaction-broker.js'
import {
  createProductTurnCoordinator,
  type ProductTurnLease,
  type ProductTurnReleaseAuthority,
} from './product-turn-coordinator.js'

export type PreparedProductOperationSink = {
  write(
    frame: TargetProductOperationFrame | ProductReviewFrame,
  ): Promise<boolean>
  end(): void
}

export type PreparedProductOperationOptions = {
  readonly disconnected: () => boolean
  readonly sink: PreparedProductOperationSink
}

export type PreparedProductOperationCoordinator = {
  operationStatus(): 'active' | 'idle'
  activeOperation(): {
    readonly operationId: string
    readonly kind: 'product_turn'
  } | null
  activeInteractionProductTurn(): ActiveInteractionProductTurn | undefined
  interruptInteractionProductTurn(
    turn: ActiveInteractionProductTurn,
  ): Promise<void>
  publishInteractionReview(frame: ProductReviewFrame): Promise<void>
  sendChat(
    input: {
      readonly text: string
      readonly codexSettings?: ProductCodexTurnSettings
    },
    options: PreparedProductOperationOptions,
  ): Promise<void>
  respondToInteraction(input: {
    readonly operationId: string
    readonly interactionId: string
    readonly response:
      | {
          readonly type: 'answer'
          readonly answers: ProductInteractionAnswerRequest['answers']
        }
      | { readonly type: 'cancel' }
  }): Promise<void>
  disconnect(operationId: string): void
  interrupt(operationId: string): Promise<void>
  beginShutdown(): void
}

type ActiveGeneralInteraction = {
  readonly publicInteractionId: string
  readonly nativeInteractionId: string
  readonly threadId: string
  readonly turnId: string
  readonly questions: ReadonlyMap<string, string>
  state: 'pending' | 'settling'
}

type ActiveOperation = {
  readonly operationId: string
  readonly serviceLease: ProductOperationLease
  readonly turnLease: ProductTurnLease
  readonly sink: PreparedProductOperationSink
  readonly redactions: string[]
  turn?: CodexProductTurn
  interaction?: ActiveGeneralInteraction
  releaseAuthority?: ProductTurnReleaseAuthority
}

export class PreparedProductOperationError extends Error {
  readonly code:
    | 'account_not_ready'
    | 'action_busy'
    | 'action_invalid'
    | 'action_unknown'
    | 'interaction_invalid'
    | 'product_unavailable'
  readonly status: number
  readonly displayMessage: string

  constructor(
    code: PreparedProductOperationError['code'],
    status: number,
    displayMessage: string,
  ) {
    super(code)
    this.name = 'PreparedProductOperationError'
    this.code = code
    this.status = status
    this.displayMessage = displayMessage
  }
}

export function createPreparedProductOperationCoordinator(options: {
  readonly service: CodexChatService
  readonly assertWorkspaceActive: () => void
  readonly interactionTurnTerminal?: () => Promise<void>
  readonly interactionRuntimeTerminal?: () => Promise<void>
}): PreparedProductOperationCoordinator {
  let active: ActiveOperation | undefined
  let shuttingDown = false
  const turnCoordinator = createProductTurnCoordinator({
    assertEligible: options.assertWorkspaceActive,
  })

  function reserve(
    operationId: string,
    sink: PreparedProductOperationSink,
  ): ActiveOperation {
    if (shuttingDown || active) {
      throw new PreparedProductOperationError(
        active ? 'action_busy' : 'product_unavailable',
        active ? 409 : 503,
        active
          ? '다른 AY 작업이 진행 중입니다.'
          : 'AY 작업공간을 사용할 수 없습니다.',
      )
    }
    let turnLease: ProductTurnLease
    try {
      turnLease = turnCoordinator.claimProductTurn({
        operationId,
      })
    } catch {
      throw unavailable()
    }
    let serviceLease: ProductOperationLease
    try {
      serviceLease = options.service.reserveProductOperation(operationId)
    } catch {
      turnCoordinator.release(turnLease, 'start_failed')
      throw unavailable()
    }
    const operation: ActiveOperation = {
      operationId,
      serviceLease,
      turnLease,
      sink,
      redactions: [],
      releaseAuthority: 'start_failed',
    }
    active = operation
    return operation
  }

  async function release(operation: ActiveOperation): Promise<void> {
    try {
      await options.service.releaseProductOperation(operation.serviceLease)
    } finally {
      if (operation.releaseAuthority) {
        turnCoordinator.release(operation.turnLease, operation.releaseAuthority)
      }
      if (active === operation) active = undefined
    }
  }

  function markTurnStarted(
    operation: ActiveOperation,
    turn: CodexProductTurn,
  ): void {
    operation.turn = turn
    operation.releaseAuthority = undefined
    operation.redactions.push(turn.threadId, turn.turnId)
    if (!turnCoordinator.markProductTurnStarted(operation.turnLease)) {
      throw unavailable()
    }
  }

  function recordSettlement(
    operation: ActiveOperation,
    settlement: ProductTurnSettlement,
  ): void {
    operation.releaseAuthority =
      settlement.type === 'terminal' ? 'native_terminal' : undefined
  }

  async function recycleUnknown(operation: ActiveOperation): Promise<void> {
    try {
      await options.service.recycleProductRuntime()
      operation.releaseAuthority = 'runtime_closed'
    } catch {
      operation.releaseAuthority = undefined
    }
  }

  async function projectActivity(
    operation: ActiveOperation,
    activity: CodexProductActivity,
  ): Promise<TargetProductOperationFrame | undefined> {
    const base = { operationId: operation.operationId }
    switch (activity.type) {
      case 'agent_message.delta':
      case 'plan.delta':
        return {
          ...base,
          type: activity.type,
          activityId: activityId(operation.operationId, activity.itemId),
          delta: sanitize(activity.delta, operation.redactions),
        }
      case 'agent_message.completed':
      case 'plan.completed':
        return {
          ...base,
          type: activity.type,
          activityId: activityId(operation.operationId, activity.itemId),
          text: sanitize(activity.text, operation.redactions),
        }
      case 'user_input.requested': {
        if (operation.interaction) throw invalidInteraction()
        const publicInteractionId = interactionId(
          operation.operationId,
          activity.interactionId,
        )
        const questions = activity.questions.map((question) => ({
          nativeId: question.id,
          publicId: questionId(
            operation.operationId,
            activity.interactionId,
            question.id,
          ),
          question,
        }))
        operation.interaction = {
          publicInteractionId,
          nativeInteractionId: activity.interactionId,
          threadId: activity.threadId,
          turnId: activity.turnId,
          questions: new Map(
            questions.map(({ publicId, nativeId }) => [publicId, nativeId]),
          ),
          state: 'pending',
        }
        operation.redactions.push(
          activity.interactionId,
          ...activity.questions.map(({ id }) => id),
        )
        return {
          ...base,
          type: 'interaction.requested',
          interactionId: publicInteractionId,
          questions: questions.map(({ publicId, question }) =>
            projectQuestion(question, publicId, operation.redactions),
          ),
        }
      }
      case 'user_input.resolved': {
        const interaction = operation.interaction
        if (
          !interaction ||
          interaction.nativeInteractionId !== activity.interactionId ||
          interaction.threadId !== activity.threadId ||
          interaction.turnId !== activity.turnId
        ) {
          return undefined
        }
        operation.interaction = undefined
        return {
          ...base,
          type: 'interaction.resolved',
          interactionId: interaction.publicInteractionId,
          resolution: activity.resolution,
        }
      }
      case 'turn.interrupt_acknowledged':
        return { ...base, type: 'interrupt.acknowledged' }
      case 'turn.error':
        return {
          ...base,
          type: 'operation.error',
          code: safeCode(activity.code),
          displayMessage: sanitize(
            activity.displayMessage,
            operation.redactions,
          ),
          willRetry: activity.willRetry,
        }
      case 'runtime.failed':
      case 'turn.completed':
        return undefined
    }
  }

  function streamSink(
    operation: ActiveOperation,
  ): CodexProductStreamSink {
    return {
      accept: () =>
        operation.sink.write({
          type: 'operation.accepted',
          operationId: operation.operationId,
        }),
      async write(activity) {
        if (activity.type === 'runtime.failed') {
          await options.interactionRuntimeTerminal?.()
        } else if (activity.type === 'turn.completed') {
          await options.interactionTurnTerminal?.()
        }
        const frame = await projectActivity(operation, activity)
        return frame ? operation.sink.write(frame) : true
      },
      end: () => undefined,
    }
  }

  return {
    operationStatus: () => (active ? 'active' : 'idle'),
    activeOperation: () => turnCoordinator.activeOperation(),

    activeInteractionProductTurn() {
      const operation = active
      const turn = operation?.turn
      const lease = turnCoordinator.activeOperation()
      if (!operation || !turn || !lease) return undefined
      return {
        operationId: lease.operationId,
        nativeThreadId: turn.threadId,
        nativeTurnId: turn.turnId,
      }
    },

    async interruptInteractionProductTurn(turn) {
      const operation = active
      if (
        !operation?.turn ||
        turnCoordinator.activeOperation()?.operationId !== turn.operationId ||
        operation.turn.threadId !== turn.nativeThreadId ||
        operation.turn.turnId !== turn.nativeTurnId
      ) {
        return
      }
      await options.service.interruptProductTurn(operation.turn)
    },

    async publishInteractionReview(frame) {
      const operation = active
      if (
        !operation?.turn ||
        turnCoordinator.activeOperation()?.operationId !== frame.operationId ||
        !(await operation.sink.write(frame))
      ) {
        throw unavailable()
      }
    },

    async sendChat(input, operationOptions) {
      const text = input.text.trim()
      if (!text) {
        throw new PreparedProductOperationError(
          'action_invalid',
          400,
          '메시지를 확인해 주세요.',
        )
      }
      const operationId = targetOperationId()
      const operation = reserve(operationId, operationOptions.sink)
      let streamOpened = false
      try {
        const readiness = await options.service.readProductAccountReadiness(
          operation.serviceLease,
        )
        if (readiness.state !== 'ready') {
          throw new PreparedProductOperationError(
            'account_not_ready',
            409,
            'Codex에 로그인한 뒤 다시 시도해 주세요.',
          )
        }
        await validateCodexTurnSettings(
          input.codexSettings,
          options.service,
          operation.serviceLease,
        )
        streamOpened = true
        if (
          !(await operation.sink.write({
            type: 'operation.preparing',
            operationId,
          }))
        ) {
          return
        }
        const turn = await options.service.startProductTurn(
          {
            permissionProfile: 'workspace_write',
            ...(input.codexSettings === undefined
              ? {}
              : { settings: input.codexSettings }),
            text,
          },
          operationOptions.disconnected,
          operation.serviceLease,
        )
        if (!turn) {
          await writeTerminal(operation, {
            status: 'not_accepted',
            failureCode: 'client_disconnected',
          })
          return
        }
        markTurnStarted(operation, turn)
        const settlement = await options.service.streamProductTurn(
          turn,
          streamSink(operation),
        )
        recordSettlement(operation, settlement)
        operation.interaction = undefined
        if (settlement.type === 'unknown') await recycleUnknown(operation)
        await writeTerminal(
          operation,
          settlement.type === 'terminal'
            ? { status: settlement.event.status }
            : { status: 'unknown', failureCode: settlement.code },
        )
      } catch (error) {
        if (!streamOpened) throw present(error)
        await options.interactionRuntimeTerminal?.()
        await writeTerminal(operation, {
          status: 'unknown',
          failureCode: safeOperationCode(error),
        })
      } finally {
        await release(operation)
        if (streamOpened) operation.sink.end()
      }
    },

    async respondToInteraction(input) {
      const operation = active
      const interaction = operation?.interaction
      if (
        !operation?.turn ||
        operation.operationId !== input.operationId ||
        !interaction ||
        interaction.publicInteractionId !== input.interactionId ||
        interaction.threadId !== operation.turn.threadId ||
        interaction.turnId !== operation.turn.turnId ||
        interaction.state !== 'pending'
      ) {
        throw invalidInteraction()
      }
      interaction.state = 'settling'
      try {
        if (input.response.type === 'answer') {
          const answers: Record<string, readonly string[]> =
            Object.create(null)
          for (const [publicId, selections] of Object.entries(
            input.response.answers,
          )) {
            const nativeId = interaction.questions.get(publicId)
            if (!nativeId) throw invalidInteraction()
            answers[nativeId] = selections
          }
          await options.service.answerProductUserInput({
            interactionId: interaction.nativeInteractionId,
            answers,
          })
        } else {
          await options.service.cancelProductUserInput({
            interactionId: interaction.nativeInteractionId,
          })
        }
      } catch (error) {
        if (
          error instanceof CodexChatRuntimeError &&
          error.code === 'interaction_not_pending'
        ) {
          operation.interaction = undefined
          throw invalidInteraction()
        }
        interaction.state = 'pending'
        throw present(error)
      }
    },

    disconnect(operationId) {
      if (active?.operationId === operationId && active.turn) {
        options.service.disconnectProductTurn(active.turn)
      }
    },

    async interrupt(operationId) {
      if (!active?.turn || active.operationId !== operationId) {
        throw new PreparedProductOperationError(
          'action_unknown',
          404,
          '활성 작업을 찾지 못했습니다.',
        )
      }
      await options.service.interruptProductTurn(active.turn)
    },

    beginShutdown() {
      shuttingDown = true
      turnCoordinator.beginShutdown()
      if (active?.turn) options.service.disconnectProductTurn(active.turn)
    },
  }
}

async function writeTerminal(
  operation: ActiveOperation,
  settlement: {
    readonly status:
      | 'not_accepted'
      | 'completed'
      | 'failed'
      | 'interrupted'
      | 'unknown'
    readonly failureCode?: string
  },
): Promise<void> {
  await operation.sink.write({
    type: 'operation.terminal',
    operationId: operation.operationId,
    ...settlement,
  })
}

function projectQuestion(
  question: {
    readonly header: string
    readonly question: string
    readonly options: readonly {
      readonly label: string
      readonly description: string
    }[] | null
    readonly acceptsFreeform: boolean
  },
  id: string,
  redactions: readonly string[],
): TargetProductQuestion {
  return {
    id,
    header: sanitize(question.header, redactions),
    question: sanitize(question.question, redactions),
    options:
      question.options?.map((option) => ({
        label: sanitize(option.label, redactions),
        description: sanitize(option.description, redactions),
      })) ?? null,
    acceptsFreeform: question.acceptsFreeform,
  }
}

function sanitize(value: string, redactions: readonly string[]): string {
  let safe = value
  for (const redaction of redactions) {
    if (redaction) safe = safe.replaceAll(redaction, '[redacted]')
  }
  return safe
}

async function validateCodexTurnSettings(
  settings: ProductCodexTurnSettings | undefined,
  service: CodexChatService,
  lease: ProductOperationLease,
): Promise<void> {
  if (!settings) return
  const catalog = await service.readProductModelCatalog(lease)
  const model = catalog.models.find(
    (candidate) => candidate.model === settings.model,
  )
  const reasoningSupported = model?.supportedReasoningEfforts.some(
    (candidate) =>
      candidate.reasoningEffort === settings.reasoningEffort,
  )
  const fastSupported =
    settings.serviceTier === 'default' ||
    model?.serviceTiers.includes('fast') === true
  if (!model || !reasoningSupported || !fastSupported) {
    throw new PreparedProductOperationError(
      'action_invalid',
      400,
      '현재 Codex 모델 설정을 다시 선택해 주세요.',
    )
  }
}

function targetOperationId(): string {
  return `operation_${randomUUID().replaceAll('-', '')}`
}

function hashedId(prefix: string, ...values: readonly string[]): string {
  return `${prefix}_${createHash('sha256').update(values.join('\0')).digest('hex').slice(0, 32)}`
}

function activityId(operationId: string, itemId: string): string {
  return hashedId('activity', operationId, itemId)
}

function interactionId(operationId: string, nativeId: string): string {
  return hashedId('interaction', operationId, nativeId)
}

function questionId(
  operationId: string,
  interaction: string,
  question: string,
): string {
  return hashedId('question', operationId, interaction, question)
}

function safeCode(code: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/u.test(code) ? code : 'turn_failed'
}

function safeOperationCode(error: unknown): string {
  if (
    error instanceof CodexChatRuntimeError ||
    error instanceof PreparedProductOperationError
  ) {
    return safeCode(error.code)
  }
  return 'product_operation_failed'
}

function present(error: unknown): PreparedProductOperationError {
  return error instanceof PreparedProductOperationError
    ? error
    : unavailable()
}

function unavailable(): PreparedProductOperationError {
  return new PreparedProductOperationError(
    'product_unavailable',
    503,
    'AY 작업공간을 사용할 수 없습니다.',
  )
}

function invalidInteraction(): PreparedProductOperationError {
  return new PreparedProductOperationError(
    'interaction_invalid',
    409,
    '질문 요청이 더 이상 활성 상태가 아닙니다.',
  )
}
