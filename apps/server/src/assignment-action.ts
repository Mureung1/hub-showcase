import { createHash, randomUUID } from 'node:crypto'

import {
  CodexChatRuntimeError,
  type CodexProductActivity,
  type CodexProductTurn,
} from '@ay-ple/codex-chat-runtime'

import {
  FIRST_ASSIGNMENT_ARGUMENTS,
  FIRST_ASSIGNMENT_RECIPE_VERSION,
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
} from './codex-chat-service.js'
import {
  SemesterWorkspaceError,
  StatePatchReviewError,
  type AssignmentProposalSession,
  type AssignmentReviewBinding,
  type AssignmentReviewCommit,
  type AssignmentReviewDecisionInput,
  type ModelingRun,
  type RawMaterial,
  type SemesterWorkspaceController,
  type SettleAssignmentActionInput,
  type StatePatch,
} from './semester-workspace.js'
import {
  ASSIGNMENT_REVIEW_QUESTION,
  createAssignmentReviewCoordinator,
} from './state-patch-review.js'

const productTextMaxBytes = 128 * 1024
const safeRuntimeFailure = 'Codex 작업을 계속할 수 없습니다.'

export type AssignmentActionRequest = {
  readonly courseId: string
  readonly recipeVersion: typeof FIRST_ASSIGNMENT_RECIPE_VERSION
  readonly arguments: typeof FIRST_ASSIGNMENT_ARGUMENTS
  readonly materials: readonly {
    readonly id: string
    readonly digest: string
  }[]
}

export type ProductChatRequest = {
  readonly text: string
  readonly materials: readonly {
    readonly id: string
    readonly digest: string
  }[]
}

export type ProductInteractionResponseInput = {
  readonly operationId: string
  readonly interactionId: string
  readonly response:
    | {
        readonly type: 'answer'
        readonly answers: Readonly<Record<string, readonly string[]>>
      }
    | { readonly type: 'cancel' }
}

type ProductFrameBase = {
  readonly operationId: string
}

type ProductActivityFrameBase = ProductFrameBase & {
  readonly activityId: string
}

type ProductQuestion = {
  readonly id: string
  readonly header: string
  readonly question: string
  readonly options: readonly {
    readonly label: string
    readonly description: string
  }[] | null
  readonly acceptsFreeform: boolean
}

type NativeProductQuestion = Extract<
  CodexProductActivity,
  { readonly type: 'user_input.requested' }
>['questions'][number]

type ProductStatePatch = {
  readonly id: string
  readonly summary: string
  readonly changes: {
    readonly operation: StatePatch['changes']['operation']
    readonly assignmentId?: string
    readonly values: {
      readonly title: string
      readonly dueAt: string
      readonly submissionMethod: string
    }
  }
  readonly evidence: readonly {
    readonly field: StatePatch['evidence'][number]['field']
    readonly rawMaterialId: string
    readonly digest: string
    readonly quote: string
  }[]
  readonly status: StatePatch['status']
}

type SettledModelingRunStatus = Exclude<
  ModelingRun['status'],
  'starting' | 'running'
>

type AssignmentOperationSettlement = {
  readonly status: SettledModelingRunStatus
  readonly validationOutcome: Exclude<
    ModelingRun['validationOutcome'],
    'pending'
  >
  readonly failureCode?: string
}

type ChatOperationSettlement = {
  readonly status: Exclude<SettledModelingRunStatus, 'acceptance_unknown'>
  readonly validationOutcome?: never
  readonly failureCode?: string
}

/* Browser-facing frames form a closed projection of native activity fields. */
export type ProductOperationFrame =
  | (ProductFrameBase & {
      readonly type: 'operation.preparing'
      readonly runId: string
    })
  | (ProductFrameBase & {
      readonly type: 'operation.preparing'
      readonly runId?: never
    })
  | (ProductFrameBase & {
      readonly type: 'operation.accepted'
      readonly runId: string
    })
  | (ProductFrameBase & {
      readonly type: 'operation.accepted'
      readonly runId?: never
    })
  | (ProductFrameBase & {
      readonly type: 'skill.requested'
      readonly skill: {
        readonly name: string
        readonly version: string
      }
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
      readonly type: 'interaction.resolved'
      readonly interactionId: string
      readonly resolution: 'answered' | 'cancelled'
    })
  | (ProductFrameBase & {
      readonly type: 'review.resolved'
      readonly interactionId: string
      readonly patchId: string
      readonly decisionKey: string
      readonly resolution: 'answered' | 'cancelled'
    })
  | (ProductFrameBase & {
      readonly type: 'interrupt.acknowledged'
    })
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

export interface ProductOperationSink {
  write(frame: ProductOperationFrame): Promise<boolean>
  end(): void
}

export type AssignmentActionCoordinator = {
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
  ): Promise<AssignmentReviewCommit>
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

type ActiveProductOperation = {
  readonly operationId: string
  readonly kind: 'assignment' | 'chat'
  readonly lease: ProductOperationLease
  readonly bindings: Map<string, AssignmentReviewBinding>
  readonly redactionValues: string[]
  generalInteraction?: ActiveGeneralInteraction
  run?: ModelingRun
  recipe?: ManagedAssignmentRecipe
  proposal?: AssignmentProposalSession
  mcpSession?: AssignmentMcpProposalSession
  chatGuardPrepared?: boolean
  chatGuardSettlementAttempted?: boolean
  scratchPath?: string
  turn?: CodexProductTurn
}

type ActiveGeneralInteraction = {
  readonly publicInteractionId: string
  readonly nativeInteractionId: string
  readonly threadId: string
  readonly turnId: string
  readonly questions: ReadonlyMap<string, string>
  state: 'pending' | 'settling'
}

export class AssignmentActionError extends Error {
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
    code: AssignmentActionError['code'],
    status: number,
    displayMessage: string,
  ) {
    super(code)
    this.name = 'AssignmentActionError'
    this.code = code
    this.status = status
    this.displayMessage = displayMessage
  }
}

export function createAssignmentActionCoordinator(options: {
  readonly controller: SemesterWorkspaceController
  readonly mcpHost: AssignmentMcpHost
  readonly service: CodexChatService
}): AssignmentActionCoordinator {
  let active: ActiveProductOperation | undefined
  let shuttingDown = false

  const reserve = (
    operationId: string,
    kind: ActiveProductOperation['kind'],
  ): ActiveProductOperation => {
    if (shuttingDown) throw unavailable()
    if (active) {
      throw new AssignmentActionError(
        'action_busy',
        409,
        '다른 Codex 작업이 진행 중입니다.',
      )
    }
    let lease: ProductOperationLease
    try {
      lease = options.service.reserveProductOperation(operationId)
    } catch (error) {
      throw presentServiceError(error)
    }
    const operation = {
      operationId,
      kind,
      lease,
      bindings: new Map(),
      redactionValues: [options.mcpHost.token],
    } satisfies ActiveProductOperation
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
      if (active === operation) active = undefined
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
      throw new AssignmentActionError(
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
      invoke: (payload) => proposal.mcpTool.invoke(payload),
    })
  }

  const projectActivity = async (
    operation: ActiveProductOperation,
    activity: CodexProductActivity,
  ): Promise<ProductOperationFrame | undefined> => {
    const base = { operationId: operation.operationId }
    switch (activity.type) {
      case 'skill.requested': {
        if (operation.kind !== 'assignment' || !operation.recipe) {
          return undefined
        }
        return {
          ...base,
          type: 'skill.requested',
          skill: {
            name: operation.recipe.requestedSkillName,
            version: operation.recipe.version,
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
        const binding = await options.controller.bindAssignmentReview(activity)
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
        operation.bindings.set(binding.interactionId, binding)
        const patch = findPatch(options.controller, binding.patchId)
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
        const binding = operation.bindings.get(activity.interactionId)
        if (binding) {
          return {
            ...base,
            type: 'review.resolved',
            interactionId: activity.interactionId,
            patchId: binding.patchId,
            decisionKey: binding.decisionKey,
            resolution: activity.resolution,
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
    operation: ActiveProductOperation,
  ): Promise<boolean> => {
    if (!operation.chatGuardPrepared) return true
    if (operation.chatGuardSettlementAttempted) return false
    operation.chatGuardSettlementAttempted = true
    try {
      await options.controller.settleProductChatExecution({
        operationId: operation.operationId,
      })
      operation.chatGuardPrepared = false
      return true
    } catch {
      return false
    }
  }

  return {
    async startAssignment(input, operationOptions) {
      assertAssignmentRequest(input)
      options.controller.nativeCwd()
      const recipe = await materializeManagedAssignmentRecipe(
        options.controller.managedAppDataRoot(),
      ).catch(() => {
        throw new AssignmentActionError(
          'recipe_invalid',
          409,
          'Assignment Recipe를 확인한 뒤 다시 시도해 주세요.',
        )
      })
      await verifyManagedAssignmentRecipe(
        recipe,
        options.controller.managedAppDataRoot(),
      ).catch(() => {
        throw new AssignmentActionError(
          'recipe_invalid',
          409,
          'Assignment Recipe를 확인한 뒤 다시 시도해 주세요.',
        )
      })
      const actionId = `action_${randomUUID().replaceAll('-', '')}`
      const operation = reserve(actionId, 'assignment')
      operation.redactionValues.push(operationOptions.mcpUrl)
      operation.recipe = recipe
      let streamOpened = false
      try {
        await requireAccount(operation)
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
        })
        operation.run = prepared.run
        operation.redactionValues.push(
          recipe.path,
          prepared.scratchPath,
          ...prepared.stagedSources.map((source) => source.path),
          options.controller.nativeCwd(),
        )
        try {
          registerProposal(operation, prepared)
        } catch (error) {
          operation.run = await options.controller.failAssignmentActionStart({
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
          operation.run = await options.controller.failAssignmentActionStart({
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
            throw new AssignmentActionError(
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
          if (settledRun) operation.run = settledRun
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
          if (settledRun) operation.run = settledRun
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
        operation.turn = turn
        operation.redactionValues.push(turn.threadId, turn.turnId)
        try {
          operation.run = await options.controller.bindAssignmentAction({
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
          if (failedRun) operation.run = failedRun
          operation.mcpSession?.cancel()
          await options.service
            .abandonAcceptedProductTurn(turn, 'running_transition_unknown')
            .catch(() => undefined)
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
          await options.service
            .abandonAcceptedProductTurn(turn, 'mcp_binding_unknown')
            .catch(() => undefined)
          const settledRun = await options.controller
            .settleAssignmentAction({
              actionId,
              status: 'unknown',
              validationOutcome: 'unknown',
              failureCode: 'mcp_binding_unknown',
            })
            .catch(() => undefined)
          if (settledRun) operation.run = settledRun
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
        operation.generalInteraction = undefined
        operation.bindings.clear()
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
                  ? { failureCode: settlement.event.failure?.code ?? 'turn_failed' }
                  : settlement.event.status === 'completed' && !patchObserved
                    ? { failureCode: 'proposal_not_observed' }
                    : {}),
              }
            : {
                status: 'unknown' as const,
                validationOutcome: 'unknown' as const,
                failureCode: settlement.code,
              }
        try {
          operation.run = await options.controller.settleAssignmentAction({
            actionId,
            ...requestedSettlement,
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
          await options.service.recycleProductRuntime().catch(() => undefined)
        }
        await writeAssignmentTerminal(
          operationOptions.sink,
          operation,
          projectRunSettlement(operation.run),
        )
      } catch (error) {
        if (!streamOpened) throw presentActionError(error)
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
      const operation = reserve(operationId, 'chat')
      operation.redactionValues.push(operationOptions.mcpUrl)
      let streamOpened = false
      try {
        await requireAccount(operation)
        const courseId = requireCourseId(options.controller)
        const preparedExecution =
          await options.controller.prepareProductChatExecution({
            operationId,
            courseId,
            selectedMaterials: input.materials.map((material) => ({
              rawMaterialId: material.id,
              digest: material.digest,
            })),
          })
        operation.chatGuardPrepared = true
        operation.scratchPath = preparedExecution.scratchPath
        operation.redactionValues.push(
          preparedExecution.scratchPath,
          options.controller.nativeCwd(),
        )
        if (input.materials.length > 0) {
          const proposal = await options.controller.prepareAssignmentProposalSession({
            courseId,
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
        operation.turn = turn
        operation.redactionValues.push(turn.threadId, turn.turnId)
        await options.controller.bindProductChatExecution({
          operationId,
          threadId: turn.threadId,
          turnId: turn.turnId,
        })
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
        operation.generalInteraction = undefined
        operation.bindings.clear()
        operation.mcpSession?.cancel()
        if (settlement.type === 'unknown') {
          await options.service.recycleProductRuntime().catch(() => undefined)
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
        if (!streamOpened) throw presentActionError(error)
        if (operation.turn) {
          await options.service
            .abandonAcceptedProductTurn(
              operation.turn,
              'running_transition_unknown',
            )
            .catch(() => undefined)
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
      if (!active?.turn || !active.bindings.has(input.interactionId)) {
        throw new AssignmentActionError(
          'review_invalid',
          409,
          '검토 요청이 더 이상 활성 상태가 아닙니다.',
        )
      }
      return createAssignmentReviewCoordinator(options.controller, {
        answerUserInput: (answer) =>
          options.service.answerProductUserInput(answer),
      }).submit(input)
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
        if (
          !isUnknownOutcome(error) &&
          operation.generalInteraction === interaction
        ) {
          interaction.state = 'pending'
        }
        throw error
      }
    },

    disconnect(operationId) {
      if (active?.operationId !== operationId || !active.turn) return
      options.service.disconnectProductTurn(active.turn)
    },

    async interrupt(operationId) {
      if (!active?.turn || active.operationId !== operationId) {
        throw new AssignmentActionError(
          'action_unknown',
          404,
          '활성 작업을 찾지 못했습니다.',
        )
      }
      await options.service.interruptProductTurn(active.turn)
    },

    beginShutdown() {
      shuttingDown = true
      if (active?.turn) options.service.disconnectProductTurn(active.turn)
    },
  }
}

async function settlePreAcceptanceFailure(
  operation: ActiveProductOperation,
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
    `After the proposal, request exactly this review question: ${JSON.stringify(ASSIGNMENT_REVIEW_QUESTION)}`,
  ].join('\n\n')
}

async function renderChatInput(
  controller: SemesterWorkspaceController,
  input: ProductChatRequest,
  operation: ActiveProductOperation,
): Promise<string> {
  const scratchInstruction = operation.scratchPath
    ? `Use scratch only for transient writes: ${operation.scratchPath}`
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
    `After a proposal, request exactly this review question: ${JSON.stringify(ASSIGNMENT_REVIEW_QUESTION)}`,
  ].filter((value): value is string => value !== undefined).join('\n\n')
  if (Buffer.byteLength(rendered, 'utf8') > productTextMaxBytes) {
    throw new AssignmentActionError(
      'action_invalid',
      413,
      '선택 자료가 Chat 요청 한도를 넘었습니다.',
    )
  }
  return rendered
}

async function writeAssignmentTerminal(
  sink: ProductOperationSink,
  operation: ActiveProductOperation,
  terminal: AssignmentOperationSettlement,
): Promise<boolean> {
  const run = requireAssignmentRun(operation)
  return safeProductWrite(sink, {
    type: 'operation.terminal',
    operationId: operation.operationId,
    runId: run.id,
    ...terminal,
  })
}

async function writeChatTerminal(
  sink: ProductOperationSink,
  operation: ActiveProductOperation,
  terminal: ChatOperationSettlement,
): Promise<boolean> {
  if (operation.kind !== 'chat' || operation.run) {
    throw new TypeError('The product operation is not a Run-free Chat.')
  }
  return safeProductWrite(sink, {
    type: 'operation.terminal',
    operationId: operation.operationId,
    ...terminal,
  })
}

function requireAssignmentRun(operation: ActiveProductOperation): ModelingRun {
  if (operation.kind !== 'assignment' || !operation.run) {
    throw new TypeError('The Assignment operation has no ModelingRun.')
  }
  return operation.run
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

function requireCourseId(controller: SemesterWorkspaceController): string {
  const snapshot = controller.snapshot()
  if (snapshot?.state !== 'ready' || !snapshot.course) {
    throw new SemesterWorkspaceError(
      'course_unknown',
      'An active Course is required.',
    )
  }
  return snapshot.course.id
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
    throw new AssignmentActionError(
      'action_invalid',
      400,
      'Assignment action 입력을 확인해 주세요.',
    )
  }
}

function assertChatRequest(input: ProductChatRequest): void {
  if (
    input.text.trim().length === 0 ||
    Buffer.byteLength(input.text, 'utf8') > productTextMaxBytes ||
    input.materials.length > 2 ||
    new Set(input.materials.map((material) => material.id)).size !==
      input.materials.length
  ) {
    throw new AssignmentActionError(
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

function invalidInteraction(): AssignmentActionError {
  return new AssignmentActionError(
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
  if (error instanceof AssignmentActionError) return error.code
  return 'operation_failed'
}

function safeFailureCode(code: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : 'operation_failed'
}

function presentActionError(error: unknown): AssignmentActionError {
  if (error instanceof AssignmentActionError) return error
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
    return new AssignmentActionError(
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
    return new AssignmentActionError(
      'review_invalid',
      409,
      '변경 제안 또는 검토 상태를 확인해 주세요.',
    )
  }
  return presentServiceError(error)
}

function presentServiceError(error: unknown): AssignmentActionError {
  if (error instanceof AssignmentActionError) return error
  if (error instanceof CodexChatServiceError && error.code === 'active_turn') {
    return new AssignmentActionError(
      'action_busy',
      409,
      '다른 Codex 작업이 진행 중입니다.',
    )
  }
  return unavailable()
}

function unavailable(): AssignmentActionError {
  return new AssignmentActionError(
    'product_unavailable',
    503,
    safeRuntimeFailure,
  )
}
