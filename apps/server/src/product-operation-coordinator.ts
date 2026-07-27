import { createHash, randomUUID } from 'node:crypto'

import {
  CodexChatRuntimeError,
  type CodexProductActivity,
  type CodexProductTurn,
} from '@ay-ple/codex-chat-runtime'
import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
  type AssignmentOperationSettlement,
  type ChatOperationSettlement,
  type FirstAssignmentRequest,
  type FirstAssignmentRetryRequest,
  type ProductChatRequest as SharedProductChatRequest,
  type ProductInteractionAnswerRequest,
  type ProductOperationFrame,
  type ProductQuestion,
  type ProductReviewFrame,
  type ProductStatePatch,
  type ProductCodexTurnSettings,
} from '@ay-ple/product-contract'

import {
  materializeManagedAssignmentRecipe,
  type ManagedAssignmentRecipe,
  verifyManagedAssignmentRecipe,
} from './assignment-recipe.js'
import {
  type AssignmentMcpHost,
  type AssignmentMcpProposalSession,
} from './assignment-mcp-host.js'
import {
  CodexChatService,
  CodexChatServiceError,
  type CodexProductStreamSink,
  type ProductOperationLease,
  type ProductTurnSettlement,
} from './codex-chat-service.js'
import {
  SemesterWorkspaceError,
  StatePatchReviewError,
  type AssignmentProposalSession,
  type AssignmentReviewBinding,
  type AssignmentReviewDecisionInput,
  type ModelingRun,
  type ModelingRunRecoveryOutcome,
  type RawMaterial,
  type SemesterWorkspaceController,
  type SettleAssignmentActionInput,
  type StatePatch,
} from './semester-workspace.js'
import {
  ASSIGNMENT_REVIEW_QUESTION,
  type AssignmentReviewOutcome,
  createAssignmentReviewCoordinator,
} from './state-patch-review.js'
import {
  ProductTurnAdmissionError,
  createProductTurnCoordinator,
  type ProductTurnLease,
  type ProductTurnReleaseAuthority,
} from './product-turn-coordinator.js'
import type { ActiveInteractionProductTurn } from './interaction-broker.js'

const productTextMaxBytes = 128 * 1024
const safeRuntimeFailure = 'Codex 작업을 계속할 수 없습니다.'

export type AssignmentActionRequest =
  | FirstAssignmentRequest
  | FirstAssignmentRetryRequest
export type ProductChatRequest = SharedProductChatRequest

export type ProductInteractionResponseInput = {
  readonly operationId: string
  readonly interactionId: string
  readonly response:
    | {
        readonly type: 'answer'
        readonly answers: ProductInteractionAnswerRequest['answers']
      }
    | { readonly type: 'cancel' }
}

type NativeProductQuestion = Extract<
  CodexProductActivity,
  { readonly type: 'user_input.requested' }
>['questions'][number]

export interface ProductOperationSink {
  write(frame: ProductOperationFrame | ProductReviewFrame): Promise<boolean>
  end(): void
}

export type ProductOperationCoordinator = {
  operationStatus(): 'active' | 'idle'
  activeInteractionProductTurn(): ActiveInteractionProductTurn | undefined
  interruptInteractionProductTurn(
    turn: ActiveInteractionProductTurn,
  ): Promise<void>
  publishInteractionReview(frame: ProductReviewFrame): Promise<void>
  startAssignment(
    input: AssignmentActionRequest,
    options: ProductOperationOptions,
  ): Promise<void>
  sendChat(
    input: ProductChatRequest,
    options: ProductOperationOptions,
  ): Promise<void>
  submitReview(
    input: AssignmentReviewDecisionInput,
  ): Promise<AssignmentReviewOutcome>
  respondToInteraction(input: ProductInteractionResponseInput): Promise<void>
  disconnect(operationId: string): void
  interrupt(operationId: string): Promise<void>
  beginShutdown(): void
}

export type ProductOperationOptions = {
  readonly disconnected: () => boolean
  readonly mcpUrl: string
  readonly sink: ProductOperationSink
}

type ActiveProductOperationBase = {
  readonly operationId: string
  readonly lease: ProductOperationLease
  readonly turnLease: ProductTurnLease
  readonly productSink: ProductOperationSink
  readonly reviewBindings: Map<string, AssignmentReviewBinding>
  readonly reviewOutcomes: Map<
    string,
    'accepted' | 'revised' | 'rejected'
  >
  readonly reviewSubmissions: Map<string, ActiveReviewSubmission>
  readonly redactionValues: string[]
  generalInteraction?: ActiveGeneralInteraction
  pendingReplacement?: AssignmentReviewBinding
  proposal?: AssignmentProposalSession
  mcpSession?: AssignmentMcpProposalSession
  turn?: CodexProductTurn
  guardInterruptRequested?: boolean
  turnReleaseAuthority?: ProductTurnReleaseAuthority
}

type ActiveReviewSubmission = {
  readonly input: AssignmentReviewDecisionInput
  readonly promise: Promise<AssignmentReviewOutcome>
}

type ActiveAssignmentOperation = ActiveProductOperationBase & {
  readonly kind: 'assignment'
  readonly assignment: {
    readonly recipe: ManagedAssignmentRecipe
    run?: ModelingRun
    recoveryOutcome?: ModelingRunRecoveryOutcome
    confirmedRevision?: number
  }
  readonly chat?: never
}

type ActiveChatOperation = ActiveProductOperationBase & {
  readonly kind: 'chat'
  readonly assignment?: never
  readonly chat: {
    guardPrepared: boolean
    guardSettlementAttempted: boolean
    scratchPath?: string
  }
}

type ActiveProductOperation =
  | ActiveAssignmentOperation
  | ActiveChatOperation

type ActiveGeneralInteraction = {
  readonly publicInteractionId: string
  readonly nativeInteractionId: string
  readonly threadId: string
  readonly turnId: string
  readonly questions: ReadonlyMap<string, string>
  state: 'pending' | 'settling'
}

export class ProductOperationError extends Error {
  readonly code:
    | 'account_not_ready'
    | 'action_busy'
    | 'action_invalid'
    | 'action_unknown'
    | 'product_unavailable'
    | 'recipe_invalid'
    | 'interaction_invalid'
    | 'review_invalid'
  readonly status: number
  readonly displayMessage: string

  constructor(
    code: ProductOperationError['code'],
    status: number,
    displayMessage: string,
  ) {
    super(code)
    this.name = 'ProductOperationError'
    this.code = code
    this.status = status
    this.displayMessage = displayMessage
  }
}

export function createProductOperationCoordinator(options: {
  readonly controller: SemesterWorkspaceController
  readonly mcpHost: AssignmentMcpHost
  readonly service: CodexChatService
}): ProductOperationCoordinator {
  let active: ActiveProductOperation | undefined
  let shuttingDown = false
  const turnCoordinator = createProductTurnCoordinator({
    assertEligible: () => {
      options.controller.nativeCwd()
    },
  })

  const reserveBase = (
    operationId: string,
    productSink: ProductOperationSink,
  ): ActiveProductOperationBase => {
    if (shuttingDown) throw unavailable()
    if (active) {
      throw new ProductOperationError(
        'action_busy',
        409,
        '다른 Codex 작업이 진행 중입니다.',
      )
    }
    let turnLease: ProductTurnLease
    try {
      turnLease = turnCoordinator.claimProductTurn({
        operationId: targetOperationId(),
      })
    } catch (error) {
      throw presentTurnAdmissionError(error)
    }
    let lease: ProductOperationLease
    try {
      lease = options.service.reserveProductOperation(operationId)
    } catch (error) {
      turnCoordinator.release(turnLease, 'start_failed')
      throw presentServiceError(error)
    }
    return {
      operationId,
      lease,
      turnLease,
      productSink,
      reviewBindings: new Map(),
      reviewOutcomes: new Map(),
      reviewSubmissions: new Map(),
      redactionValues: [options.mcpHost.token],
      turnReleaseAuthority: 'start_failed',
    }
  }

  const reserveAssignment = (
    operationId: string,
    recipe: ManagedAssignmentRecipe,
    productSink: ProductOperationSink,
  ): ActiveAssignmentOperation => {
    const operation = {
      ...reserveBase(operationId, productSink),
      kind: 'assignment',
      assignment: { recipe },
    } satisfies ActiveAssignmentOperation
    active = operation
    return operation
  }

  const reserveChat = (
    operationId: string,
    productSink: ProductOperationSink,
  ): ActiveChatOperation => {
    const operation = {
      ...reserveBase(operationId, productSink),
      kind: 'chat',
      chat: {
        guardPrepared: false,
        guardSettlementAttempted: false,
      },
    } satisfies ActiveChatOperation
    active = operation
    return operation
  }

  const release = async (operation: ActiveProductOperation): Promise<void> => {
    let requiresFreshRuntime = false
    try {
      requiresFreshRuntime =
        options.controller.executionGuardRequiresFreshRuntime(
          operation.operationId,
        )
    } catch {
      requiresFreshRuntime = true
    }
    try {
      await options.service
        .releaseProductOperation(operation.lease, {
          recycleRuntime: requiresFreshRuntime,
        })
        .catch(() => undefined)
    } finally {
      if (operation.turnReleaseAuthority) {
        turnCoordinator.release(
          operation.turnLease,
          operation.turnReleaseAuthority,
        )
      }
      if (active === operation) active = undefined
      options.controller.noteProductOperationReleased(operation.operationId)
    }
  }

  const markTurnStarted = (
    operation: ActiveProductOperation,
    turn: CodexProductTurn,
  ): void => {
    operation.turn = turn
    operation.turnReleaseAuthority = undefined
    if (!turnCoordinator.markProductTurnStarted(operation.turnLease)) {
      throw unavailable()
    }
  }

  const recordTurnSettlement = (
    operation: ActiveProductOperation,
    settlement: ProductTurnSettlement,
  ): void => {
    operation.turnReleaseAuthority =
      settlement.type === 'terminal'
        ? 'native_terminal'
        : undefined
  }

  const recycleUnknownTurnRuntime = async (
    operation: ActiveProductOperation,
  ): Promise<void> => {
    try {
      await options.service.recycleProductRuntime()
      operation.turnReleaseAuthority = 'runtime_closed'
    } catch {
      operation.turnReleaseAuthority = undefined
    }
  }

  const closeAcceptedTurn = async (
    operation: ActiveProductOperation,
    turn: CodexProductTurn,
    code: string,
  ): Promise<void> => {
    try {
      await options.service.abandonAcceptedProductTurn(turn, code)
      operation.turnReleaseAuthority = 'runtime_closed'
    } catch {
      operation.turnReleaseAuthority = undefined
    }
  }

  const requireAccount = async (
    operation: ActiveProductOperation,
  ): Promise<void> => {
    let readiness
    try {
      readiness = await options.service.readProductAccountReadiness(
        operation.lease,
      )
    } catch (error) {
      throw presentServiceError(error)
    }
    if (readiness.state === 'not_ready') {
      throw new ProductOperationError(
        'account_not_ready',
        409,
        'Codex에 로그인한 뒤 다시 시도해 주세요.',
      )
    }
  }

  const registerProposal = (
    operation: ActiveProductOperation,
    proposal: AssignmentProposalSession,
  ): void => {
    operation.proposal = proposal
    operation.redactionValues.push(
      proposal.context.requestKey,
      proposal.context.workspaceId,
    )
    operation.mcpSession = options.mcpHost.register({
      requestKey: proposal.context.requestKey,
      invoke: (payload) => invokeProposal(operation, proposal, payload),
    })
  }

  const interruptForGuardConflict = async (
    operation: ActiveProductOperation,
    error: unknown,
  ): Promise<void> => {
    if (
      !(error instanceof SemesterWorkspaceError) ||
      error.code !== 'execution_guard_conflict' ||
      !operation.turn ||
      operation.guardInterruptRequested
    ) {
      return
    }
    operation.guardInterruptRequested = true
    await options.service
      .interruptProductTurn(operation.turn)
      .catch(() => undefined)
  }

  const invokeProposal = async (
    operation: ActiveProductOperation,
    proposal: AssignmentProposalSession,
    payload: unknown,
  ): Promise<StatePatch> => {
    try {
      return await proposal.mcpTool.invoke(payload)
    } catch (error) {
      await interruptForGuardConflict(operation, error)
      throw error
    }
  }

  const replaceProposal = (
    operation: ActiveProductOperation,
    proposal: AssignmentProposalSession,
  ): (() => void) => {
    const turn = operation.turn
    if (!turn) {
      throw new ProductOperationError(
        'review_invalid',
        409,
        '검토 요청이 더 이상 활성 상태가 아닙니다.',
      )
    }
    const nextSession = options.mcpHost.register({
      requestKey: proposal.context.requestKey,
      invoke: (payload) => invokeProposal(operation, proposal, payload),
    })
    try {
      nextSession.bindNative({
        threadId: turn.threadId,
        turnId: turn.turnId,
      })
    } catch (error) {
      nextSession.cancel()
      throw error
    }
    const previousSession = operation.mcpSession
    operation.proposal = proposal
    operation.mcpSession = nextSession
    operation.redactionValues.push(
      proposal.context.requestKey,
      proposal.context.workspaceId,
    )
    previousSession?.cancel()
    return () => {
      nextSession.cancel()
      if (operation.mcpSession === nextSession) {
        delete operation.mcpSession
        if (operation.proposal === proposal) delete operation.proposal
      }
    }
  }

  const projectActivity = async (
    operation: ActiveProductOperation,
    activity: CodexProductActivity,
  ): Promise<ProductOperationFrame | undefined> => {
    const base = { operationId: operation.operationId }
    switch (activity.type) {
      case 'skill.requested': {
        if (operation.kind !== 'assignment') return undefined
        return {
          ...base,
          type: 'skill.requested',
          skill: {
            name: operation.assignment.recipe.requestedSkillName,
            version: operation.assignment.recipe.version,
          },
        }
      }
      case 'agent_message.delta':
      case 'plan.delta':
        return {
          ...base,
          type: activity.type,
          activityId: activityId(operation.operationId, activity.itemId),
          delta: sanitizeProductText(
            activity.delta,
            operation.redactionValues,
          ),
        }
      case 'agent_message.completed':
        return {
          ...base,
          type: 'agent_message.completed',
          activityId: activityId(operation.operationId, activity.itemId),
          text: sanitizeProductText(activity.text, operation.redactionValues),
        }
      case 'plan.completed':
        return {
          ...base,
          type: 'plan.completed',
          activityId: activityId(operation.operationId, activity.itemId),
          text: sanitizeProductText(activity.text, operation.redactionValues),
        }
      case 'mcp_call.started':
        return {
          ...base,
          type: 'mcp_call.started',
          activityId: activityId(operation.operationId, activity.itemId),
          tool: activity.tool,
        }
      case 'mcp_call.completed': {
        const patch = operation.mcpSession?.latestPatch()
        if (!patch) {
          return {
            ...base,
            type: 'mcp_call.failed',
            activityId: activityId(operation.operationId, activity.itemId),
            tool: activity.tool,
            displayMessage: '검증된 변경 제안을 확인하지 못했습니다.',
          }
        }
        return {
          ...base,
          type: 'mcp_call.completed',
          activityId: activityId(operation.operationId, activity.itemId),
          tool: activity.tool,
          patch: projectPatch(patch, operation.redactionValues),
        }
      }
      case 'mcp_call.failed':
        return {
          ...base,
          type: activity.type,
          activityId: activityId(operation.operationId, activity.itemId),
          tool: activity.tool,
          displayMessage: '변경 제안을 검증하지 못했습니다.',
        }
      case 'user_input.requested': {
        let binding: AssignmentReviewBinding | null
        try {
          binding = await options.controller.bindAssignmentReview(activity)
        } catch (error) {
          await interruptForGuardConflict(operation, error)
          throw error
        }
        if (!binding) {
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
          operation.generalInteraction = {
            publicInteractionId,
            nativeInteractionId: activity.interactionId,
            threadId: activity.threadId,
            turnId: activity.turnId,
            questions: new Map(
              questions.map((question) => [
                question.publicId,
                question.nativeId,
              ]),
            ),
            state: 'pending',
          }
          operation.redactionValues.push(
            activity.interactionId,
            ...activity.questions.map((question) => question.id),
          )
          return {
            ...base,
            type: 'interaction.requested',
            interactionId: publicInteractionId,
            questions: questions.map(({ publicId, question }) =>
              projectQuestion(
                question,
                publicId,
                operation.redactionValues,
              ),
            ),
          }
        }
        operation.reviewBindings.set(binding.interactionId, binding)
        const patch = findPatch(options.controller, binding.patchId)
        const replaces = operation.pendingReplacement
        if (replaces) {
          if (replaces.patchId === binding.patchId) {
            throw new ProductOperationError(
              'review_invalid',
              409,
              'replacement 변경 제안을 확인하지 못했습니다.',
            )
          }
          operation.pendingReplacement = undefined
          return {
            ...base,
            type: 'review.replaced',
            interactionId: binding.interactionId,
            patchId: binding.patchId,
            decisionKey: binding.decisionKey,
            patch: projectPatch(patch, operation.redactionValues),
            questions: activity.questions.map((question) =>
              projectQuestion(
                question,
                question.id,
                operation.redactionValues,
              ),
            ),
            replaces: { ...replaces },
          }
        }
        return {
          ...base,
          type: 'review.requested',
          interactionId: binding.interactionId,
          patchId: binding.patchId,
          decisionKey: binding.decisionKey,
          patch: projectPatch(patch, operation.redactionValues),
          questions: activity.questions.map((question) =>
            projectQuestion(
              question,
              question.id,
              operation.redactionValues,
            ),
          ),
        }
      }
      case 'user_input.resolved': {
        const generalInteraction = operation.generalInteraction
        if (
          generalInteraction?.nativeInteractionId === activity.interactionId &&
          generalInteraction.threadId === activity.threadId &&
          generalInteraction.turnId === activity.turnId
        ) {
          operation.generalInteraction = undefined
          return {
            ...base,
            type: 'interaction.resolved',
            interactionId: generalInteraction.publicInteractionId,
            resolution: activity.resolution,
          }
        }
        const binding = operation.reviewBindings.get(activity.interactionId)
        if (binding) {
          const productOutcome = operation.reviewOutcomes.get(
            activity.interactionId,
          )
          const outcome =
            productOutcome === 'accepted' || productOutcome === 'rejected'
              ? productOutcome
              : activity.resolution === 'cancelled'
                ? 'cancelled'
                : productOutcome
          if (!outcome) {
            throw new ProductOperationError(
              'review_invalid',
              409,
              '검토 응답을 확인하지 못했습니다.',
            )
          }
          return {
            ...base,
            type: 'review.resolved',
            interactionId: activity.interactionId,
            patchId: binding.patchId,
            decisionKey: binding.decisionKey,
            outcome,
          }
        }
        return {
          ...base,
          type: 'interaction.resolved',
          interactionId: interactionId(
            operation.operationId,
            activity.interactionId,
          ),
          resolution: activity.resolution,
        }
      }
      case 'turn.interrupt_acknowledged':
        return { ...base, type: 'interrupt.acknowledged' }
      case 'turn.error':
        return {
          ...base,
          type: 'operation.error',
          code: safeFailureCode(activity.code),
          displayMessage: sanitizeProductText(
            activity.displayMessage,
            operation.redactionValues,
          ),
          willRetry: activity.willRetry,
        }
      case 'runtime.failed':
      case 'turn.completed':
        operation.generalInteraction = undefined
        return undefined
    }
  }

  const streamSink = (
    operation: ActiveProductOperation,
    sink: ProductOperationSink,
  ): CodexProductStreamSink => ({
    accept: () =>
      operation.kind === 'assignment'
        ? sink.write({
            type: 'operation.accepted',
            operationId: operation.operationId,
            runId: requireAssignmentRun(operation).id,
          })
        : sink.write({
            type: 'operation.accepted',
            operationId: operation.operationId,
          }),
    async write(activity) {
      const frame = await projectActivity(operation, activity)
      return frame ? sink.write(frame) : true
    },
    end: () => undefined,
  })

  const settleChatGuard = async (
    operation: ActiveChatOperation,
  ): Promise<boolean> => {
    if (!operation.chat.guardPrepared) return true
    if (operation.chat.guardSettlementAttempted) return false
    operation.chat.guardSettlementAttempted = true
    try {
      await options.controller.settleProductChatExecution({
        operationId: operation.operationId,
      })
      operation.chat.guardPrepared = false
      return true
    } catch {
      return false
    }
  }

  const coordinator: ProductOperationCoordinator = {
    operationStatus() {
      return active ? 'active' : 'idle'
    },

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
      const activeTurn = operation?.turn
      const lease = turnCoordinator.activeOperation()
      if (
        !operation ||
        !activeTurn ||
        !lease ||
        lease.operationId !== turn.operationId ||
        activeTurn.threadId !== turn.nativeThreadId ||
        activeTurn.turnId !== turn.nativeTurnId
      ) {
        return
      }
      await options.service.interruptProductTurn(activeTurn)
    },

    async publishInteractionReview(frame) {
      const operation = active
      const turn = operation?.turn
      const lease = turnCoordinator.activeOperation()
      if (
        !operation ||
        !turn ||
        !lease ||
        lease.operationId !== frame.operationId
      ) {
        throw unavailable()
      }
      if (!(await operation.productSink.write(frame))) {
        throw unavailable()
      }
    },

    async startAssignment(input, operationOptions) {
      assertAssignmentRequest(input)
      options.controller.nativeCwd()
      const recipe = await materializeManagedAssignmentRecipe(
        options.controller.managedAppDataRoot(),
      ).catch(() => {
        throw new ProductOperationError(
          'recipe_invalid',
          409,
          'Assignment Recipe를 확인한 뒤 다시 시도해 주세요.',
        )
      })
      await verifyManagedAssignmentRecipe(
        recipe,
        options.controller.managedAppDataRoot(),
      ).catch(() => {
        throw new ProductOperationError(
          'recipe_invalid',
          409,
          'Assignment Recipe를 확인한 뒤 다시 시도해 주세요.',
        )
      })
      const actionId = `action_${randomUUID().replaceAll('-', '')}`
      const operation = reserveAssignment(
        actionId,
        recipe,
        operationOptions.sink,
      )
      operation.redactionValues.push(operationOptions.mcpUrl)
      let streamOpened = false
      try {
        await requireAccount(operation)
        await validateCodexTurnSettings(
          input.codexSettings,
          options.service,
          operation.lease,
        )
        const argumentsCanonical = JSON.stringify(input.arguments)
        const prepared = await options.controller.prepareAssignmentAction({
          actionId,
          courseId: input.courseId,
          recipe: {
            name: recipe.name,
            version: recipe.version,
            digest: recipe.digest,
            requestedSkillName: recipe.requestedSkillName,
            requestedSkillPath: recipe.path,
          },
          arguments: {
            canonical: argumentsCanonical,
            digest: sha256(argumentsCanonical),
          },
          selectedMaterials: input.materials.map((material) => ({
            rawMaterialId: material.id,
            digest: material.digest,
          })),
          ...('retryOfRunId' in input
            ? { retryOfRunId: input.retryOfRunId }
            : {}),
        })
        operation.assignment.run = prepared.run
        operation.redactionValues.push(
          recipe.path,
          prepared.scratchPath,
          ...prepared.stagedSources.map((source) => source.path),
          options.controller.nativeCwd(),
        )
        try {
          registerProposal(operation, prepared)
        } catch (error) {
          operation.assignment.run =
            await options.controller.failAssignmentActionStart({
              actionId,
              status: 'not_accepted',
              failureCode: 'mcp_session_unavailable',
            })
          throw error
        }
        streamOpened = true
        const preparingWritten = await safeProductWrite(operationOptions.sink, {
          type: 'operation.preparing',
          operationId: actionId,
          runId: prepared.run.id,
        })
        if (!preparingWritten) {
          operation.assignment.run =
            await options.controller.failAssignmentActionStart({
              actionId,
              status: 'not_accepted',
              failureCode: 'client_disconnected',
            })
          operation.mcpSession?.cancel()
          return
        }
        let turn: CodexProductTurn | undefined
        try {
          await verifyManagedAssignmentRecipe(
            recipe,
            options.controller.managedAppDataRoot(),
          ).catch(() => {
            throw new ProductOperationError(
              'recipe_invalid',
              409,
              'Assignment Recipe를 확인한 뒤 다시 시도해 주세요.',
            )
          })
          turn = await options.service.startProductTurn(
            {
              profile: {
                workspace: options.controller.nativeCwd(),
                mcp: options.mcpHost.nativeThreadConfig(operationOptions.mcpUrl),
              },
              skill: {
                name: recipe.requestedSkillName,
                path: recipe.path,
              },
              permissionProfile: 'workspace_write',
              ...(input.codexSettings === undefined
                ? {}
                : { settings: input.codexSettings }),
              text: renderAssignmentInput(prepared, input.arguments),
            },
            operationOptions.disconnected,
            operation.lease,
          )
        } catch (error) {
          const settledRun = await settlePreAcceptanceFailure(
            operation,
            error,
            options,
          ).catch(async () => {
            operation.mcpSession?.cancel()
            if (isUnknownOutcome(error)) {
              await options.service.recycleProductRuntime().catch(() => undefined)
            }
            return undefined
          })
          if (settledRun) operation.assignment.run = settledRun
          await writeAssignmentTerminal(
            operationOptions.sink,
            operation,
            settledRun
              ? projectRunSettlement(settledRun)
              : {
                  status: 'unknown',
                  validationOutcome: 'unknown',
                  failureCode: 'run_settlement_unknown',
                },
          )
          return
        }
        if (!turn) {
          const settledRun = await options.controller
            .failAssignmentActionStart({
              actionId,
              status: 'not_accepted',
              failureCode: 'client_disconnected',
            })
            .catch(() => undefined)
          if (settledRun) operation.assignment.run = settledRun
          operation.mcpSession?.cancel()
          await writeAssignmentTerminal(
            operationOptions.sink,
            operation,
            settledRun
              ? projectRunSettlement(settledRun)
              : {
                  status: 'unknown',
                  validationOutcome: 'unknown',
                  failureCode: 'run_settlement_unknown',
                },
          )
          return
        }
        markTurnStarted(operation, turn)
        operation.redactionValues.push(turn.threadId, turn.turnId)
        try {
          operation.assignment.run =
            await options.controller.bindAssignmentAction({
              actionId,
              threadId: turn.threadId,
              turnId: turn.turnId,
            })
        } catch {
          const failedRun = await options.controller
            .failAssignmentActionStart({
              actionId,
              status: 'acceptance_unknown',
              failureCode: 'running_transition_unknown',
              nativeCorrelation: {
                threadId: turn.threadId,
                turnId: turn.turnId,
              },
            })
            .catch(() => undefined)
          if (failedRun) operation.assignment.run = failedRun
          operation.mcpSession?.cancel()
          await closeAcceptedTurn(
            operation,
            turn,
            'running_transition_unknown',
          )
          await writeAssignmentTerminal(
            operationOptions.sink,
            operation,
            failedRun
              ? projectRunSettlement(failedRun)
              : {
                  status: 'unknown',
                  validationOutcome: 'unknown',
                  failureCode: 'running_transition_unknown',
                },
          )
          return
        }
        try {
          operation.mcpSession?.bindNative({
            threadId: turn.threadId,
            turnId: turn.turnId,
          })
        } catch {
          operation.mcpSession?.cancel()
          await closeAcceptedTurn(operation, turn, 'mcp_binding_unknown')
          const settledRun = await options.controller
            .settleAssignmentAction({
              actionId,
              status: 'unknown',
              validationOutcome: 'unknown',
              failureCode: 'mcp_binding_unknown',
            })
            .catch(() => undefined)
          if (settledRun) operation.assignment.run = settledRun
          await writeAssignmentTerminal(
            operationOptions.sink,
            operation,
            settledRun
              ? projectRunSettlement(settledRun)
              : {
                  status: 'unknown',
                  validationOutcome: 'unknown',
                  failureCode: 'mcp_binding_unknown',
                },
          )
          return
        }

        const settlement = await options.service.streamProductTurn(
          turn,
          streamSink(operation, operationOptions.sink),
        )
        recordTurnSettlement(operation, settlement)
        operation.generalInteraction = undefined
        operation.reviewBindings.clear()
        operation.reviewOutcomes.clear()
        operation.reviewSubmissions.clear()
        operation.pendingReplacement = undefined
        const patchObserved = operation.mcpSession?.latestPatch() != null
        operation.mcpSession?.cancel()
        const requestedSettlement: Omit<
          SettleAssignmentActionInput,
          'actionId'
        > =
          settlement.type === 'terminal'
            ? {
                status: settlement.event.status,
                validationOutcome:
                  settlement.event.status === 'completed'
                    ? patchObserved
                      ? 'passed'
                      : 'failed'
                    : patchObserved
                      ? 'passed'
                      : 'unknown',
                ...(settlement.event.status === 'failed'
                  ? {
                      failureCode: safeFailureCode(
                        settlement.event.failure?.code ?? 'turn_failed',
                      ),
                    }
                  : settlement.event.status === 'completed' && !patchObserved
                    ? { failureCode: 'proposal_not_observed' }
                    : {}),
              }
            : {
                status: 'unknown' as const,
                validationOutcome: 'unknown' as const,
                failureCode: settlement.code,
              }
        if (
          operation.assignment.recoveryOutcome === undefined &&
          operation.assignment.confirmedRevision !== undefined &&
          (requestedSettlement.status === 'interrupted' ||
            requestedSettlement.status === 'unknown')
        ) {
          operation.assignment.recoveryOutcome = {
            outcome: 'continuation_lost',
            confirmedRevision: operation.assignment.confirmedRevision,
          }
        }
        try {
          operation.assignment.run =
            await options.controller.settleAssignmentAction({
              actionId,
              ...requestedSettlement,
              ...(operation.assignment.recoveryOutcome === undefined
                ? {}
                : {
                    recoveryOutcome:
                      operation.assignment.recoveryOutcome,
                  }),
            })
        } catch {
          await writeAssignmentTerminal(operationOptions.sink, operation, {
            status: 'unknown',
            validationOutcome: 'unknown',
            failureCode: 'execution_guard_conflict',
          })
          return
        } finally {
          operation.mcpSession?.cancel()
        }
        if (settlement.type === 'unknown') {
          await recycleUnknownTurnRuntime(operation)
        }
        await writeAssignmentTerminal(
          operationOptions.sink,
          operation,
          projectRunSettlement(requireAssignmentRun(operation)),
        )
      } catch (error) {
        if (!streamOpened) throw presentProductOperationError(error)
        throw error
      } finally {
        operation.mcpSession?.cancel()
        await release(operation)
        if (streamOpened) operationOptions.sink.end()
      }
    },

    async sendChat(input, operationOptions) {
      assertChatRequest(input)
      const operationId = `chat_${randomUUID().replaceAll('-', '')}`
      const operation = reserveChat(operationId, operationOptions.sink)
      operation.redactionValues.push(operationOptions.mcpUrl)
      let streamOpened = false
      try {
        await requireAccount(operation)
        await validateCodexTurnSettings(
          input.codexSettings,
          options.service,
          operation.lease,
        )
        const courseId = currentCourseId(options.controller)
        const selectedCourseId =
          input.materials.length > 0
            ? requireCourseId(courseId)
            : undefined
        if (courseId) {
          const preparedExecution =
            await options.controller.prepareProductChatExecution({
              operationId,
              courseId,
              selectedMaterials: input.materials.map((material) => ({
                rawMaterialId: material.id,
                digest: material.digest,
              })),
            })
          operation.chat.guardPrepared = true
          operation.chat.scratchPath = preparedExecution.scratchPath
          operation.redactionValues.push(preparedExecution.scratchPath)
        }
        operation.redactionValues.push(options.controller.nativeCwd())
        if (selectedCourseId) {
          const proposal = await options.controller.prepareAssignmentProposalSession({
            courseId: selectedCourseId,
            selectedMaterials: input.materials.map((material) => ({
              rawMaterialId: material.id,
              digest: material.digest,
            })),
          })
          registerProposal(operation, proposal)
        }
        streamOpened = true
        const preparingWritten = await safeProductWrite(operationOptions.sink, {
          type: 'operation.preparing',
          operationId,
        })
        if (!preparingWritten) {
          await settleChatGuard(operation)
          return
        }
        const text = await renderChatInput(options.controller, input, operation)
        const turn = await options.service.startProductTurn(
          {
            profile: {
              workspace: options.controller.nativeCwd(),
              mcp: options.mcpHost.nativeThreadConfig(operationOptions.mcpUrl),
            },
            permissionProfile: courseId ? 'workspace_write' : 'read_only',
            ...(input.codexSettings === undefined
              ? {}
              : { settings: input.codexSettings }),
            text,
          },
          operationOptions.disconnected,
          operation.lease,
        )
        if (!turn) {
          const guardSettled = await settleChatGuard(operation)
          await writeChatTerminal(operationOptions.sink, operation, {
            status: guardSettled ? 'not_accepted' : 'unknown',
            failureCode: guardSettled
              ? 'client_disconnected'
              : 'execution_guard_conflict',
          })
          return
        }
        markTurnStarted(operation, turn)
        operation.redactionValues.push(turn.threadId, turn.turnId)
        if (operation.chat.guardPrepared) {
          await options.controller.bindProductChatExecution({
            operationId,
            threadId: turn.threadId,
            turnId: turn.turnId,
          })
        }
        if (operation.proposal) {
          await options.controller.bindAssignmentProposalSession({
            requestKey: operation.proposal.context.requestKey,
            threadId: turn.threadId,
            turnId: turn.turnId,
          })
          operation.mcpSession?.bindNative({
            threadId: turn.threadId,
            turnId: turn.turnId,
          })
        }
        const settlement = await options.service.streamProductTurn(
          turn,
          streamSink(operation, operationOptions.sink),
        )
        recordTurnSettlement(operation, settlement)
        operation.generalInteraction = undefined
        operation.reviewBindings.clear()
        operation.reviewOutcomes.clear()
        operation.reviewSubmissions.clear()
        operation.pendingReplacement = undefined
        operation.mcpSession?.cancel()
        if (settlement.type === 'unknown') {
          await recycleUnknownTurnRuntime(operation)
        }
        const guardSettled = await settleChatGuard(operation)
        await writeChatTerminal(operationOptions.sink, operation, {
          status: guardSettled
            ? settlement.type === 'terminal'
              ? settlement.event.status
              : 'unknown'
            : 'unknown',
          ...(!guardSettled
            ? { failureCode: 'execution_guard_conflict' }
            : settlement.type === 'unknown'
            ? { failureCode: settlement.code }
            : {}),
        })
      } catch (error) {
        if (!streamOpened) throw presentProductOperationError(error)
        if (operation.turn) {
          await closeAcceptedTurn(
            operation,
            operation.turn,
            'running_transition_unknown',
          )
        } else if (isUnknownOutcome(error)) {
          await options.service.recycleProductRuntime().catch(() => undefined)
        }
        const guardSettled = await settleChatGuard(operation)
        await writeChatTerminal(operationOptions.sink, operation, {
          status:
            guardSettled && !operation.turn && !isUnknownOutcome(error)
              ? 'not_accepted'
              : 'unknown',
          failureCode: guardSettled
            ? safeOperationFailureCode(error)
            : 'execution_guard_conflict',
        })
      } finally {
        if (operation.proposal) {
          await options.controller
            .releaseAssignmentProposalSession(
              operation.proposal.context.requestKey,
            )
            .catch(() => undefined)
        }
        operation.mcpSession?.cancel()
        await settleChatGuard(operation)
        await release(operation)
        if (streamOpened) operationOptions.sink.end()
      }
    },

    async submitReview(input) {
      const operation = active
      if (
        !operation?.turn ||
        !operation.reviewBindings.has(input.interactionId)
      ) {
        throw new ProductOperationError(
          'review_invalid',
          409,
          '검토 요청이 더 이상 활성 상태가 아닙니다.',
        )
      }
      const existing = operation.reviewSubmissions.get(input.decisionKey)
      if (existing) {
        if (!sameAssignmentReviewInput(existing.input, input)) {
          throw new ProductOperationError(
            'review_invalid',
            409,
            '검토 응답이 이전 요청과 일치하지 않습니다.',
          )
        }
        try {
          const outcome = await existing.promise
          return { ...outcome, replayed: true }
        } catch (error) {
          throw presentProductOperationError(error)
        }
      }

      const expectedOutcome =
        input.decision === 'accept'
          ? 'accepted'
          : input.decision === 'reject'
            ? 'rejected'
            : 'revised'
      if (input.decision !== 'revise') {
        operation.reviewOutcomes.set(input.interactionId, expectedOutcome)
      }
      const promise = createAssignmentReviewCoordinator(options.controller, {
        answerUserInput: (answer) =>
          options.service.answerProductUserInput(answer),
        prepareReplacement: (proposal) => {
          const abandon = replaceProposal(operation, proposal)
          operation.pendingReplacement = {
            interactionId: input.interactionId,
            patchId: input.patchId,
            decisionKey: input.decisionKey,
          }
          operation.reviewOutcomes.set(input.interactionId, 'revised')
          return () => {
            abandon()
            if (
              operation.pendingReplacement?.interactionId ===
              input.interactionId
            ) {
              operation.pendingReplacement = undefined
            }
          }
        },
      }).submit(input)
      operation.reviewSubmissions.set(input.decisionKey, { input, promise })
      try {
        const outcome = await promise
        if (
          outcome.type === 'settled' &&
          operation.kind === 'assignment'
        ) {
          operation.assignment.confirmedRevision = outcome.confirmedRevision
          if (outcome.continuation === 'lost') {
            operation.assignment.recoveryOutcome = {
              outcome: 'continuation_lost',
              confirmedRevision: outcome.confirmedRevision,
            }
            options.service.disconnectProductTurn(operation.turn)
          }
        }
        return outcome
      } catch (error) {
        await interruptForGuardConflict(operation, error)
        if (
          operation.reviewSubmissions.get(input.decisionKey)?.promise ===
          promise
        ) {
          operation.reviewSubmissions.delete(input.decisionKey)
        }
        if (error instanceof StatePatchReviewError) {
          operation.reviewOutcomes.delete(input.interactionId)
        }
        throw presentProductOperationError(error)
      }
    },

    async respondToInteraction(input) {
      const operation = active
      const interaction = operation?.generalInteraction
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
      const nativeResponse =
        input.response.type === 'answer'
          ? {
              type: 'answer' as const,
              answers: mapInteractionAnswers(
                interaction,
                input.response.answers,
              ),
            }
          : input.response
      interaction.state = 'settling'
      try {
        if (nativeResponse.type === 'answer') {
          await options.service.answerProductUserInput({
            interactionId: interaction.nativeInteractionId,
            answers: nativeResponse.answers,
          })
        } else {
          await options.service.cancelProductUserInput({
            interactionId: interaction.nativeInteractionId,
          })
        }
      } catch (error) {
        const interactionNotPending =
          error instanceof CodexChatRuntimeError &&
          error.code === 'interaction_not_pending'
        if (operation.generalInteraction === interaction) {
          if (interactionNotPending) {
            operation.generalInteraction = undefined
          } else if (!isUnknownOutcome(error)) {
            interaction.state = 'pending'
          }
        }
        if (interactionNotPending) throw invalidInteraction()
        throw error
      }
    },

    disconnect(operationId) {
      if (active?.operationId !== operationId || !active.turn) return
      options.service.disconnectProductTurn(active.turn)
    },

    async interrupt(operationId) {
      if (!active?.turn || active.operationId !== operationId) {
        throw new ProductOperationError(
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
  return coordinator
}

async function settlePreAcceptanceFailure(
  operation: ActiveAssignmentOperation,
  error: unknown,
  options: {
    readonly controller: SemesterWorkspaceController
    readonly service: CodexChatService
  },
): Promise<ModelingRun> {
  const status = preAcceptanceStatus(error)
  const run = await options.controller.failAssignmentActionStart({
    actionId: operation.operationId,
    status,
    failureCode: safeOperationFailureCode(error),
  })
  operation.mcpSession?.cancel()
  if (status === 'acceptance_unknown') {
    await options.service.recycleProductRuntime().catch(() => undefined)
  }
  return run
}

function renderAssignmentInput(
  prepared: Awaited<
    ReturnType<SemesterWorkspaceController['prepareAssignmentAction']>
  >,
  argumentsValue: typeof FIRST_ASSIGNMENT_ARGUMENTS,
): string {
  const context = prepared.context
  const sources = prepared.stagedSources
    .map(
      (source, index) =>
        `${index + 1}. RawMaterial ${source.rawMaterialId} (${source.digest})\n` +
        `   [selected-source-${index + 1}](<${source.path}>)`,
    )
    .join('\n')
  return [
    'AY-PLE First Assignment ModelingInvocation',
    `requestKey: ${context.requestKey}`,
    `workspaceId: ${context.workspaceId}`,
    `courseId: ${context.courseId}`,
    `baseRevision: ${context.baseRevision}`,
    `arguments: ${JSON.stringify(argumentsValue)}`,
    'Use exactly these two read-only source snapshots:',
    sources,
    `Use scratch only for transient writes: ${prepared.scratchPath}`,
    'Call propose_state_patch with evidence from only those two RawMaterials.',
    `After the proposal, request exactly this review question: ${nativeReviewQuestionJson()}`,
  ].join('\n\n')
}

async function renderChatInput(
  controller: SemesterWorkspaceController,
  input: ProductChatRequest,
  operation: ActiveChatOperation,
): Promise<string> {
  const scratchInstruction = operation.chat.scratchPath
    ? `Use scratch only for transient writes: ${operation.chat.scratchPath}`
    : undefined
  if (!operation.proposal) {
    return scratchInstruction
      ? [input.text, scratchInstruction].join('\n\n')
      : input.text
  }
  const previews = await Promise.all(
    input.materials.map((material) =>
      controller.readMaterialPreview({
        materialId: material.id,
        digest: material.digest,
      }),
    ),
  )
  const sources = previews
    .map((preview) => {
      operation.redactionValues.push(preview.relativePath)
      return [
        `RawMaterial ${preview.materialId} (${preview.digest})`,
        '```text',
        preview.text,
        '```',
      ].join('\n')
    })
    .join('\n\n')
  const context = operation.proposal.context
  const rendered = [
    input.text,
    scratchInstruction,
    'The user selected these read-only AY-PLE sources for this Turn:',
    sources,
    `Proposal context: requestKey=${context.requestKey}, workspaceId=${context.workspaceId}, courseId=${context.courseId}, baseRevision=${context.baseRevision}.`,
    'A proposal may cite only these selected RawMaterial IDs and digests.',
    `After a proposal, request exactly this review question: ${nativeReviewQuestionJson()}`,
  ].filter((value): value is string => value !== undefined).join('\n\n')
  if (Buffer.byteLength(rendered, 'utf8') > productTextMaxBytes) {
    throw new ProductOperationError(
      'action_invalid',
      413,
      '선택 자료가 Chat 요청 한도를 넘었습니다.',
    )
  }
  return rendered
}

function nativeReviewQuestionJson(): string {
  const { acceptsFreeform: _acceptsFreeform, ...nativeQuestion } =
    ASSIGNMENT_REVIEW_QUESTION
  return JSON.stringify(nativeQuestion)
}

async function writeAssignmentTerminal(
  sink: ProductOperationSink,
  operation: ActiveAssignmentOperation,
  terminal: AssignmentOperationSettlement,
): Promise<boolean> {
  const run = requireAssignmentRun(operation)
  const recovery = projectRunRecovery(run)
  if (
    recovery &&
    !(await safeProductWrite(sink, {
      type: 'operation.recovery',
      operationId: operation.operationId,
      runId: run.id,
      ...recovery,
    }))
  ) {
    return false
  }
  return safeProductWrite(sink, {
    type: 'operation.terminal',
    operationId: operation.operationId,
    runId: run.id,
    ...terminal,
  })
}

function projectRunRecovery(
  run: ModelingRun,
):
  | {
      readonly outcome: 'interrupted' | 'unknown'
      readonly retryable: true
    }
  | {
      readonly outcome: 'continuation_lost'
      readonly retryable: false
      readonly confirmedRevision: number
    }
  | undefined {
  if (run.recoveryOutcome?.outcome === 'continuation_lost') {
    return {
      outcome: 'continuation_lost',
      retryable: false,
      confirmedRevision: run.recoveryOutcome.confirmedRevision,
    }
  }
  if (run.status === 'interrupted' || run.status === 'unknown') {
    return { outcome: run.status, retryable: true }
  }
  return undefined
}

async function writeChatTerminal(
  sink: ProductOperationSink,
  operation: ActiveChatOperation,
  terminal: ChatOperationSettlement,
): Promise<boolean> {
  return safeProductWrite(sink, {
    type: 'operation.terminal',
    operationId: operation.operationId,
    ...terminal,
  })
}

function requireAssignmentRun(operation: ActiveAssignmentOperation): ModelingRun {
  if (!operation.assignment.run) {
    throw new TypeError('The Assignment operation has no ModelingRun.')
  }
  return operation.assignment.run
}

async function safeProductWrite(
  sink: ProductOperationSink,
  frame: ProductOperationFrame,
): Promise<boolean> {
  try {
    return await sink.write(frame)
  } catch {
    return false
  }
}

function projectPatch(
  patch: StatePatch,
  redactionValues: readonly string[],
): ProductStatePatch {
  return {
    id: patch.id,
    summary: sanitizeProductText(patch.summary, redactionValues),
    changes: {
      operation: patch.changes.operation,
      ...(patch.changes.assignmentId === undefined
        ? {}
        : { assignmentId: patch.changes.assignmentId }),
      values: {
        title: sanitizeProductText(
          patch.changes.values.title,
          redactionValues,
        ),
        dueAt: sanitizeProductText(
          patch.changes.values.dueAt,
          redactionValues,
        ),
        submissionMethod: sanitizeProductText(
          patch.changes.values.submissionMethod,
          redactionValues,
        ),
      },
    },
    evidence: patch.evidence.map((evidence) => ({
      field: evidence.field,
      rawMaterialId: evidence.rawMaterialId,
      digest: evidence.digest,
      quote: sanitizeProductText(evidence.quote, redactionValues),
    })),
    status: patch.status,
  }
}

function projectQuestion(
  question: NativeProductQuestion,
  id: string,
  redactionValues: readonly string[],
): ProductQuestion {
  return {
    id,
    header: sanitizeProductText(question.header, redactionValues),
    question: sanitizeProductText(question.question, redactionValues),
    options:
      question.options?.map((choice) => ({
        label: sanitizeProductText(choice.label, redactionValues),
        description: sanitizeProductText(
          choice.description,
          redactionValues,
        ),
      })) ?? null,
    acceptsFreeform: question.acceptsFreeform,
  }
}

function projectRunSettlement(run: ModelingRun): AssignmentOperationSettlement {
  const status = run.status
  const validationOutcome = run.validationOutcome
  if (
    status === 'starting' ||
    status === 'running' ||
    validationOutcome === 'pending'
  ) {
    throw new TypeError('The ModelingRun is not settled.')
  }
  return {
    status,
    validationOutcome,
    ...(run.failureCode === undefined ? {} : { failureCode: run.failureCode }),
  }
}

function findPatch(
  controller: SemesterWorkspaceController,
  patchId: string,
): StatePatch {
  const patch = controller
    .assignmentState()
    .statePatches.find((candidate) => candidate.id === patchId)
  if (!patch) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The bound StatePatch is unavailable.',
    )
  }
  return patch
}

function requireCourseId(courseId: string | undefined): string {
  if (!courseId) {
    throw new SemesterWorkspaceError(
      'course_unknown',
      'An active Course is required.',
    )
  }
  return courseId
}

function currentCourseId(
  controller: SemesterWorkspaceController,
): string | undefined {
  const snapshot = controller.snapshot()
  return snapshot?.state === 'ready' ? snapshot.course?.id : undefined
}

function assertAssignmentRequest(
  input: AssignmentActionRequest,
): void {
  if (
    input.recipeVersion !== FIRST_ASSIGNMENT_RECIPE_VERSION ||
    input.arguments.timezone !== FIRST_ASSIGNMENT_ARGUMENTS.timezone ||
    input.materials.length !== 2 ||
    new Set(input.materials.map((material) => material.id)).size !== 2
  ) {
    throw new ProductOperationError(
      'action_invalid',
      400,
      'Assignment action 입력을 확인해 주세요.',
    )
  }
}

function sameAssignmentReviewInput(
  left: AssignmentReviewDecisionInput,
  right: AssignmentReviewDecisionInput,
): boolean {
  return (
    left.interactionId === right.interactionId &&
    left.patchId === right.patchId &&
    left.decisionKey === right.decisionKey &&
    left.decision === right.decision &&
    (left.decision !== 'revise' ||
      (right.decision === 'revise' && left.feedback === right.feedback))
  )
}

function assertChatRequest(input: ProductChatRequest): void {
  if (
    input.text.trim().length === 0 ||
    Buffer.byteLength(input.text, 'utf8') > productTextMaxBytes ||
    input.materials.length > 2 ||
    new Set(input.materials.map((material) => material.id)).size !==
      input.materials.length
  ) {
    throw new ProductOperationError(
      'action_invalid',
      400,
      'Chat 입력을 확인해 주세요.',
    )
  }
}

function sanitizeProductText(
  text: string,
  redactionValues: readonly string[],
): string {
  let sanitized = text
  for (const redactionValue of [...redactionValues].sort(
    (left, right) => right.length - left.length,
  )) {
    if (redactionValue.length > 0) {
      sanitized = sanitized.replaceAll(redactionValue, '[managed path]')
    }
  }
  sanitized = sanitized.replace(
    /(?:file:\/\/)?\/(?:Users|private|tmp|var|Volumes)\/[^\s)\]}>]+/gu,
    '[managed path]',
  )
  sanitized = sanitized.replace(
    /(^|[\s(<])\/[^\s)\]}>]+/gu,
    '$1[managed path]',
  )
  if (Buffer.byteLength(sanitized, 'utf8') <= productTextMaxBytes) {
    return sanitized
  }
  const suffix = '…'
  const encoded = Buffer.from(sanitized)
  let prefixEnd = productTextMaxBytes - Buffer.byteLength(suffix)
  while (prefixEnd > 0) {
    try {
      const prefix = new TextDecoder('utf-8', { fatal: true }).decode(
        encoded.subarray(0, prefixEnd),
      )
      return `${prefix}${suffix}`
    } catch {
      prefixEnd -= 1
    }
  }
  return suffix
}

function activityId(operationId: string, nativeItemId: string): string {
  return `activity_${sha256(`${operationId}\u0000${nativeItemId}`).slice(0, 32)}`
}

function interactionId(
  operationId: string,
  nativeInteractionId: string,
): string {
  return `interaction_${sha256(`${operationId}\u0000${nativeInteractionId}`).slice(0, 32)}`
}

function questionId(
  operationId: string,
  nativeInteractionId: string,
  nativeQuestionId: string,
): string {
  return `question_${sha256(
    `${operationId}\u0000${nativeInteractionId}\u0000${nativeQuestionId}`,
  ).slice(0, 32)}`
}

function targetOperationId(): string {
  return `operation_${randomUUID().replaceAll('-', '')}`
}

function mapInteractionAnswers(
  interaction: ActiveGeneralInteraction,
  answers: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly string[]>> {
  const nativeAnswers: Record<string, readonly string[]> = Object.create(null)
  for (const [publicQuestionId, values] of Object.entries(answers)) {
    const nativeQuestionId = interaction.questions.get(publicQuestionId)
    if (!nativeQuestionId) throw invalidInteraction()
    nativeAnswers[nativeQuestionId] = [...values]
  }
  return nativeAnswers
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
    throw new ProductOperationError(
      'action_invalid',
      400,
      '현재 Codex 모델 설정을 다시 선택해 주세요.',
    )
  }
}

function invalidInteraction(): ProductOperationError {
  return new ProductOperationError(
    'interaction_invalid',
    409,
    '질문 요청이 더 이상 활성 상태가 아닙니다.',
  )
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function preAcceptanceStatus(
  error: unknown,
): 'not_accepted' | 'acceptance_unknown' {
  return isUnknownOutcome(error) ? 'acceptance_unknown' : 'not_accepted'
}

function isUnknownOutcome(error: unknown): boolean {
  return error instanceof CodexChatRuntimeError && error.unknownOutcome
}

function safeOperationFailureCode(error: unknown): string {
  if (error instanceof CodexChatRuntimeError) return safeFailureCode(error.code)
  if (error instanceof CodexChatServiceError) return error.code
  if (error instanceof ProductOperationError) return error.code
  return 'operation_failed'
}

function safeFailureCode(code: string): string {
  const normalized = code.replaceAll(/[A-Z]/g, (value) => `_${value.toLowerCase()}`)
  return /^[a-z][a-z0-9_]{0,63}$/.test(normalized)
    ? normalized
    : 'operation_failed'
}

function presentProductOperationError(error: unknown): ProductOperationError {
  if (error instanceof ProductOperationError) return error
  if (error instanceof SemesterWorkspaceError) {
    const invalid = new Set([
      'action_invalid',
      'course_unknown',
      'material_stale',
      'material_unknown',
      'workspace_inactive',
      'workspace_incompatible',
    ])
    const conflict = new Set([
      'action_active',
      'action_conflict',
      'execution_cleanup_required',
      'execution_guard_conflict',
    ])
    return new ProductOperationError(
      invalid.has(error.code) ? 'action_invalid' : 'action_busy',
      conflict.has(error.code) ? 409 : 400,
      error.code === 'material_stale'
        ? '선택 자료가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.'
        : error.code === 'action_active' ||
            error.code === 'execution_cleanup_required'
          ? '이전 작업을 정리한 뒤 다시 시도해 주세요.'
          : '학기 작업공간과 선택 자료를 확인해 주세요.',
    )
  }
  if (error instanceof StatePatchReviewError) {
    return new ProductOperationError(
      'review_invalid',
      409,
      '변경 제안 또는 검토 상태를 확인해 주세요.',
    )
  }
  return presentServiceError(error)
}

function presentServiceError(error: unknown): ProductOperationError {
  if (error instanceof ProductOperationError) return error
  if (error instanceof CodexChatServiceError && error.code === 'active_turn') {
    return new ProductOperationError(
      'action_busy',
      409,
      '다른 Codex 작업이 진행 중입니다.',
    )
  }
  return unavailable()
}

function presentTurnAdmissionError(
  error: unknown,
): ProductOperationError {
  if (!(error instanceof ProductTurnAdmissionError)) {
    return presentProductOperationError(error)
  }
  if (error.code !== 'product_unavailable') {
    return new ProductOperationError(
      'action_busy',
      409,
      '다른 Codex 작업이 진행 중입니다.',
    )
  }
  return unavailable()
}

function unavailable(): ProductOperationError {
  return new ProductOperationError(
    'product_unavailable',
    503,
    safeRuntimeFailure,
  )
}
