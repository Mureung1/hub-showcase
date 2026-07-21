import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import {
  access,
  lstat,
  mkdir,
  readdir,
  readFile,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type { UserInputRequestedEvent } from '@ay-ple/codex-chat-runtime/contract'
import { PRODUCT_REVIEW_FEEDBACK_MAX_BYTES } from '@ay-ple/product-contract'

import { rootsAreDisjoint } from './root-isolation.js'
import { SemesterWorkspaceError } from './semester-workspace-error.js'
import {
  actionScratchRelativeRoot,
  currentWorkspaceStoreFormatVersion,
  semesterWorkspaceStore,
  workspaceProductDirectoryName,
} from './semester-workspace-store.js'
import type {
  ExecutionGuard,
  PersistedStatePatch,
  PersistedWorkspaceState,
} from './semester-workspace-store.js'
import {
  actionMetadataMaxBytes,
  cloneAssignment,
  cloneAssignmentUpsert,
  cloneEvidenceRef,
  cloneModelingRun,
  cloneStatePatch,
  hasErrnoCode,
  invalidWorkspaceStore as invalidStore,
  isActionId,
  isBoundedMeaningfulText,
  isChatOperationId,
  isCourseId,
  isDecisionKey,
  isEvidenceArray,
  isExactAssignmentUpsert,
  isExactRecord,
  isMaterialId,
  isModelingRunRecoveryOutcome,
  isModelingRunSourceBaseline,
  isNativeCorrelation,
  isOpaqueRuntimeIdentity,
  isPatchId,
  isProductOperationId,
  isProposalKey,
  isRecord,
  isRunId,
  isSafeAbsoluteActionPath,
  isSafeFailureCode,
  isSafeMaterialRelativePath,
  isSafeSkillName,
  isSha256Digest,
  isWorkspaceId,
  materialFileMaxBytes,
  materialMediaType,
  normalizeStatePatchPayload,
  proposalSummaryMaxBytes,
} from './semester-workspace-values.js'
import type { CanonicalStatePatchPayload } from './semester-workspace-values.js'
import { isExactAssignmentReviewQuestion } from './state-patch-review.js'

export { SemesterWorkspaceError } from './semester-workspace-error.js'
export type { SemesterWorkspaceErrorCode } from './semester-workspace-error.js'

const storeFormatVersion = currentWorkspaceStoreFormatVersion
const productDirectoryName = workspaceProductDirectoryName
const incompatibleStoreDisplayMessage =
  '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.'
const materialAggregateMaxBytes = 8 * 1024 * 1024
const materialScanEntryMax = 4096
const materialPreviewMaxBytes = 256 * 1024
const actionArgumentMaxBytes = 16 * 1024
const actionStagingDirectoryName = 'assignment-runs'
const defaultActionCleanupDeadlineMs = 5_000
const maximumActionCleanupDeadlineMs = 30_000
const execFileAsync = promisify(execFile)

export type Course = {
  readonly id: string
  readonly displayName: string
}

export type RawMaterial = {
  readonly id: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: typeof materialMediaType
  readonly size: number
}

export type RawMaterialPreview = {
  readonly materialId: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: typeof materialMediaType
  readonly size: number
  readonly text: string
  readonly truncated: boolean
}

export type ReadySemesterWorkspaceSnapshot = {
  readonly state: 'ready'
  readonly storeFormatVersion: 2
  readonly confirmedRevision: number
  readonly course: Course | null
  readonly materials: readonly RawMaterial[]
}

export type IncompatibleSemesterWorkspaceSnapshot = {
  readonly state: 'incompatible'
  readonly readOnly: true
  readonly supportedStoreFormatVersion: 2
  readonly foundStoreFormatVersion: number | null
  readonly displayMessage: string
}

export type SemesterWorkspaceSnapshot =
  | ReadySemesterWorkspaceSnapshot
  | IncompatibleSemesterWorkspaceSnapshot

export type SemesterWorkspaceActivation =
  | {
      readonly status: 'activated'
      readonly workspace: SemesterWorkspaceSnapshot
    }
  | {
      readonly status: 'cancelled'
      readonly workspace: SemesterWorkspaceSnapshot | null
    }

export type SemesterWorkspaceDirectoryChooser = () => Promise<string | null>

export type SemesterWorkspaceController = {
  activate(): Promise<SemesterWorkspaceActivation>
  assignmentState(): AssignmentStateSnapshot
  bindAssignmentAction(input: BindAssignmentActionInput): Promise<ModelingRun>
  bindAssignmentProposalSession(
    input: BindAssignmentProposalSessionInput,
  ): Promise<AssignmentProposalSession>
  bindProductChatExecution(input: BindProductChatExecutionInput): Promise<void>
  bindAssignmentReview(
    request: UserInputRequestedEvent,
  ): Promise<AssignmentReviewBinding | null>
  commitAssignmentReviewDecision(
    input: AssignmentReviewSettlementInput,
  ): Promise<AssignmentReviewCommit>
  createCourse(displayName: string): Promise<ReadySemesterWorkspaceSnapshot>
  createAssignmentProposalSession(
    input: CreateAssignmentProposalSessionInput,
  ): Promise<AssignmentProposalSession>
  failAssignmentActionStart(
    input: FailAssignmentActionStartInput,
  ): Promise<ModelingRun>
  executionGuardRequiresFreshRuntime(operationId: string): boolean
  modelingRun(actionId: string): ModelingRun | null
  modelingRuns(): readonly ModelingRun[]
  managedAppDataRoot(): string
  nativeCwd(): string
  prepareAssignmentAction(
    input: PrepareAssignmentActionInput,
  ): Promise<PreparedAssignmentAction>
  prepareAssignmentProposalSession(
    input: PrepareAssignmentProposalSessionInput,
  ): Promise<AssignmentProposalSession>
  prepareProductChatExecution(
    input: PrepareProductChatExecutionInput,
  ): Promise<PreparedProductChatExecution>
  readMaterialPreview(input: {
    readonly materialId: string
    readonly digest: string
  }): Promise<RawMaterialPreview>
  requestAssignmentReviewRevision(
    input: AssignmentReviewRevisionInput,
  ): Promise<AssignmentReviewRevision>
  interruptAssignmentReviewRevision(input: {
    readonly interactionId: string
    readonly patchId: string
    readonly decisionKey: string
    readonly requestKey: string
  }): Promise<void>
  releaseAssignmentProposalSession(requestKey: string): Promise<void>
  refreshMaterials(): Promise<ReadySemesterWorkspaceSnapshot>
  selectCourse(courseId: string): Promise<ReadySemesterWorkspaceSnapshot>
  settleAssignmentAction(
    input: SettleAssignmentActionInput,
  ): Promise<ModelingRun>
  settleProductChatExecution(
    input: SettleProductChatExecutionInput,
  ): Promise<void>
  snapshot(): SemesterWorkspaceSnapshot | null
}

export type ModelingRunStatus =
  | 'starting'
  | 'not_accepted'
  | 'acceptance_unknown'
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'unknown'

export type ModelingRunValidationOutcome =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'unknown'

export type ModelingRunSource = {
  readonly rawMaterialId: string
  readonly digest: string
}

export type ModelingRunRecoveryOutcome =
  | { readonly outcome: 'interrupted' | 'unknown' }
  | {
      readonly outcome: 'continuation_lost'
      readonly confirmedRevision: number
    }

export type ModelingRun = {
  readonly id: string
  readonly actionId: string
  readonly courseId: string
  readonly invocationFingerprint: string
  readonly requestedSkillName: string
  readonly requestedSkillPath: string
  readonly recipeName: string
  readonly recipeVersion: string
  readonly recipeDigest: string
  readonly argumentsDigest: string
  readonly sourceBaseline: readonly ModelingRunSource[]
  readonly retryOfRunId?: string
  readonly recoveryOutcome?: ModelingRunRecoveryOutcome
  readonly status: ModelingRunStatus
  readonly validationOutcome: ModelingRunValidationOutcome
  readonly createdAt: string
  readonly updatedAt: string
  readonly nativeCorrelation?: {
    readonly threadId: string
    readonly turnId: string
  }
  readonly failureCode?: string
  readonly settledAt?: string
}

export type PrepareAssignmentActionInput = {
  readonly actionId: string
  readonly courseId: string
  readonly recipe: {
    readonly name: string
    readonly version: string
    readonly digest: string
    readonly requestedSkillName: string
    readonly requestedSkillPath: string
  }
  readonly arguments: {
    readonly canonical: string
    readonly digest: string
  }
  readonly selectedMaterials: readonly ModelingRunSource[]
  readonly retryOfRunId?: string
}

export type PreparedAssignmentAction = AssignmentProposalSession & {
  readonly run: ModelingRun
  readonly stagedSources: readonly (ModelingRunSource & {
    readonly path: string
  })[]
  readonly scratchPath: string
}

export type BindAssignmentActionInput = {
  readonly actionId: string
  readonly threadId: string
  readonly turnId: string
}

export type FailAssignmentActionStartInput =
  | {
      readonly actionId: string
      readonly status: 'not_accepted'
      readonly failureCode: string
      readonly nativeCorrelation?: never
    }
  | {
      readonly actionId: string
      readonly status: 'acceptance_unknown'
      readonly failureCode: string
      readonly nativeCorrelation?: {
        readonly threadId: string
        readonly turnId: string
      }
    }

export type SettleAssignmentActionInput = {
  readonly actionId: string
  readonly status: 'completed' | 'failed' | 'interrupted' | 'unknown'
  readonly validationOutcome: Exclude<ModelingRunValidationOutcome, 'pending'>
  readonly failureCode?: string
  readonly recoveryOutcome?: ModelingRunRecoveryOutcome
}

export type PrepareProductChatExecutionInput = {
  readonly operationId: string
  readonly courseId: string
  readonly selectedMaterials: readonly ModelingRunSource[]
}

export type PreparedProductChatExecution = {
  readonly scratchPath: string
}

export type BindProductChatExecutionInput = {
  readonly operationId: string
  readonly threadId: string
  readonly turnId: string
}

export type SettleProductChatExecutionInput = {
  readonly operationId: string
}

export type AssignmentField = 'title' | 'dueAt' | 'submissionMethod'

export type EvidenceRef = {
  readonly field: AssignmentField
  readonly rawMaterialId: string
  readonly digest: string
  readonly quote: string
}

export type AssignmentValues = {
  readonly title: string
  readonly dueAt: string
  readonly submissionMethod: string
}

export type AssignmentUpsert = {
  readonly operation: 'assignment.upsert'
  readonly assignmentId?: string
  readonly values: AssignmentValues
}

export type Assignment = AssignmentValues & {
  readonly id: string
  readonly courseId: string
  readonly evidence: readonly EvidenceRef[]
}

export type StatePatchStatus =
  | 'pending'
  | 'superseded'
  | 'applied'
  | 'rejected'
  | 'interrupted'

export type StatePatchApplyOutcome =
  | null
  | {
      readonly type: 'applied'
      readonly assignmentId: string
      readonly resultingRevision: number
    }
  | {
      readonly type: 'not_applied'
      readonly revision: number
    }

export type StatePatch = {
  readonly id: string
  readonly workspaceId: string
  readonly courseId: string
  readonly requestKey: string
  readonly baseRevision: number
  readonly summary: string
  readonly changes: AssignmentUpsert
  readonly evidence: readonly EvidenceRef[]
  readonly origin?: string
  readonly status: StatePatchStatus
  readonly createdAt: string
  readonly applyOutcome: StatePatchApplyOutcome
}

export type UserConfirmation = {
  readonly id: string
  readonly patchId: string
  readonly decisionKey: string
  readonly decision: 'accepted' | 'rejected'
  readonly settledAt: string
  readonly assignmentId?: string
  readonly resultingRevision?: number
  readonly outcome: 'applied' | 'not_applied'
}

export type AssignmentStateSnapshot = {
  readonly workspaceId: string
  readonly courseId: string
  readonly confirmedRevision: number
  readonly assignments: readonly Assignment[]
  readonly statePatches: readonly StatePatch[]
  readonly userConfirmations: readonly UserConfirmation[]
}

export type AssignmentProposalContext = {
  readonly requestKey: string
  readonly workspaceId: string
  readonly courseId: string
  readonly baseRevision: number
  readonly selectedMaterials: readonly {
    readonly rawMaterialId: string
    readonly digest: string
  }[]
}

export type CreateAssignmentProposalSessionInput = {
  readonly courseId: string
  readonly selectedMaterials: readonly {
    readonly rawMaterialId: string
    readonly digest: string
  }[]
  readonly runtime: {
    readonly threadId: string
    readonly turnId: string
  }
}

export type PrepareAssignmentProposalSessionInput = Omit<
  CreateAssignmentProposalSessionInput,
  'runtime'
>

export type BindAssignmentProposalSessionInput = {
  readonly requestKey: string
  readonly threadId: string
  readonly turnId: string
}

export type ProposeStatePatchMcpTool = {
  readonly name: 'propose_state_patch'
  invoke(input: unknown): Promise<StatePatch>
}

export type AssignmentProposalSession = {
  readonly context: AssignmentProposalContext
  readonly mcpTool: ProposeStatePatchMcpTool
}

export type AssignmentReviewBinding = {
  readonly interactionId: string
  readonly patchId: string
  readonly decisionKey: string
}

export type AssignmentReviewDecisionInput = {
  readonly interactionId: string
  readonly patchId: string
  readonly decisionKey: string
} & (
  | { readonly decision: 'accept' | 'reject' }
  | { readonly decision: 'revise'; readonly feedback: string }
)

export type AssignmentReviewSettlementInput = {
  readonly interactionId: string
  readonly patchId: string
  readonly decisionKey: string
  readonly decision: 'accept' | 'reject'
}

export type AssignmentReviewRevisionInput = {
  readonly interactionId: string
  readonly patchId: string
  readonly decisionKey: string
  readonly decision: 'revise'
  readonly feedback: string
}

export type AssignmentReviewCommit = {
  readonly binding: AssignmentReviewBinding
  readonly confirmation: UserConfirmation
  readonly patch: StatePatch
  readonly confirmedRevision: number
  readonly replayed: boolean
}

export type AssignmentReviewRevision = {
  readonly binding: AssignmentReviewBinding
  readonly patch: StatePatch
  readonly proposal: AssignmentProposalSession
  readonly confirmedRevision: number
  readonly feedback: string
  readonly replayed: boolean
}

export type StatePatchReviewErrorCode =
  | 'proposal_context_invalid'
  | 'proposal_conflict'
  | 'proposal_invalid'
  | 'proposal_stale'
  | 'review_conflict'
  | 'review_not_pending'

export class StatePatchReviewError extends Error {
  readonly code: StatePatchReviewErrorCode

  constructor(code: StatePatchReviewErrorCode, message: string) {
    super(message)
    this.name = 'StatePatchReviewError'
    this.code = code
  }
}

export function createMacOsSemesterWorkspaceChooser(options: {
  readonly platform?: NodeJS.Platform
} = {}): SemesterWorkspaceDirectoryChooser {
  return async () => {
    if ((options.platform ?? process.platform) !== 'darwin') {
      throw new SemesterWorkspaceError(
        'chooser_unavailable',
        'SemesterWorkspace folder selection is available on macOS.',
      )
    }
    const { stdout } = await execFileAsync('/usr/bin/osascript', [
      '-e',
      [
        'try',
        'set chosenFolder to choose folder with prompt "AY-PLE에서 사용할 학기 폴더를 선택하세요."',
        'return POSIX path of chosenFolder',
        'on error number -128',
        'return ""',
        'end try',
      ].join('\n'),
    ])
    const selected = stdout.replace(/\r?\n$/, '')
    return selected.length > 0 ? selected : null
  }
}

type ActionCleanupPolicy = {
  readonly deadlineMs: number
  readonly beforeCleanup?: () => void | Promise<void>
}

type ActiveProposalContext = {
  readonly context: AssignmentProposalContext
  runtime?: {
    readonly threadId: string
    readonly turnId: string
  }
  readonly actionId?: string
  readonly guardOperationId?: string
  readonly replacement?: AssignmentReviewBinding
}

type BoundActiveProposalContext = ActiveProposalContext & {
  readonly runtime: {
    readonly threadId: string
    readonly turnId: string
  }
}

type ActiveReviewBinding = AssignmentReviewBinding & {
  readonly threadId: string
  readonly turnId: string
  revision?: {
    readonly feedback: string
    readonly requestKey: string
    state: 'awaiting_replacement' | 'replaced' | 'interrupted'
  }
}

type OpenWorkspace =
  | {
      readonly root: string
      store: PersistedWorkspaceState
      snapshot: ReadySemesterWorkspaceSnapshot
    }
  | {
      readonly root: string
      readonly snapshot: IncompatibleSemesterWorkspaceSnapshot
    }

export function createSemesterWorkspaceController(options: {
  readonly appDataRoot: string
  readonly actionCleanupDeadlineMs?: number
  readonly beforeActionArtifactCleanup?: () => void | Promise<void>
  readonly beforeActionStoreWrite?: (
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>
  readonly chooseDirectory: SemesterWorkspaceDirectoryChooser
  readonly packageRoot: string
}): SemesterWorkspaceController {
  const cleanupPolicy = actionCleanupPolicy(options)
  let active: OpenWorkspace | undefined
  let activeAppDataRoot: string | undefined
  let operationTail = Promise.resolve()
  const proposalContexts = new Map<string, ActiveProposalContext>()
  const activePatchByTurn = new Map<string, string>()
  const actionByTurn = new Map<string, string>()
  const reviewBindings = new Map<string, ActiveReviewBinding>()

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationTail.then(operation)
    operationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  const proposalSession = (
    activeContext: ActiveProposalContext,
  ): AssignmentProposalSession => ({
    context: cloneAssignmentProposalContext(activeContext.context),
    mcpTool: {
      name: 'propose_state_patch',
      invoke: (payload) =>
        enqueue(async () => {
          if (
            proposalContexts.get(activeContext.context.requestKey) !==
            activeContext
          ) {
            throw new StatePatchReviewError(
              'proposal_context_invalid',
              'The proposal session is no longer active.',
            )
          }
          const opened = requireReadyWorkspace(active)
          if (!activeContext.runtime) {
            throw new StatePatchReviewError(
              'proposal_context_invalid',
              'The proposal session is not bound to an accepted native Turn.',
            )
          }
          const guardedOperationId =
            activeContext.actionId ?? activeContext.guardOperationId
          if (guardedOperationId) {
            await assertExecutionGuard(
              opened,
              requireActiveAppDataRoot(activeAppDataRoot),
              guardedOperationId,
            )
          }
          try {
            return await proposeAssignmentStatePatch(
              opened,
              activeContext as BoundActiveProposalContext,
              payload,
              activePatchByTurn,
              reviewBindings,
            )
          } catch (error) {
            if (
              activeContext.replacement &&
              error instanceof StatePatchReviewError
            ) {
              await interruptAssignmentReviewRevision(
                opened,
                activeContext.replacement,
                activeContext.context.requestKey,
                reviewBindings,
                activePatchByTurn,
              )
              proposalContexts.delete(activeContext.context.requestKey)
            }
            throw error
          }
        }),
    },
  })

  return {
    activate() {
      return enqueue(async () => {
        if (active && 'store' in active) assertNoExecutionGuard(active)
        const selected = await options.chooseDirectory()
        if (selected === null) {
          return {
            status: 'cancelled',
            workspace: active ? cloneSnapshot(active.snapshot) : null,
          }
        }

        const [packageRoot, appDataRoot, workspaceRoot] = await Promise.all([
          canonicalDirectory(options.packageRoot),
          canonicalDirectory(options.appDataRoot),
          canonicalDirectory(selected),
        ])
        assertDisjointRoots([packageRoot, appDataRoot, workspaceRoot])
        const opened = await openWorkspace(workspaceRoot)
        if ('store' in opened) {
          await reconcileUncommittedExecutionArtifacts(
            opened,
            appDataRoot,
          )
          const mayRefresh = await reconcileExecutionGuard(
            opened,
            appDataRoot,
            cleanupPolicy,
          )
          if (mayRefresh) await refreshReadyWorkspace(opened)
        } else if (active) {
          throw new SemesterWorkspaceError(
            'workspace_incompatible',
            incompatibleStoreDisplayMessage,
          )
        }
        active = opened
        activeAppDataRoot = appDataRoot
        proposalContexts.clear()
        activePatchByTurn.clear()
        actionByTurn.clear()
        reviewBindings.clear()
        return {
          status: 'activated',
          workspace: cloneSnapshot(opened.snapshot),
        }
      })
    },

    assignmentState() {
      const opened = requireReadyWorkspace(active)
      if (!opened.store.course) {
        throw new StatePatchReviewError(
          'proposal_context_invalid',
          'An active Course is required for Assignment state.',
        )
      }
      return assignmentStateSnapshot(opened.store)
    },

    bindAssignmentAction(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const appDataRoot = requireActiveAppDataRoot(activeAppDataRoot)
        assertBindAssignmentActionInput(input)
        await assertExecutionGuard(opened, appDataRoot, input.actionId)
        const runIndex = opened.store.modelingRuns.findIndex(
          (run) => run.actionId === input.actionId,
        )
        const run = opened.store.modelingRuns[runIndex]
        if (
          run?.status === 'running' &&
          run.nativeCorrelation?.threadId === input.threadId &&
          run.nativeCorrelation.turnId === input.turnId
        ) {
          return cloneModelingRun(run)
        }
        if (runIndex < 0 || !run || run.status !== 'starting') {
          throw new SemesterWorkspaceError(
            'action_conflict',
            'The Assignment action is not awaiting native acceptance.',
          )
        }
        const activeContext = [...proposalContexts.values()].find(
          (candidate) => candidate.actionId === input.actionId,
        )
        if (!activeContext || activeContext.runtime) {
          throw new SemesterWorkspaceError(
            'action_conflict',
            'The Assignment action proposal context cannot be bound.',
          )
        }
        const turnKey = runtimeTurnKey(input)
        if (actionByTurn.has(turnKey)) {
          throw new SemesterWorkspaceError(
            'action_conflict',
            'The native Turn is already bound to an Assignment action.',
          )
        }
        const now = new Date().toISOString()
        const running = {
          ...run,
          status: 'running',
          validationOutcome: 'pending',
          updatedAt: now,
          nativeCorrelation: {
            threadId: input.threadId,
            turnId: input.turnId,
          },
        } satisfies ModelingRun
        const nextStore = {
          ...opened.store,
          modelingRuns: opened.store.modelingRuns.map((candidate, index) =>
            index === runIndex ? running : candidate,
          ),
          executionGuard: {
            ...opened.store.executionGuard!,
            nativeCorrelation: {
              threadId: input.threadId,
              turnId: input.turnId,
            },
          },
        } satisfies PersistedWorkspaceState
        await options.beforeActionStoreWrite?.('bind')
        await semesterWorkspaceStore.write(opened.root, nextStore)
        opened.store = nextStore
        opened.snapshot = readySnapshot(nextStore)
        activeContext.runtime = {
          threadId: input.threadId,
          turnId: input.turnId,
        }
        actionByTurn.set(turnKey, input.actionId)
        return cloneModelingRun(running)
      })
    },

    bindAssignmentProposalSession(input) {
      return enqueue(async () => {
        if (
          !isProposalKey(input.requestKey) ||
          !isOpaqueRuntimeIdentity(input.threadId) ||
          !isOpaqueRuntimeIdentity(input.turnId)
        ) {
          throw new StatePatchReviewError(
            'proposal_context_invalid',
            'The proposal runtime binding is invalid.',
          )
        }
        const activeContext = proposalContexts.get(input.requestKey)
        if (!activeContext || activeContext.actionId) {
          throw new StatePatchReviewError(
            'proposal_context_invalid',
            'The proposal session is not available for Chat binding.',
          )
        }
        if (activeContext.runtime) {
          if (
            activeContext.runtime.threadId !== input.threadId ||
            activeContext.runtime.turnId !== input.turnId
          ) {
            throw new StatePatchReviewError(
              'proposal_conflict',
              'The proposal session is already bound to another native Turn.',
            )
          }
          return proposalSession(activeContext)
        }
        const turnKey = runtimeTurnKey(input)
        if (
          [...proposalContexts.values()].some(
            (candidate) =>
              candidate !== activeContext &&
              candidate.runtime !== undefined &&
              runtimeTurnKey(candidate.runtime) === turnKey,
          )
        ) {
          throw new StatePatchReviewError(
            'proposal_conflict',
            'The native Turn already has another proposal context.',
          )
        }
        activeContext.runtime = {
          threadId: input.threadId,
          turnId: input.turnId,
        }
        return proposalSession(activeContext)
      })
    },

    bindProductChatExecution(input) {
      return enqueue(() =>
        bindProductChatExecution(
          requireReadyWorkspace(active),
          requireActiveAppDataRoot(activeAppDataRoot),
          input,
        ),
      )
    },

    bindAssignmentReview(request) {
      return enqueue(async () => {
        if (!isExactAssignmentReviewQuestion(request.questions)) return null
        const opened = requireReadyWorkspace(active)
        const turnKey = runtimeTurnKey(request)
        const operationId =
          actionByTurn.get(turnKey) ??
          guardOperationForRuntime(opened.store, request)
        if (operationId) {
          await assertExecutionGuard(
            opened,
            requireActiveAppDataRoot(activeAppDataRoot),
            operationId,
          )
        }
        const patchId = activePatchByTurn.get(turnKey)
        if (!patchId) return null
        const patch = opened.store.statePatches.find(
          (candidate) => candidate.id === patchId,
        )
        if (!patch || patch.status !== 'pending') return null

        const existing = reviewBindings.get(request.interactionId)
        if (existing) {
          if (
            existing.patchId !== patchId ||
            existing.threadId !== request.threadId ||
            existing.turnId !== request.turnId
          ) {
            throw new StatePatchReviewError(
              'review_conflict',
              'The native interaction is already bound to another Review.',
            )
          }
          return cloneReviewBinding(existing)
        }
        if (
          [...reviewBindings.values()].some(
            (binding) => binding.patchId === patchId,
          )
        ) {
          throw new StatePatchReviewError(
            'review_conflict',
            'The StatePatch is already bound to another Review.',
          )
        }
        const binding = {
          interactionId: request.interactionId,
          patchId,
          decisionKey: `decision_${randomUUID().replaceAll('-', '')}`,
          threadId: request.threadId,
          turnId: request.turnId,
        } satisfies ActiveReviewBinding
        reviewBindings.set(binding.interactionId, binding)
        return cloneReviewBinding(binding)
      })
    },

    commitAssignmentReviewDecision(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const binding = reviewBindings.get(input.interactionId)
        const operationId = binding
          ? actionByTurn.get(runtimeTurnKey(binding)) ??
            guardOperationForRuntime(opened.store, binding)
          : undefined
        if (operationId) {
          await assertExecutionGuard(
            opened,
            requireActiveAppDataRoot(activeAppDataRoot),
            operationId,
          )
        }
        return commitAssignmentReviewDecision(
          opened,
          input,
          reviewBindings,
          activePatchByTurn,
          operationId,
        )
      })
    },

    requestAssignmentReviewRevision(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const binding = reviewBindings.get(input.interactionId)
        const operationId = binding
          ? actionByTurn.get(runtimeTurnKey(binding)) ??
            guardOperationForRuntime(opened.store, binding)
          : undefined
        if (operationId) {
          await assertExecutionGuard(
            opened,
            requireActiveAppDataRoot(activeAppDataRoot),
            operationId,
          )
        }
        const revision = requestAssignmentReviewRevision(
          opened,
          input,
          proposalContexts,
          reviewBindings,
          activePatchByTurn,
        )
        return {
          binding: revision.binding,
          patch: revision.patch,
          proposal: proposalSession(revision.activeContext),
          confirmedRevision: revision.confirmedRevision,
          feedback: revision.feedback,
          replayed: revision.replayed,
        }
      })
    },

    interruptAssignmentReviewRevision(input) {
      return enqueue(async () => {
        if (
          !isOpaqueRuntimeIdentity(input.interactionId) ||
          !isPatchId(input.patchId) ||
          !isDecisionKey(input.decisionKey) ||
          !isProposalKey(input.requestKey)
        ) {
          throw new StatePatchReviewError(
            'review_conflict',
            'The Review revision binding is invalid.',
          )
        }
        const opened = requireReadyWorkspace(active)
        await interruptAssignmentReviewRevision(
          opened,
          input,
          input.requestKey,
          reviewBindings,
          activePatchByTurn,
        )
        proposalContexts.delete(input.requestKey)
      })
    },

    createCourse(displayName) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        assertNoExecutionGuard(opened)
        if (opened.store.course) {
          throw new SemesterWorkspaceError(
            'course_already_exists',
            'The first vertical supports one Course.',
          )
        }
        const normalizedName = displayName.trim()
        if (
          normalizedName.length === 0 ||
          Buffer.byteLength(normalizedName, 'utf8') > 512
        ) {
          throw new SemesterWorkspaceError(
            'course_invalid',
            'Course display name must be non-empty and bounded.',
          )
        }
        const nextStore = {
          ...opened.store,
          course: {
            id: `course_${randomUUID().replaceAll('-', '')}`,
            displayName: normalizedName,
          },
        } satisfies PersistedWorkspaceState
        await semesterWorkspaceStore.write(opened.root, nextStore)
        opened.store = nextStore
        opened.snapshot = readySnapshot(nextStore)
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    createAssignmentProposalSession(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        if (
          !isOpaqueRuntimeIdentity(input.runtime.threadId) ||
          !isOpaqueRuntimeIdentity(input.runtime.turnId)
        ) {
          throw new StatePatchReviewError(
            'proposal_context_invalid',
            'The proposal context is invalid.',
          )
        }
        const activeContext = prepareProposalContext(opened, input)
        activeContext.runtime = { ...input.runtime }
        proposalContexts.set(activeContext.context.requestKey, activeContext)
        return proposalSession(activeContext)
      })
    },

    failAssignmentActionStart(input) {
      return enqueue(() =>
        failAssignmentActionStart(
          requireReadyWorkspace(active),
          requireActiveAppDataRoot(activeAppDataRoot),
          input,
          proposalContexts,
          actionByTurn,
          activePatchByTurn,
          reviewBindings,
          options.beforeActionStoreWrite,
          cleanupPolicy,
        ),
      )
    },

    modelingRun(actionId) {
      const opened = requireReadyWorkspace(active)
      const run = opened.store.modelingRuns.find(
        (candidate) => candidate.actionId === actionId,
      )
      return run ? cloneModelingRun(run) : null
    },

    modelingRuns() {
      return requireReadyWorkspace(active).store.modelingRuns.map(
        cloneModelingRun,
      )
    },

    executionGuardRequiresFreshRuntime(operationId) {
      const guard = requireReadyWorkspace(active).store.executionGuard
      return guard?.operationId === operationId
    },

    managedAppDataRoot() {
      requireReadyWorkspace(active)
      return requireActiveAppDataRoot(activeAppDataRoot)
    },

    nativeCwd() {
      return requireReadyWorkspace(active).root
    },

    prepareAssignmentAction(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const appDataRoot = requireActiveAppDataRoot(activeAppDataRoot)
        const prepared = await prepareAssignmentAction(
          opened,
          appDataRoot,
          input,
          options.beforeActionStoreWrite,
        )
        proposalContexts.set(
          prepared.activeContext.context.requestKey,
          prepared.activeContext,
        )
        return {
          run: cloneModelingRun(prepared.run),
          ...proposalSession(prepared.activeContext),
          stagedSources: prepared.stagedSources.map((source) => ({ ...source })),
          scratchPath: prepared.scratchPath,
        }
      })
    },

    prepareAssignmentProposalSession(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const activeContext = prepareProposalContext(opened, input)
        proposalContexts.set(activeContext.context.requestKey, activeContext)
        return proposalSession(activeContext)
      })
    },

    prepareProductChatExecution(input) {
      return enqueue(() =>
        prepareProductChatExecution(
          requireReadyWorkspace(active),
          input,
        ),
      )
    },

    readMaterialPreview(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        const material = opened.store.materials.find(
          (candidate) => candidate.id === input.materialId,
        )
        if (!material) {
          throw new SemesterWorkspaceError(
            'material_unknown',
            'The selected RawMaterial is not registered.',
          )
        }
        if (material.digest !== input.digest) {
          throw new SemesterWorkspaceError(
            'material_stale',
            'The selected RawMaterial changed. Refresh materials and try again.',
          )
        }
        const inspected = await inspectMaterialFile(
          opened.root,
          material.relativePath,
        )
        if (
          !inspected ||
          inspected.digest !== material.digest ||
          inspected.size !== material.size
        ) {
          throw new SemesterWorkspaceError(
            'material_stale',
            'The selected RawMaterial changed. Refresh materials and try again.',
          )
        }
        return {
          materialId: material.id,
          relativePath: material.relativePath,
          digest: material.digest,
          mediaType: material.mediaType,
          size: material.size,
          text: decodeBoundedPreview(inspected.bytes),
          truncated: inspected.bytes.byteLength > materialPreviewMaxBytes,
        }
      })
    },

    releaseAssignmentProposalSession(requestKey) {
      return enqueue(async () => {
        if (!isProposalKey(requestKey)) return
        const context = proposalContexts.get(requestKey)
        if (!context || context.actionId) return
        proposalContexts.delete(requestKey)
        if (!context.runtime) return
        const turnKey = runtimeTurnKey(context.runtime)
        const patchId = activePatchByTurn.get(turnKey)
        activePatchByTurn.delete(turnKey)
        releaseReviewBindingsForTurn(reviewBindings, turnKey, patchId)
      })
    },

    refreshMaterials() {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        assertNoExecutionGuard(opened)
        await refreshReadyWorkspace(opened)
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    selectCourse(courseId) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        assertNoExecutionGuard(opened)
        if (!opened.store.course || opened.store.course.id !== courseId) {
          throw new SemesterWorkspaceError(
            'course_unknown',
            'The selected Course does not exist in this SemesterWorkspace.',
          )
        }
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    settleAssignmentAction(input) {
      return enqueue(() =>
        settleAssignmentAction(
          requireReadyWorkspace(active),
          requireActiveAppDataRoot(activeAppDataRoot),
          input,
          proposalContexts,
          actionByTurn,
          activePatchByTurn,
          reviewBindings,
          options.beforeActionStoreWrite,
          cleanupPolicy,
        ),
      )
    },

    settleProductChatExecution(input) {
      return enqueue(() =>
        settleProductChatExecution(
          requireReadyWorkspace(active),
          requireActiveAppDataRoot(activeAppDataRoot),
          input,
          proposalContexts,
          activePatchByTurn,
          reviewBindings,
          cleanupPolicy,
        ),
      )
    },

    snapshot() {
      return active ? cloneSnapshot(active.snapshot) : null
    },
  }
}

async function refreshReadyWorkspace(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
): Promise<void> {
  const scanned = await scanRawMaterials(opened.root)
  const existingByPath = new Map(
    opened.store.materials.map((material) => [material.relativePath, material]),
  )
  const materials = scanned.map(({ bytes: _bytes, ...candidate }) => ({
    id:
      existingByPath.get(candidate.relativePath)?.id ??
      `material_${randomUUID().replaceAll('-', '')}`,
    ...candidate,
  }))
  const nextStore = {
    ...opened.store,
    materials,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
}

function prepareProposalContext(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: PrepareAssignmentProposalSessionInput,
): ActiveProposalContext {
  const executionGuard = opened.store.executionGuard
  if (
    executionGuard &&
    (executionGuard.kind !== 'product_chat' || executionGuard.state !== 'active')
  ) {
    assertNoExecutionGuard(opened)
  }
  const course = opened.store.course
  if (!course || course.id !== input.courseId) {
    throw new StatePatchReviewError(
      'proposal_context_invalid',
      'The proposal Course is not active in this SemesterWorkspace.',
    )
  }
  if (
    input.selectedMaterials.length === 0 ||
    input.selectedMaterials.length > 2 ||
    new Set(
      input.selectedMaterials.map((material) => material.rawMaterialId),
    ).size !== input.selectedMaterials.length
  ) {
    throw new StatePatchReviewError(
      'proposal_context_invalid',
      'The proposal context is invalid.',
    )
  }
  const selectedMaterials = input.selectedMaterials.map((selected) => {
    const material = opened.store.materials.find(
      (candidate) => candidate.id === selected.rawMaterialId,
    )
    if (!material || material.digest !== selected.digest) {
      throw new StatePatchReviewError(
        'proposal_context_invalid',
        'The proposal source selection is stale or unregistered.',
      )
    }
    return {
      rawMaterialId: material.id,
      digest: material.digest,
    }
  })
  if (
    executionGuard?.kind === 'product_chat' &&
    JSON.stringify(selectedMaterials) !==
      JSON.stringify(executionGuard.selectedMaterials)
  ) {
    throw new StatePatchReviewError(
      'proposal_context_invalid',
      'The proposal sources do not match the active Chat execution guard.',
    )
  }
  return {
    context: {
      requestKey: `proposal_${randomUUID().replaceAll('-', '')}`,
      workspaceId: opened.store.workspaceId,
      courseId: course.id,
      baseRevision: opened.store.confirmedRevision,
      selectedMaterials,
    },
    ...(executionGuard?.kind === 'product_chat'
      ? { guardOperationId: executionGuard.operationId }
      : {}),
  }
}

type PreparedAssignmentActionInternal = {
  readonly run: ModelingRun
  readonly activeContext: ActiveProposalContext
  readonly stagedSources: readonly (ModelingRunSource & {
    readonly path: string
  })[]
  readonly scratchPath: string
}

async function prepareProductChatExecution(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: PrepareProductChatExecutionInput,
): Promise<PreparedProductChatExecution> {
  assertNoExecutionGuard(opened)
  if (
    !isExactRecord(input, ['courseId', 'operationId', 'selectedMaterials']) ||
    !isChatOperationId(input.operationId) ||
    !isCourseId(input.courseId) ||
    !Array.isArray(input.selectedMaterials) ||
    input.selectedMaterials.length > 2 ||
    new Set(
      input.selectedMaterials.map((source) =>
        isRecord(source) ? source.rawMaterialId : undefined,
      ),
    ).size !== input.selectedMaterials.length ||
    !input.selectedMaterials.every(
      (source) =>
        isExactRecord(source, ['digest', 'rawMaterialId']) &&
        isMaterialId(source.rawMaterialId) &&
        isSha256Digest(source.digest),
    )
  ) {
    throw invalidAction()
  }
  const course = opened.store.course
  if (!course || course.id !== input.courseId) throw invalidAction()
  const selectedMaterials = input.selectedMaterials.map((source) => {
    const material = opened.store.materials.find(
      (candidate) => candidate.id === source.rawMaterialId,
    )
    if (!material || material.digest !== source.digest) throw invalidAction()
    return { rawMaterialId: material.id, digest: material.digest }
  })
  await inspectGuardedMaterials(opened)
  await assertStoreBytesMatchMemory(opened)
  const scratchPath = productScratchPath(opened.root, input.operationId)
  let scratchCreated = false
  try {
    await ensureManagedDirectory(path.dirname(scratchPath))
    await mkdir(scratchPath)
    scratchCreated = true
    await inspectGuardedMaterials(opened)
    await assertStoreBytesMatchMemory(opened)
    const guard = {
      operationId: input.operationId,
      kind: 'product_chat',
      confirmedRevision: opened.store.confirmedRevision,
      materials: opened.store.materials.map((material) => ({ ...material })),
      selectedMaterials,
      scratchRelativePath: `${actionScratchRelativeRoot}/${input.operationId}`,
      state: 'active',
      createdAt: new Date().toISOString(),
    } satisfies ExecutionGuard
    const nextStore = {
      ...opened.store,
      executionGuard: guard,
    } satisfies PersistedWorkspaceState
    await semesterWorkspaceStore.write(opened.root, nextStore)
    opened.store = nextStore
    opened.snapshot = readySnapshot(nextStore)
    return { scratchPath }
  } catch (error) {
    if (scratchCreated) {
      await removeManagedActionDirectory(scratchPath).catch(() => undefined)
    }
    throw error
  }
}

async function bindProductChatExecution(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: BindProductChatExecutionInput,
): Promise<void> {
  if (
    !isExactRecord(input, ['operationId', 'threadId', 'turnId']) ||
    !isChatOperationId(input.operationId) ||
    !isOpaqueRuntimeIdentity(input.threadId) ||
    !isOpaqueRuntimeIdentity(input.turnId)
  ) {
    throw invalidAction()
  }
  await assertExecutionGuard(opened, appDataRoot, input.operationId)
  const guard = opened.store.executionGuard
  if (!guard || guard.kind !== 'product_chat') throw executionGuardConflict()
  if (guard.nativeCorrelation) {
    if (
      guard.nativeCorrelation.threadId !== input.threadId ||
      guard.nativeCorrelation.turnId !== input.turnId
    ) {
      throw new SemesterWorkspaceError(
        'action_conflict',
        'The Chat execution guard is already bound to another native Turn.',
      )
    }
    return
  }
  const nextStore = {
    ...opened.store,
    executionGuard: {
      ...guard,
      nativeCorrelation: {
        threadId: input.threadId,
        turnId: input.turnId,
      },
    },
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
}

async function settleProductChatExecution(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: SettleProductChatExecutionInput,
  proposalContexts: Map<string, ActiveProposalContext>,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
  cleanupPolicy: ActionCleanupPolicy,
): Promise<void> {
  if (
    !isExactRecord(input, ['operationId']) ||
    !isChatOperationId(input.operationId)
  ) {
    throw invalidAction()
  }
  const guard = opened.store.executionGuard
  if (
    !guard ||
    guard.kind !== 'product_chat' ||
    guard.operationId !== input.operationId
  ) {
    throw new SemesterWorkspaceError(
      'action_conflict',
      'The Chat execution guard is not active.',
    )
  }
  let guardValid = true
  try {
    await assertExecutionGuard(opened, appDataRoot, input.operationId)
  } catch (error) {
    if (
      !(error instanceof SemesterWorkspaceError) ||
      error.code !== 'execution_guard_conflict'
    ) {
      throw error
    }
    await assertStoreBytesMatchMemory(opened)
    guardValid = false
  }
  const patchIds = proposalPatchIdsForOperation(
    input.operationId,
    proposalContexts,
    activePatchByTurn,
  )
  const guardedSettlement = {
    ...opened.store,
    statePatches: interruptPendingPatches(opened.store.statePatches, patchIds),
    executionGuard: {
      ...guard,
      state: guardValid ? 'cleanup_required' : 'recovery_required',
    },
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, guardedSettlement)
  opened.store = guardedSettlement
  opened.snapshot = readySnapshot(guardedSettlement)
  releaseProposalOperation(
    input.operationId,
    proposalContexts,
    activePatchByTurn,
    reviewBindings,
  )
  const cleaned = await cleanupExecutionGuardArtifacts(
    opened.root,
    appDataRoot,
    guard,
    cleanupPolicy,
  )
  if (!guardValid) throw executionGuardConflict()
  if (!cleaned) {
    throw new SemesterWorkspaceError(
      'execution_cleanup_required',
      'The Chat execution scratch requires cleanup.',
    )
  }
  const cleanedStore = {
    ...opened.store,
    executionGuard: null,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, cleanedStore)
  opened.store = cleanedStore
  opened.snapshot = readySnapshot(cleanedStore)
}

async function prepareAssignmentAction(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: PrepareAssignmentActionInput,
  beforeActionStoreWrite?: (
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>,
): Promise<PreparedAssignmentActionInternal> {
  assertNoExecutionGuard(opened)
  assertPrepareAssignmentActionInput(input)
  if (opened.store.modelingRuns.some((run) => run.actionId === input.actionId)) {
    throw new SemesterWorkspaceError(
      'action_conflict',
      'The Assignment action ID was already used.',
    )
  }
  const retrySource =
    input.retryOfRunId === undefined
      ? undefined
      : opened.store.modelingRuns.find((run) => run.id === input.retryOfRunId)
  if (
    input.retryOfRunId !== undefined &&
    (!retrySource ||
      (retrySource.status !== 'interrupted' &&
        retrySource.status !== 'unknown') ||
      (retrySource.recoveryOutcome?.outcome !== 'interrupted' &&
        retrySource.recoveryOutcome?.outcome !== 'unknown') ||
      opened.store.modelingRuns.some(
        (run) => run.retryOfRunId === input.retryOfRunId,
      ))
  ) {
    throw new SemesterWorkspaceError(
      'action_conflict',
      'The Assignment retry receipt is unavailable.',
    )
  }
  const course = opened.store.course
  if (!course || course.id !== input.courseId) {
    throw new SemesterWorkspaceError(
      'action_invalid',
      'The Assignment action Course is not active.',
    )
  }

  const selected = input.selectedMaterials.map((candidate) => {
    const material = opened.store.materials.find(
      (registered) => registered.id === candidate.rawMaterialId,
    )
    if (!material || material.digest !== candidate.digest) {
      throw new SemesterWorkspaceError(
        'action_invalid',
        'The Assignment action source selection is stale or unregistered.',
      )
    }
    return material
  })
  const guardedMaterials = await inspectGuardedMaterials(opened)
  const selectedBytes = selected.map((material) => {
    const inspected = guardedMaterials.get(material.id)
    if (!inspected) {
      throw new SemesterWorkspaceError(
        'execution_guard_conflict',
        'A selected Assignment source changed before staging.',
      )
    }
    return inspected.bytes
  })
  await assertStoreBytesMatchMemory(opened)

  const { stagingRoot, scratchPath } = actionArtifactPaths(
    opened.root,
    appDataRoot,
    input.actionId,
  )
  let artifactsCreated = false
  try {
    // Create workspace scratch first so a crash leaves a workspace-scoped
    // reconciliation key before app-data staging can exist.
    await ensureManagedDirectory(path.dirname(scratchPath))
    await mkdir(scratchPath)
    artifactsCreated = true
    await ensureManagedDirectory(path.dirname(stagingRoot))
    await mkdir(stagingRoot)
    const stagedSources = [] as Array<
      ModelingRunSource & { readonly path: string }
    >
    for (const [index, material] of selected.entries()) {
      const stagedPath = path.join(stagingRoot, `source-${index + 1}.txt`)
      await writeFile(stagedPath, selectedBytes[index]!, {
        flag: 'wx',
        mode: 0o400,
      })
      stagedSources.push({
        rawMaterialId: material.id,
        digest: material.digest,
        path: stagedPath,
      })
    }

    await inspectGuardedMaterials(opened)
    await assertStoreBytesMatchMemory(opened)
    const now = new Date().toISOString()
    const sourceBaseline = selected.map((material) => ({
      rawMaterialId: material.id,
      digest: material.digest,
    }))
    if (
      retrySource &&
      (retrySource.courseId !== course.id ||
        retrySource.requestedSkillName !== input.recipe.requestedSkillName ||
        retrySource.requestedSkillPath !== input.recipe.requestedSkillPath ||
        retrySource.recipeName !== input.recipe.name ||
        retrySource.recipeVersion !== input.recipe.version ||
        retrySource.recipeDigest !== input.recipe.digest ||
        retrySource.argumentsDigest !== input.arguments.digest ||
        JSON.stringify(retrySource.sourceBaseline) !==
          JSON.stringify(sourceBaseline))
    ) {
      throw new SemesterWorkspaceError(
        'action_conflict',
        'The Assignment retry no longer matches its receipt.',
      )
    }
    const invocationFingerprint = digestUtf8(
      JSON.stringify({
        actionId: input.actionId,
        workspaceId: opened.store.workspaceId,
        courseId: course.id,
        confirmedRevision: opened.store.confirmedRevision,
        requestedSkillName: input.recipe.requestedSkillName,
        requestedSkillPath: input.recipe.requestedSkillPath,
        recipeName: input.recipe.name,
        recipeVersion: input.recipe.version,
        recipeDigest: input.recipe.digest,
        argumentsDigest: input.arguments.digest,
        sourceBaseline,
        retryOfRunId: input.retryOfRunId ?? null,
      }),
    )
    const run = {
      id: `run_${randomUUID().replaceAll('-', '')}`,
      actionId: input.actionId,
      courseId: course.id,
      invocationFingerprint,
      requestedSkillName: input.recipe.requestedSkillName,
      requestedSkillPath: input.recipe.requestedSkillPath,
      recipeName: input.recipe.name,
      recipeVersion: input.recipe.version,
      recipeDigest: input.recipe.digest,
      argumentsDigest: input.arguments.digest,
      sourceBaseline,
      ...(input.retryOfRunId === undefined
        ? {}
        : { retryOfRunId: input.retryOfRunId }),
      status: 'starting',
      validationOutcome: 'pending',
      createdAt: now,
      updatedAt: now,
    } satisfies ModelingRun
    const executionGuard = {
      operationId: input.actionId,
      kind: 'assignment_action',
      runId: run.id,
      confirmedRevision: opened.store.confirmedRevision,
      materials: opened.store.materials.map((material) => ({ ...material })),
      selectedMaterials: sourceBaseline,
      scratchRelativePath: `${actionScratchRelativeRoot}/${input.actionId}`,
      state: 'active',
      createdAt: now,
    } satisfies ExecutionGuard
    const requestKey = `proposal_${randomUUID().replaceAll('-', '')}`
    const context = {
      requestKey,
      workspaceId: opened.store.workspaceId,
      courseId: course.id,
      baseRevision: opened.store.confirmedRevision,
      selectedMaterials: sourceBaseline,
    } satisfies AssignmentProposalContext
    const activeContext = {
      context,
      actionId: input.actionId,
    } satisfies ActiveProposalContext
    const nextStore = {
      ...opened.store,
      modelingRuns: [...opened.store.modelingRuns, run],
      executionGuard,
    } satisfies PersistedWorkspaceState
    await beforeActionStoreWrite?.('prepare')
    try {
      await semesterWorkspaceStore.write(opened.root, nextStore)
    } catch (error) {
      if (
        !(await semesterWorkspaceStore.matchesCanonicalBytes(
          opened.root,
          nextStore,
        ))
      ) {
        throw error
      }
    }
    opened.store = nextStore
    opened.snapshot = readySnapshot(nextStore)
    return { run, activeContext, stagedSources, scratchPath }
  } catch (error) {
    if (artifactsCreated) {
      try {
        await cleanupUncommittedActionArtifacts(
          opened.root,
          appDataRoot,
          input.actionId,
        )
      } catch {
        throw new SemesterWorkspaceError(
          'execution_cleanup_required',
          'The uncommitted Assignment artifacts require cleanup.',
        )
      }
    }
    throw error
  }
}

async function failAssignmentActionStart(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: FailAssignmentActionStartInput,
  proposalContexts: Map<string, ActiveProposalContext>,
  actionByTurn: Map<string, string>,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
  beforeActionStoreWrite?: (
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>,
  cleanupPolicy: ActionCleanupPolicy = {
    deadlineMs: defaultActionCleanupDeadlineMs,
  },
): Promise<ModelingRun> {
  if (
    !isExactRecord(
      input,
      ['actionId', 'failureCode', 'status'],
      ['nativeCorrelation'],
    ) ||
    !isActionId(input.actionId) ||
    (input.status !== 'not_accepted' &&
      input.status !== 'acceptance_unknown') ||
    !isSafeFailureCode(input.failureCode) ||
    (input.nativeCorrelation !== undefined &&
      (input.status !== 'acceptance_unknown' ||
        !isNativeCorrelation(input.nativeCorrelation)))
  ) {
    throw invalidAction()
  }
  return settleModelingRun(
    opened,
    appDataRoot,
    {
      actionId: input.actionId,
      status: input.status,
      validationOutcome:
        input.status === 'not_accepted' ? 'failed' : 'unknown',
      failureCode: input.failureCode,
      ...(input.nativeCorrelation === undefined
        ? {}
        : { nativeCorrelation: { ...input.nativeCorrelation } }),
    },
    ['starting'],
    proposalContexts,
    actionByTurn,
    activePatchByTurn,
    reviewBindings,
    input.status !== 'acceptance_unknown',
    beforeActionStoreWrite,
    'start_failure',
    cleanupPolicy,
  )
}

async function settleAssignmentAction(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: SettleAssignmentActionInput,
  proposalContexts: Map<string, ActiveProposalContext>,
  actionByTurn: Map<string, string>,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
  beforeActionStoreWrite?: (
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>,
  cleanupPolicy: ActionCleanupPolicy = {
    deadlineMs: defaultActionCleanupDeadlineMs,
  },
): Promise<ModelingRun> {
  if (
    !isActionId(input.actionId) ||
    !isTerminalModelingRunStatus(input.status) ||
    !isSettledValidationOutcome(input.validationOutcome) ||
    (input.failureCode !== undefined && !isSafeFailureCode(input.failureCode)) ||
    (input.recoveryOutcome !== undefined &&
      !isModelingRunRecoveryOutcome(input.recoveryOutcome))
  ) {
    throw invalidAction()
  }
  return settleModelingRun(
    opened,
    appDataRoot,
    input,
    ['running'],
    proposalContexts,
    actionByTurn,
    activePatchByTurn,
    reviewBindings,
    true,
    beforeActionStoreWrite,
    'settle',
    cleanupPolicy,
  )
}

async function settleModelingRun(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  input: {
    readonly actionId: string
    readonly status: Exclude<ModelingRunStatus, 'starting' | 'running'>
    readonly validationOutcome: Exclude<ModelingRunValidationOutcome, 'pending'>
    readonly failureCode?: string
    readonly recoveryOutcome?: ModelingRunRecoveryOutcome
    readonly nativeCorrelation?: {
      readonly threadId: string
      readonly turnId: string
    }
  },
  allowedStatuses: readonly ModelingRunStatus[],
  proposalContexts: Map<string, ActiveProposalContext>,
  actionByTurn: Map<string, string>,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
  cleanupAfterSettlement: boolean,
  beforeActionStoreWrite: ((
    point: 'prepare' | 'bind' | 'start_failure' | 'settle',
  ) => void | Promise<void>) | undefined,
  writePoint: 'start_failure' | 'settle',
  cleanupPolicy: ActionCleanupPolicy = {
    deadlineMs: defaultActionCleanupDeadlineMs,
  },
): Promise<ModelingRun> {
  const runIndex = opened.store.modelingRuns.findIndex(
    (candidate) => candidate.actionId === input.actionId,
  )
  const run = opened.store.modelingRuns[runIndex]
  if (
    runIndex < 0 ||
    !run ||
    !allowedStatuses.includes(run.status) ||
    opened.store.executionGuard?.operationId !== input.actionId ||
    opened.store.executionGuard.kind !== 'assignment_action'
  ) {
    throw new SemesterWorkspaceError(
      'action_conflict',
      'The Assignment action cannot be settled from its current state.',
    )
  }

  let authorityValid = true
  let artifactsValid = true
  try {
    await assertExecutionGuardAuthority(opened, input.actionId)
  } catch (error) {
    if (
      !(error instanceof SemesterWorkspaceError) ||
      error.code !== 'execution_guard_conflict'
    ) {
      throw error
    }
    await assertStoreBytesMatchMemory(opened)
    authorityValid = false
  }
  if (authorityValid) {
    try {
      await assertExecutionGuardArtifacts(opened, appDataRoot, input.actionId)
    } catch (error) {
      if (
        !(error instanceof SemesterWorkspaceError) ||
        error.code !== 'execution_guard_conflict'
      ) {
        throw error
      }
      artifactsValid = false
    }
  }
  const guardValid = authorityValid && artifactsValid
  const now = new Date().toISOString()
  const settled = {
    ...run,
    status: guardValid ? input.status : 'failed',
    validationOutcome: guardValid ? input.validationOutcome : 'failed',
    updatedAt: now,
    settledAt: now,
    ...(input.recoveryOutcome?.outcome === 'continuation_lost'
      ? { recoveryOutcome: { ...input.recoveryOutcome } }
      : guardValid && input.recoveryOutcome !== undefined
        ? { recoveryOutcome: { ...input.recoveryOutcome } }
        : guardValid &&
            (input.status === 'interrupted' || input.status === 'unknown')
        ? { recoveryOutcome: { outcome: input.status } as const }
        : {}),
    ...(input.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...input.nativeCorrelation } }),
    ...((guardValid ? input.failureCode : 'execution_guard_conflict') ===
    undefined
      ? {}
      : {
          failureCode: guardValid
            ? input.failureCode!
            : 'execution_guard_conflict',
        }),
  } satisfies ModelingRun
  const nextGuard = {
    ...opened.store.executionGuard,
    ...(input.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...input.nativeCorrelation } }),
    state: authorityValid ? 'active' : 'recovery_required',
  } satisfies ExecutionGuard
  const settledStore = {
    ...opened.store,
    modelingRuns: opened.store.modelingRuns.map((candidate, index) =>
      index === runIndex ? settled : candidate,
    ),
    statePatches: interruptPendingPatches(
      opened.store.statePatches,
      actionPatchIds(input.actionId, actionByTurn, activePatchByTurn),
    ),
    executionGuard: nextGuard,
  } satisfies PersistedWorkspaceState
  await beforeActionStoreWrite?.(writePoint)
  await semesterWorkspaceStore.write(opened.root, settledStore)
  opened.store = settledStore
  opened.snapshot = readySnapshot(settledStore)

  for (const [requestKey, context] of proposalContexts) {
    if (context.actionId === input.actionId) proposalContexts.delete(requestKey)
  }
  for (const [turnKey, actionId] of actionByTurn) {
    if (actionId !== input.actionId) continue
    const patchId = activePatchByTurn.get(turnKey)
    activePatchByTurn.delete(turnKey)
    actionByTurn.delete(turnKey)
    releaseReviewBindingsForTurn(reviewBindings, turnKey, patchId)
  }
  if (!cleanupAfterSettlement) return cloneModelingRun(settled)

  const cleaned = await cleanupActionArtifacts(
    opened.root,
    appDataRoot,
    input.actionId,
    cleanupPolicy,
  )
  const executionGuard = !authorityValid
    ? nextGuard
    : cleaned
      ? null
      : ({ ...nextGuard, state: 'cleanup_required' } satisfies ExecutionGuard)
  const cleanedStore = {
    ...opened.store,
    executionGuard,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, cleanedStore)
  opened.store = cleanedStore
  opened.snapshot = readySnapshot(cleanedStore)
  return cloneModelingRun(settled)
}

async function reconcileUncommittedExecutionArtifacts(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
): Promise<void> {
  const scratchRoot = path.join(opened.root, actionScratchRelativeRoot)
  let entries
  try {
    const stats = await lstat(scratchRoot)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error('invalid managed scratch root')
    }
    entries = await readdir(scratchRoot, { withFileTypes: true })
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return
    throw new SemesterWorkspaceError(
      'execution_cleanup_required',
      'The workspace execution scratch cannot be reconciled safely.',
    )
  }

  const guardedOperationId = opened.store.executionGuard?.operationId
  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      entry.isSymbolicLink() ||
      !isProductOperationId(entry.name)
    ) {
      throw new SemesterWorkspaceError(
        'execution_cleanup_required',
        'The workspace execution scratch contains an unmanaged entry.',
      )
    }
    if (entry.name === guardedOperationId) continue
    try {
      if (isActionId(entry.name)) {
        await cleanupUncommittedActionArtifacts(
          opened.root,
          appDataRoot,
          entry.name,
        )
      } else {
        await removeManagedActionDirectory(path.join(scratchRoot, entry.name))
      }
    } catch {
      throw new SemesterWorkspaceError(
        'execution_cleanup_required',
        'The stale workspace execution scratch requires cleanup.',
      )
    }
  }
}

async function reconcileExecutionGuard(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  cleanupPolicy: ActionCleanupPolicy,
): Promise<boolean> {
  const guard = opened.store.executionGuard
  if (!guard) return true
  const interruptedPatches = interruptPendingPatchesForOperation(
    opened.store.statePatches,
    guard.operationId,
  )
  if (interruptedPatches !== opened.store.statePatches) {
    const interruptedStore = {
      ...opened.store,
      statePatches: interruptedPatches,
    } satisfies PersistedWorkspaceState
    await semesterWorkspaceStore.write(opened.root, interruptedStore)
    opened.store = interruptedStore
    opened.snapshot = readySnapshot(interruptedStore)
  }
  const runIndex =
    guard.kind === 'assignment_action'
      ? opened.store.modelingRuns.findIndex(
          (run) =>
            run.id === guard.runId && run.actionId === guard.operationId,
        )
      : -1
  const run = opened.store.modelingRuns[runIndex]
  if (guard.kind === 'assignment_action' && (runIndex < 0 || !run)) {
    throw invalidStore()
  }
  if (guard.state === 'recovery_required') {
    await cleanupExecutionGuardArtifacts(
      opened.root,
      appDataRoot,
      guard,
      cleanupPolicy,
    )
    return false
  }
  if (guard.state === 'cleanup_required') {
    const cleaned = await cleanupExecutionGuardArtifacts(
      opened.root,
      appDataRoot,
      guard,
      cleanupPolicy,
    )
    if (!cleaned) return false
    const cleanedStore = {
      ...opened.store,
      executionGuard: null,
    } satisfies PersistedWorkspaceState
    await semesterWorkspaceStore.write(opened.root, cleanedStore)
    opened.store = cleanedStore
    opened.snapshot = readySnapshot(cleanedStore)
    return true
  }
  let authorityValid = true
  let artifactsValid = true
  try {
    await assertExecutionGuardAuthority(opened, guard.operationId)
  } catch (error) {
    if (
      !(error instanceof SemesterWorkspaceError) ||
      error.code !== 'execution_guard_conflict'
    ) {
      throw error
    }
    await assertStoreBytesMatchMemory(opened)
    authorityValid = false
  }
  if (authorityValid) {
    try {
      await assertExecutionGuardArtifacts(
        opened,
        appDataRoot,
        guard.operationId,
      )
    } catch (error) {
      if (
        !(error instanceof SemesterWorkspaceError) ||
        error.code !== 'execution_guard_conflict'
      ) {
        throw error
      }
      artifactsValid = false
    }
  }
  const guardValid = authorityValid && artifactsValid
  let nextRun = run
  if (
    run &&
    (run.status === 'starting' ||
      run.status === 'running' ||
      run.status === 'acceptance_unknown')
  ) {
    const now = new Date().toISOString()
    nextRun = {
      ...run,
      status: 'unknown',
      validationOutcome: guardValid ? 'unknown' : 'failed',
      failureCode: guardValid
        ? 'reconciled_after_restart'
        : 'execution_guard_conflict',
      updatedAt: now,
      settledAt: now,
      recoveryOutcome: { outcome: 'unknown' },
    }
  }
  const reconcilingGuard = {
    ...guard,
    state: authorityValid ? 'active' : 'recovery_required',
  } satisfies ExecutionGuard
  const reconciledStore = {
    ...opened.store,
    modelingRuns:
      nextRun === undefined
        ? opened.store.modelingRuns
        : opened.store.modelingRuns.map((candidate, index) =>
            index === runIndex ? nextRun : candidate,
          ),
    executionGuard: reconcilingGuard,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, reconciledStore)
  opened.store = reconciledStore
  opened.snapshot = readySnapshot(reconciledStore)
  const cleaned = await cleanupExecutionGuardArtifacts(
    opened.root,
    appDataRoot,
    guard,
    cleanupPolicy,
  )
  if (!authorityValid) return false
  const finalStore = {
    ...opened.store,
    executionGuard: cleaned
      ? null
      : ({
          ...reconcilingGuard,
          state: 'cleanup_required',
        } satisfies ExecutionGuard),
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, finalStore)
  opened.store = finalStore
  opened.snapshot = readySnapshot(finalStore)
  return cleaned
}

async function assertExecutionGuard(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  operationId: string,
): Promise<void> {
  await assertExecutionGuardAuthority(opened, operationId)
  await assertExecutionGuardArtifacts(opened, appDataRoot, operationId)
}

async function assertExecutionGuardAuthority(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  operationId: string,
): Promise<void> {
  const guard = opened.store.executionGuard
  if (
    !guard ||
    guard.operationId !== operationId ||
    guard.state !== 'active' ||
    guard.confirmedRevision !== opened.store.confirmedRevision ||
    JSON.stringify(guard.materials) !== JSON.stringify(opened.store.materials)
  ) {
    throw executionGuardConflict()
  }
  await assertStoreBytesMatchMemory(opened)
  const inspected = await inspectGuardedMaterials(opened)
  if (inspected.size !== guard.materials.length) throw executionGuardConflict()
  for (const material of guard.materials) {
    const current = inspected.get(material.id)
    if (
      !current ||
      current.digest !== material.digest ||
      current.size !== material.size ||
      current.relativePath !== material.relativePath
    ) {
      throw executionGuardConflict()
    }
  }
}

async function assertExecutionGuardArtifacts(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  appDataRoot: string,
  operationId: string,
): Promise<void> {
  const guard = opened.store.executionGuard
  if (
    !guard ||
    guard.operationId !== operationId ||
    guard.state !== 'active'
  ) {
    throw executionGuardConflict()
  }
  const scratchPath = productScratchPath(opened.root, operationId)
  if (!(await isRegularDirectory(scratchPath))) {
    throw executionGuardConflict()
  }
  if (guard.kind === 'product_chat') {
    if (guard.runId !== undefined) throw executionGuardConflict()
    return
  }
  const run = opened.store.modelingRuns.find(
    (candidate) => candidate.id === guard.runId,
  )
  if (
    !run ||
    JSON.stringify(run.sourceBaseline) !==
      JSON.stringify(guard.selectedMaterials)
  ) {
    throw executionGuardConflict()
  }
  const { stagingRoot } = actionArtifactPaths(
    opened.root,
    appDataRoot,
    operationId,
  )
  if (!(await isRegularDirectory(stagingRoot))) throw executionGuardConflict()
  for (const [index, source] of run.sourceBaseline.entries()) {
    const stagedPath = path.join(stagingRoot, `source-${index + 1}.txt`)
    let bytes: Buffer
    try {
      const stats = await lstat(stagedPath)
      if (!stats.isFile() || stats.isSymbolicLink()) throw new Error()
      bytes = await readFile(stagedPath)
    } catch {
      throw executionGuardConflict()
    }
    if (createHash('sha256').update(bytes).digest('hex') !== source.digest) {
      throw executionGuardConflict()
    }
  }
}

async function inspectGuardedMaterials(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
): Promise<Map<string, InspectedMaterial>> {
  const inspected = new Map<string, InspectedMaterial>()
  for (const material of opened.store.materials) {
    const current = await inspectMaterialFile(
      opened.root,
      material.relativePath,
    )
    if (
      !current ||
      current.digest !== material.digest ||
      current.size !== material.size
    ) {
      throw executionGuardConflict()
    }
    inspected.set(material.id, current)
  }
  return inspected
}

async function assertStoreBytesMatchMemory(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
): Promise<void> {
  if (
    await semesterWorkspaceStore.matchesCanonicalBytes(
      opened.root,
      opened.store,
    )
  ) {
    return
  }
  throw executionGuardConflict()
}

async function cleanupUncommittedActionArtifacts(
  workspaceRoot: string,
  appDataRoot: string,
  actionId: string,
): Promise<void> {
  const { stagingRoot, scratchPath } = actionArtifactPaths(
    workspaceRoot,
    appDataRoot,
    actionId,
  )
  // Keep the workspace-scoped key until app-data staging is gone so a later
  // activation can retry reconciliation after a partial rollback failure.
  await removeManagedActionDirectory(stagingRoot)
  await removeManagedActionDirectory(scratchPath)
}

async function cleanupActionArtifacts(
  workspaceRoot: string,
  appDataRoot: string,
  actionId: string,
  policy: ActionCleanupPolicy,
): Promise<boolean> {
  if (!isActionId(actionId)) return false
  const { stagingRoot, scratchPath } = actionArtifactPaths(
    workspaceRoot,
    appDataRoot,
    actionId,
  )
  return runBoundedArtifactCleanup(policy, [stagingRoot, scratchPath])
}

async function cleanupExecutionGuardArtifacts(
  workspaceRoot: string,
  appDataRoot: string,
  guard: ExecutionGuard,
  policy: ActionCleanupPolicy,
): Promise<boolean> {
  if (guard.kind === 'assignment_action') {
    return cleanupActionArtifacts(
      workspaceRoot,
      appDataRoot,
      guard.operationId,
      policy,
    )
  }
  return runBoundedArtifactCleanup(policy, [
    productScratchPath(workspaceRoot, guard.operationId),
  ])
}

async function runBoundedArtifactCleanup(
  policy: ActionCleanupPolicy,
  directories: readonly string[],
): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined
  const cleanup = (async () => {
    await policy.beforeCleanup?.()
    const outcomes = await Promise.allSettled(
      directories.map(removeManagedActionDirectory),
    )
    return outcomes.every((outcome) => outcome.status === 'fulfilled')
  })()
  const deadline = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), policy.deadlineMs)
  })
  try {
    return await Promise.race([cleanup, deadline])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

function actionPatchIds(
  actionId: string,
  actionByTurn: Map<string, string>,
  activePatchByTurn: Map<string, string>,
): Set<string> {
  const patchIds = new Set<string>()
  for (const [turnKey, candidateActionId] of actionByTurn) {
    if (candidateActionId !== actionId) continue
    const patchId = activePatchByTurn.get(turnKey)
    if (patchId) patchIds.add(patchId)
  }
  return patchIds
}

function proposalPatchIdsForOperation(
  operationId: string,
  proposalContexts: Map<string, ActiveProposalContext>,
  activePatchByTurn: Map<string, string>,
): Set<string> {
  const patchIds = new Set<string>()
  for (const context of proposalContexts.values()) {
    if (context.guardOperationId !== operationId || !context.runtime) continue
    const patchId = activePatchByTurn.get(runtimeTurnKey(context.runtime))
    if (patchId) patchIds.add(patchId)
  }
  return patchIds
}

function interruptPendingPatches(
  patches: readonly PersistedStatePatch[],
  patchIds: ReadonlySet<string>,
): readonly PersistedStatePatch[] {
  if (patchIds.size === 0) return patches
  return patches.map((patch) =>
    patchIds.has(patch.id) && patch.status === 'pending'
      ? { ...patch, status: 'interrupted' }
      : patch,
  )
}

function interruptPendingPatchesForOperation(
  patches: readonly PersistedStatePatch[],
  operationId: string,
): readonly PersistedStatePatch[] {
  let changed = false
  const interrupted = patches.map((patch) => {
    if (
      patch.guardOperationId !== operationId ||
      patch.status !== 'pending'
    ) {
      return patch
    }
    changed = true
    return { ...patch, status: 'interrupted' as const }
  })
  return changed ? interrupted : patches
}

function releaseProposalOperation(
  operationId: string,
  proposalContexts: Map<string, ActiveProposalContext>,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
): void {
  for (const [requestKey, context] of proposalContexts) {
    if (context.guardOperationId !== operationId) continue
    proposalContexts.delete(requestKey)
    if (!context.runtime) continue
    const turnKey = runtimeTurnKey(context.runtime)
    const patchId = activePatchByTurn.get(turnKey)
    activePatchByTurn.delete(turnKey)
    releaseReviewBindingsForTurn(reviewBindings, turnKey, patchId)
  }
}

function releaseReviewBindingsForTurn(
  reviewBindings: Map<string, ActiveReviewBinding>,
  turnKey: string,
  patchId?: string,
): void {
  for (const [interactionId, binding] of reviewBindings) {
    if (
      runtimeTurnKey(binding) === turnKey ||
      (patchId !== undefined && binding.patchId === patchId)
    ) {
      reviewBindings.delete(interactionId)
    }
  }
}

function actionArtifactPaths(
  workspaceRoot: string,
  appDataRoot: string,
  actionId: string,
): { readonly stagingRoot: string; readonly scratchPath: string } {
  if (!isActionId(actionId)) throw invalidAction()
  return {
    stagingRoot: path.join(appDataRoot, actionStagingDirectoryName, actionId),
    scratchPath: productScratchPath(workspaceRoot, actionId),
  }
}

function productScratchPath(
  workspaceRoot: string,
  operationId: string,
): string {
  if (!isProductOperationId(operationId)) throw invalidAction()
  return path.join(workspaceRoot, actionScratchRelativeRoot, operationId)
}

async function ensureManagedDirectory(directory: string): Promise<void> {
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw invalidAction()
  } catch (error) {
    if (!hasErrnoCode(error, 'ENOENT')) throw error
    await mkdir(directory)
  }
}

async function removeManagedActionDirectory(directory: string): Promise<void> {
  const parent = path.dirname(directory)
  try {
    const parentStats = await lstat(parent)
    if (!parentStats.isDirectory() || parentStats.isSymbolicLink()) {
      throw invalidAction()
    }
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return
    throw error
  }
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw invalidAction()
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return
    throw error
  }
  await rm(directory, { force: true, recursive: true })
}

async function proposeAssignmentStatePatch(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  activeContext: BoundActiveProposalContext,
  input: unknown,
  activePatchByTurn: Map<string, string>,
  reviewBindings: Map<string, ActiveReviewBinding>,
): Promise<StatePatch> {
  const payload = parseStatePatchPayload(input)
  const canonicalPayload = JSON.stringify(payload)
  if (
    payload.requestKey !== activeContext.context.requestKey ||
    payload.workspaceId !== activeContext.context.workspaceId ||
    payload.courseId !== activeContext.context.courseId ||
    payload.baseRevision !== activeContext.context.baseRevision
  ) {
    throw new StatePatchReviewError(
      'proposal_context_invalid',
      'The proposal does not match its app-issued context.',
    )
  }

  const existing = opened.store.statePatches.find(
    (patch) => patch.requestKey === payload.requestKey,
  )
  if (existing) {
    if (existing.canonicalPayload !== canonicalPayload) {
      throw new StatePatchReviewError(
        'proposal_conflict',
        'The proposal key was already used for a different payload.',
      )
    }
    return cloneStatePatch(existing)
  }

  if (
    opened.store.workspaceId !== activeContext.context.workspaceId ||
    opened.store.course?.id !== activeContext.context.courseId ||
    opened.store.confirmedRevision !== activeContext.context.baseRevision
  ) {
    throw new StatePatchReviewError(
      'proposal_stale',
      'The proposal context is stale.',
    )
  }
  if (
    payload.changes.assignmentId !== undefined &&
    !opened.store.assignments.some(
      (assignment) =>
        assignment.id === payload.changes.assignmentId &&
        assignment.courseId === payload.courseId,
    )
  ) {
    throw new StatePatchReviewError(
      'proposal_invalid',
      'The Assignment target is not active in this Course.',
    )
  }

  const selectedById = new Map(
    activeContext.context.selectedMaterials.map((material) => [
      material.rawMaterialId,
      material,
    ]),
  )
  const decodedMaterials = new Map<string, string>()
  for (const evidence of payload.evidence) {
    const selected = selectedById.get(evidence.rawMaterialId)
    const current = opened.store.materials.find(
      (material) => material.id === evidence.rawMaterialId,
    )
    if (
      !selected ||
      !current ||
      selected.digest !== evidence.digest ||
      current.digest !== evidence.digest
    ) {
      throw new StatePatchReviewError(
        'proposal_invalid',
        'Proposal evidence must reference the selected source baseline.',
      )
    }
    let decoded = decodedMaterials.get(current.id)
    if (decoded === undefined) {
      const inspected = await inspectMaterialFile(opened.root, current.relativePath)
      if (
        !inspected ||
        inspected.digest !== current.digest ||
        inspected.size !== current.size
      ) {
        throw new StatePatchReviewError(
          'proposal_stale',
          'A selected proposal source changed.',
        )
      }
      decoded = decodeEvidenceText(inspected.bytes)
      decodedMaterials.set(current.id, decoded)
    }
    if (!decoded.includes(evidence.quote)) {
      throw new StatePatchReviewError(
        'proposal_invalid',
        'Proposal evidence quote does not match the selected source.',
      )
    }
  }

  const turnKey = runtimeTurnKey(activeContext.runtime)
  const activePatchId = activePatchByTurn.get(turnKey)
  const replacementBinding = activeContext.replacement
  const replacementPatchIndex = replacementBinding
    ? opened.store.statePatches.findIndex(
        (patch) => patch.id === replacementBinding.patchId,
      )
    : -1
  const replacementPatch = opened.store.statePatches[replacementPatchIndex]
  const boundReview = replacementBinding
    ? reviewBindings.get(replacementBinding.interactionId)
    : undefined
  if (
    replacementBinding
      ? replacementPatchIndex < 0 ||
        !replacementPatch ||
        replacementPatch.status !== 'pending' ||
        activePatchId !== replacementPatch.id ||
        !boundReview ||
        boundReview.patchId !== replacementBinding.patchId ||
        boundReview.decisionKey !== replacementBinding.decisionKey ||
        boundReview.revision?.requestKey !== activeContext.context.requestKey ||
        boundReview.revision.state !== 'awaiting_replacement'
      : activePatchId !== undefined
  ) {
    throw new StatePatchReviewError(
      'proposal_conflict',
      replacementBinding
        ? 'The replacement proposal no longer matches the active Review.'
        : 'This native Turn already has an active StatePatch.',
    )
  }
  const guardOperationId =
    activeContext.actionId ?? activeContext.guardOperationId
  const patch = {
    id: `patch_${randomUUID().replaceAll('-', '')}`,
    workspaceId: payload.workspaceId,
    courseId: payload.courseId,
    requestKey: payload.requestKey,
    baseRevision: payload.baseRevision,
    summary: payload.summary,
    changes: cloneAssignmentUpsert(payload.changes),
    evidence: payload.evidence.map(cloneEvidenceRef),
    ...(payload.origin === undefined ? {} : { origin: payload.origin }),
    status: 'pending',
    createdAt: new Date().toISOString(),
    applyOutcome: null,
    canonicalPayload,
    ...(guardOperationId === undefined ? {} : { guardOperationId }),
  } satisfies PersistedStatePatch
  const statePatches = replacementPatch
    ? [
        ...opened.store.statePatches.map((candidate, index) =>
          index === replacementPatchIndex
            ? { ...candidate, status: 'superseded' as const }
            : candidate,
        ),
        patch,
      ]
    : [...opened.store.statePatches, patch]
  const nextStore = {
    ...opened.store,
    statePatches,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
  activePatchByTurn.set(turnKey, patch.id)
  if (boundReview?.revision) boundReview.revision.state = 'replaced'
  return cloneStatePatch(patch)
}

type AssignmentReviewRevisionInternal = Omit<
  AssignmentReviewRevision,
  'proposal'
> & {
  readonly activeContext: ActiveProposalContext
}

function requireActivePendingReviewPatch(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  binding: ActiveReviewBinding,
  activePatchByTurn: Map<string, string>,
): {
  readonly patch: PersistedStatePatch
  readonly patchIndex: number
} {
  const patchIndex = opened.store.statePatches.findIndex(
    (patch) => patch.id === binding.patchId,
  )
  const patch = opened.store.statePatches[patchIndex]
  if (
    patchIndex < 0 ||
    !patch ||
    patch.status !== 'pending' ||
    patch.workspaceId !== opened.store.workspaceId ||
    patch.courseId !== opened.store.course?.id ||
    activePatchByTurn.get(runtimeTurnKey(binding)) !== patch.id
  ) {
    throw new StatePatchReviewError(
      'review_not_pending',
      'The StatePatch is not the active pending Review.',
    )
  }
  if (patch.baseRevision !== opened.store.confirmedRevision) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The confirmed SemesterModel revision changed.',
    )
  }
  return { patch, patchIndex }
}

function requestAssignmentReviewRevision(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: AssignmentReviewRevisionInput,
  proposalContexts: Map<string, ActiveProposalContext>,
  reviewBindings: Map<string, ActiveReviewBinding>,
  activePatchByTurn: Map<string, string>,
): AssignmentReviewRevisionInternal {
  if (
    !isOpaqueRuntimeIdentity(input.interactionId) ||
    !isPatchId(input.patchId) ||
    !isDecisionKey(input.decisionKey) ||
    input.decision !== 'revise' ||
    typeof input.feedback !== 'string' ||
    input.feedback.trim().length === 0 ||
    Buffer.byteLength(input.feedback, 'utf8') >
      PRODUCT_REVIEW_FEEDBACK_MAX_BYTES
  ) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The Review revision request is invalid.',
    )
  }
  if (
    opened.store.userConfirmations.some(
      (confirmation) => confirmation.decisionKey === input.decisionKey,
    )
  ) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The Review decision key was already settled.',
    )
  }
  const binding = reviewBindings.get(input.interactionId)
  if (
    !binding ||
    binding.patchId !== input.patchId ||
    binding.decisionKey !== input.decisionKey
  ) {
    throw new StatePatchReviewError(
      'review_not_pending',
      'The Review revision request is not pending.',
    )
  }
  if (binding.revision) {
    if (
      binding.revision.feedback !== input.feedback ||
      binding.revision.state === 'interrupted'
    ) {
      throw new StatePatchReviewError(
        binding.revision.state === 'interrupted'
          ? 'review_not_pending'
          : 'review_conflict',
        'The Review revision request was already used differently.',
      )
    }
    const proposalContext = proposalContexts.get(binding.revision.requestKey)
    const patch = opened.store.statePatches.find(
      (candidate) => candidate.id === binding.patchId,
    )
    if (!proposalContext || !patch) throw invalidStore()
    return {
      binding: cloneReviewBinding(binding),
      patch: cloneStatePatch(patch),
      activeContext: proposalContext,
      confirmedRevision: opened.store.confirmedRevision,
      feedback: binding.revision.feedback,
      replayed: true,
    }
  }

  const turnKey = runtimeTurnKey(binding)
  const { patch } = requireActivePendingReviewPatch(
    opened,
    binding,
    activePatchByTurn,
  )
  const sourceContext = [...proposalContexts.values()].find(
    (candidate) =>
      candidate.runtime !== undefined &&
      runtimeTurnKey(candidate.runtime) === turnKey &&
      candidate.context.requestKey === patch.requestKey,
  )
  if (!sourceContext?.runtime) {
    throw new StatePatchReviewError(
      'review_not_pending',
      'The Review proposal context is no longer active.',
    )
  }
  const requestKey = `proposal_${randomUUID().replaceAll('-', '')}`
  const replacementContext = {
    context: {
      ...cloneAssignmentProposalContext(sourceContext.context),
      requestKey,
    },
    runtime: { ...sourceContext.runtime },
    ...(sourceContext.actionId === undefined
      ? {}
      : { actionId: sourceContext.actionId }),
    ...(sourceContext.guardOperationId === undefined
      ? {}
      : { guardOperationId: sourceContext.guardOperationId }),
    replacement: cloneReviewBinding(binding),
  } satisfies ActiveProposalContext
  binding.revision = {
    feedback: input.feedback,
    requestKey,
    state: 'awaiting_replacement',
  }
  proposalContexts.set(requestKey, replacementContext)
  return {
    binding: cloneReviewBinding(binding),
    patch: cloneStatePatch(patch),
    activeContext: replacementContext,
    confirmedRevision: opened.store.confirmedRevision,
    feedback: input.feedback,
    replayed: false,
  }
}

async function interruptAssignmentReviewRevision(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: AssignmentReviewBinding,
  requestKey: string,
  reviewBindings: Map<string, ActiveReviewBinding>,
  activePatchByTurn: Map<string, string>,
): Promise<void> {
  const binding = reviewBindings.get(input.interactionId)
  if (
    !binding ||
    binding.patchId !== input.patchId ||
    binding.decisionKey !== input.decisionKey ||
    binding.revision?.requestKey !== requestKey
  ) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The Review revision binding changed.',
    )
  }
  if (binding.revision.state === 'replaced') return
  if (binding.revision.state === 'interrupted') return

  const patchIndex = opened.store.statePatches.findIndex(
    (patch) => patch.id === binding.patchId,
  )
  const patch = opened.store.statePatches[patchIndex]
  if (patchIndex < 0 || !patch) throw invalidStore()
  if (patch.status === 'pending') {
    const nextStore = {
      ...opened.store,
      statePatches: opened.store.statePatches.map((candidate, index) =>
        index === patchIndex
          ? { ...candidate, status: 'interrupted' as const }
          : candidate,
      ),
    } satisfies PersistedWorkspaceState
    await semesterWorkspaceStore.write(opened.root, nextStore)
    opened.store = nextStore
    opened.snapshot = readySnapshot(nextStore)
  }
  const turnKey = runtimeTurnKey(binding)
  if (activePatchByTurn.get(turnKey) === binding.patchId) {
    activePatchByTurn.delete(turnKey)
  }
  binding.revision.state = 'interrupted'
}

async function commitAssignmentReviewDecision(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: AssignmentReviewSettlementInput,
  reviewBindings: Map<string, ActiveReviewBinding>,
  activePatchByTurn: Map<string, string>,
  operationId?: string,
): Promise<AssignmentReviewCommit> {
  if (
    !isOpaqueRuntimeIdentity(input.interactionId) ||
    !isPatchId(input.patchId) ||
    !isDecisionKey(input.decisionKey) ||
    (input.decision !== 'accept' && input.decision !== 'reject')
  ) {
    throw new StatePatchReviewError(
      'review_conflict',
      'The Review decision binding is invalid.',
    )
  }
  const expectedDecision =
    input.decision === 'accept' ? 'accepted' : 'rejected'
  const existingConfirmation = opened.store.userConfirmations.find(
    (confirmation) => confirmation.decisionKey === input.decisionKey,
  )
  if (existingConfirmation) {
    const settledBinding = reviewBindings.get(input.interactionId)
    if (
      !settledBinding ||
      settledBinding.patchId !== input.patchId ||
      settledBinding.decisionKey !== input.decisionKey ||
      existingConfirmation.patchId !== input.patchId ||
      existingConfirmation.decision !== expectedDecision
    ) {
      throw new StatePatchReviewError(
        'review_conflict',
        'The Review decision key was already settled differently.',
      )
    }
    const existingPatch = opened.store.statePatches.find(
      (patch) => patch.id === input.patchId,
    )
    if (!existingPatch) throw invalidStore()
    return {
      binding: cloneReviewBinding(settledBinding),
      confirmation: { ...existingConfirmation },
      patch: cloneStatePatch(existingPatch),
      confirmedRevision: opened.store.confirmedRevision,
      replayed: true,
    }
  }

  const activeBinding = reviewBindings.get(input.interactionId)
  if (
    !activeBinding ||
    activeBinding.patchId !== input.patchId ||
    activeBinding.decisionKey !== input.decisionKey ||
    activeBinding.revision !== undefined
  ) {
    throw new StatePatchReviewError(
      'review_not_pending',
      'The Review decision is not pending.',
    )
  }
  const { patch, patchIndex } = requireActivePendingReviewPatch(
    opened,
    activeBinding,
    activePatchByTurn,
  )

  const settledAt = new Date().toISOString()
  let assignments = opened.store.assignments
  let confirmedRevision = opened.store.confirmedRevision
  let settledPatch: PersistedStatePatch
  let confirmation: UserConfirmation
  if (input.decision === 'accept') {
    const assignmentId =
      patch.changes.assignmentId ??
      `assignment_${randomUUID().replaceAll('-', '')}`
    const assignment = {
      id: assignmentId,
      courseId: patch.courseId,
      ...patch.changes.values,
      evidence: patch.evidence.map(cloneEvidenceRef),
    } satisfies Assignment
    if (patch.changes.assignmentId === undefined) {
      assignments = [...assignments, assignment]
    } else {
      const assignmentIndex = assignments.findIndex(
        (candidate) =>
          candidate.id === patch.changes.assignmentId &&
          candidate.courseId === patch.courseId,
      )
      if (assignmentIndex < 0) {
        throw new StatePatchReviewError(
          'review_conflict',
          'The Assignment target changed before Review settlement.',
        )
      }
      assignments = assignments.map((candidate, index) =>
        index === assignmentIndex ? assignment : candidate,
      )
    }
    confirmedRevision += 1
    settledPatch = {
      ...patch,
      status: 'applied',
      applyOutcome: {
        type: 'applied',
        assignmentId,
        resultingRevision: confirmedRevision,
      },
    }
    confirmation = {
      id: `confirmation_${randomUUID().replaceAll('-', '')}`,
      patchId: patch.id,
      decisionKey: input.decisionKey,
      decision: 'accepted',
      settledAt,
      assignmentId,
      resultingRevision: confirmedRevision,
      outcome: 'applied',
    }
  } else {
    settledPatch = {
      ...patch,
      status: 'rejected',
      applyOutcome: {
        type: 'not_applied',
        revision: confirmedRevision,
      },
    }
    confirmation = {
      id: `confirmation_${randomUUID().replaceAll('-', '')}`,
      patchId: patch.id,
      decisionKey: input.decisionKey,
      decision: 'rejected',
      settledAt,
      outcome: 'not_applied',
    }
  }
  const statePatches = opened.store.statePatches.map((candidate, index) =>
    index === patchIndex ? settledPatch : candidate,
  )
  const nextStore = {
    ...opened.store,
    confirmedRevision,
    assignments,
    statePatches,
    userConfirmations: [...opened.store.userConfirmations, confirmation],
    executionGuard:
      operationId && opened.store.executionGuard?.operationId === operationId
        ? {
            ...opened.store.executionGuard,
            confirmedRevision,
          }
        : opened.store.executionGuard,
  } satisfies PersistedWorkspaceState
  await semesterWorkspaceStore.write(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
  activePatchByTurn.delete(runtimeTurnKey(activeBinding))
  return {
    binding: cloneReviewBinding(activeBinding),
    confirmation: { ...confirmation },
    patch: cloneStatePatch(settledPatch),
    confirmedRevision,
    replayed: false,
  }
}

function parseStatePatchPayload(input: unknown): CanonicalStatePatchPayload {
  if (!isExactStatePatchPayload(input)) throw invalidProposal()
  return normalizeStatePatchPayload(input)
}

function isExactStatePatchPayload(
  input: unknown,
): input is CanonicalStatePatchPayload {
  return (
    isExactRecord(input, [
      'baseRevision',
      'changes',
      'courseId',
      'evidence',
      'requestKey',
      'summary',
      'workspaceId',
    ], ['origin']) &&
    isProposalKey(input.requestKey) &&
    isWorkspaceId(input.workspaceId) &&
    isCourseId(input.courseId) &&
    Number.isSafeInteger(input.baseRevision) &&
    Number(input.baseRevision) >= 0 &&
    isBoundedMeaningfulText(input.summary, proposalSummaryMaxBytes) &&
    (input.origin === undefined ||
      isBoundedMeaningfulText(input.origin, proposalSummaryMaxBytes)) &&
    isExactAssignmentUpsert(input.changes) &&
    isEvidenceArray(input.evidence)
  )
}

async function openWorkspace(workspaceRoot: string): Promise<OpenWorkspace> {
  const opened = await semesterWorkspaceStore.open(workspaceRoot)
  if (opened.status === 'ready') {
    return {
      root: workspaceRoot,
      store: opened.store,
      snapshot: readySnapshot(opened.store),
    }
  }
  return {
    root: workspaceRoot,
    snapshot: {
      state: 'incompatible',
      readOnly: true,
      supportedStoreFormatVersion: storeFormatVersion,
      foundStoreFormatVersion: opened.foundStoreFormatVersion,
      displayMessage: incompatibleStoreDisplayMessage,
    },
  }
}

async function canonicalDirectory(directory: string): Promise<string> {
  if (!path.isAbsolute(directory)) {
    throw new SemesterWorkspaceError(
      'root_invalid',
      'SemesterWorkspace roots must be absolute directories.',
    )
  }
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) throw new Error()
    await access(directory, fsConstants.R_OK | fsConstants.X_OK)
    return await realpath(directory)
  } catch {
    throw new SemesterWorkspaceError(
      'root_invalid',
      'SemesterWorkspace roots must be readable non-symlink directories.',
    )
  }
}

function assertDisjointRoots(roots: readonly string[]): void {
  if (rootsAreDisjoint(roots)) return
  throw new SemesterWorkspaceError(
    'root_overlap',
    'Package, app data, and SemesterWorkspace roots must not overlap.',
  )
}

function requireReadyWorkspace(
  active: OpenWorkspace | undefined,
): Extract<OpenWorkspace, { store: PersistedWorkspaceState }> {
  if (!active) {
    throw new SemesterWorkspaceError(
      'workspace_inactive',
      'No SemesterWorkspace is active.',
    )
  }
  if (!('store' in active)) {
    throw new SemesterWorkspaceError(
      'workspace_incompatible',
      'This SemesterWorkspace has an unsupported or invalid product store.',
    )
  }
  return active
}

function readySnapshot(
  store: PersistedWorkspaceState,
): ReadySemesterWorkspaceSnapshot {
  return {
    state: 'ready',
    storeFormatVersion: storeFormatVersion,
    confirmedRevision: store.confirmedRevision,
    course: store.course
      ? { id: store.course.id, displayName: store.course.displayName }
      : null,
    materials: store.materials.map((material) => ({ ...material })),
  }
}

function cloneSnapshot(
  snapshot: SemesterWorkspaceSnapshot,
): SemesterWorkspaceSnapshot {
  return snapshot.state === 'ready'
    ? cloneReadySnapshot(snapshot)
    : { ...snapshot }
}

function cloneReadySnapshot(
  snapshot: ReadySemesterWorkspaceSnapshot,
): ReadySemesterWorkspaceSnapshot {
  return {
    ...snapshot,
    course: snapshot.course ? { ...snapshot.course } : null,
    materials: snapshot.materials.map((material) => ({ ...material })),
  }
}

function assignmentStateSnapshot(
  store: PersistedWorkspaceState,
): AssignmentStateSnapshot {
  if (!store.course) {
    throw new StatePatchReviewError(
      'proposal_context_invalid',
      'An active Course is required for Assignment state.',
    )
  }
  return {
    workspaceId: store.workspaceId,
    courseId: store.course.id,
    confirmedRevision: store.confirmedRevision,
    assignments: store.assignments.map(cloneAssignment),
    statePatches: store.statePatches.map(cloneStatePatch),
    userConfirmations: store.userConfirmations.map((confirmation) => ({
      ...confirmation,
    })),
  }
}

function cloneAssignmentProposalContext(
  context: AssignmentProposalContext,
): AssignmentProposalContext {
  return {
    ...context,
    selectedMaterials: context.selectedMaterials.map((material) => ({
      ...material,
    })),
  }
}

function cloneReviewBinding(
  binding: AssignmentReviewBinding,
): AssignmentReviewBinding {
  return {
    interactionId: binding.interactionId,
    patchId: binding.patchId,
    decisionKey: binding.decisionKey,
  }
}

type InspectedMaterial = Omit<RawMaterial, 'id'> & {
  readonly bytes: Buffer
}

async function scanRawMaterials(
  workspaceRoot: string,
): Promise<readonly InspectedMaterial[]> {
  const materials: InspectedMaterial[] = []
  let scannedEntries = 0
  let aggregateBytes = 0

  const visit = async (relativeDirectory: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(path.join(workspaceRoot, relativeDirectory), {
        withFileTypes: true,
      })
    } catch {
      return
    }
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      scannedEntries += 1
      if (scannedEntries > materialScanEntryMax) {
        throw new SemesterWorkspaceError(
          'material_scan_limit',
          'This SemesterWorkspace contains too many entries to refresh safely.',
        )
      }
      if (entry.name === productDirectoryName && relativeDirectory === '') {
        continue
      }
      const relativePath = path.join(relativeDirectory, entry.name)
      if (entry.isSymbolicLink()) continue
      if (entry.isDirectory()) {
        await visit(relativePath)
        continue
      }
      if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.txt') {
        continue
      }
      const inspected = await inspectMaterialFile(
        workspaceRoot,
        toDisplayPath(relativePath),
      )
      if (!inspected) continue
      if (aggregateBytes + inspected.size > materialAggregateMaxBytes) continue
      aggregateBytes += inspected.size
      materials.push(inspected)
    }
  }

  await visit('')
  return materials.sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath),
  )
}

async function inspectMaterialFile(
  workspaceRoot: string,
  relativePath: string,
): Promise<InspectedMaterial | undefined> {
  if (!isSafeMaterialRelativePath(relativePath)) return undefined
  const filePath = path.join(workspaceRoot, ...relativePath.split('/'))
  try {
    const stats = await lstat(filePath)
    if (
      !stats.isFile() ||
      stats.isSymbolicLink() ||
      stats.size > materialFileMaxBytes
    ) {
      return undefined
    }
    await access(filePath, fsConstants.R_OK)
    const canonicalFile = await realpath(filePath)
    if (!isStrictDescendant(workspaceRoot, canonicalFile)) return undefined
    const bytes = await readFile(filePath)
    if (bytes.byteLength > materialFileMaxBytes) return undefined
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return {
      relativePath,
      digest: createHash('sha256').update(bytes).digest('hex'),
      mediaType: materialMediaType,
      size: bytes.byteLength,
      bytes,
    }
  } catch {
    return undefined
  }
}

function decodeBoundedPreview(bytes: Buffer): string {
  if (bytes.byteLength <= materialPreviewMaxBytes) {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  }
  let end = materialPreviewMaxBytes
  while (end > 0) {
    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(
        bytes.subarray(0, end),
      )
    } catch {
      end -= 1
    }
  }
  return ''
}

function toDisplayPath(relativePath: string): string {
  return relativePath.split(path.sep).join('/')
}

function isStrictDescendant(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative.length > 0 &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function decodeEvidenceText(bytes: Buffer): string {
  const content =
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
      ? bytes.subarray(3)
      : bytes
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
    content,
  )
}

function assertPrepareAssignmentActionInput(
  input: PrepareAssignmentActionInput,
): void {
  if (
    !isExactRecord(
      input,
      [
        'actionId',
        'arguments',
        'courseId',
        'recipe',
        'selectedMaterials',
      ],
      ['retryOfRunId'],
    ) ||
    !isActionId(input.actionId) ||
    !isCourseId(input.courseId) ||
    !isExactRecord(input.recipe, [
      'digest',
      'name',
      'requestedSkillName',
      'requestedSkillPath',
      'version',
    ]) ||
    !isBoundedMeaningfulText(input.recipe.name, actionMetadataMaxBytes) ||
    !isBoundedMeaningfulText(input.recipe.version, actionMetadataMaxBytes) ||
    !isSafeSkillName(input.recipe.requestedSkillName) ||
    !isSafeAbsoluteActionPath(input.recipe.requestedSkillPath) ||
    !isSha256Digest(input.recipe.digest) ||
    !isExactRecord(input.arguments, ['canonical', 'digest']) ||
    typeof input.arguments.canonical !== 'string' ||
    Buffer.byteLength(input.arguments.canonical, 'utf8') >
      actionArgumentMaxBytes ||
    !isSha256Digest(input.arguments.digest) ||
    digestUtf8(input.arguments.canonical) !== input.arguments.digest ||
    !isModelingRunSourceBaseline(input.selectedMaterials) ||
    (input.retryOfRunId !== undefined && !isRunId(input.retryOfRunId))
  ) {
    throw invalidAction()
  }
}

function assertBindAssignmentActionInput(
  input: BindAssignmentActionInput,
): void {
  if (
    !isExactRecord(input, ['actionId', 'threadId', 'turnId']) ||
    !isActionId(input.actionId) ||
    !isOpaqueRuntimeIdentity(input.threadId) ||
    !isOpaqueRuntimeIdentity(input.turnId)
  ) {
    throw invalidAction()
  }
}

function assertNoExecutionGuard(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
): void {
  if (!opened.store.executionGuard) return
  throw new SemesterWorkspaceError(
    opened.store.executionGuard.state === 'active'
      ? 'action_active'
      : 'execution_cleanup_required',
    opened.store.executionGuard.state === 'active'
      ? 'A product operation already owns the workspace execution guard.'
      : 'The prior product operation requires cleanup or recovery.',
  )
}

function requireActiveAppDataRoot(value: string | undefined): string {
  if (value) return value
  throw new SemesterWorkspaceError(
    'workspace_inactive',
    'No SemesterWorkspace app-data root is active.',
  )
}

function actionCleanupPolicy(options: {
  readonly actionCleanupDeadlineMs?: number
  readonly beforeActionArtifactCleanup?: () => void | Promise<void>
}): ActionCleanupPolicy {
  const deadlineMs =
    options.actionCleanupDeadlineMs ?? defaultActionCleanupDeadlineMs
  if (
    !Number.isSafeInteger(deadlineMs) ||
    deadlineMs < 1 ||
    deadlineMs > maximumActionCleanupDeadlineMs
  ) {
    throw new TypeError('The action cleanup deadline is invalid.')
  }
  return {
    deadlineMs,
    ...(options.beforeActionArtifactCleanup === undefined
      ? {}
      : { beforeCleanup: options.beforeActionArtifactCleanup }),
  }
}

function isTerminalModelingRunStatus(
  value: unknown,
): value is 'completed' | 'failed' | 'interrupted' | 'unknown' {
  return (
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isSettledValidationOutcome(
  value: unknown,
): value is Exclude<ModelingRunValidationOutcome, 'pending'> {
  return value === 'passed' || value === 'failed' || value === 'unknown'
}

function digestUtf8(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

async function isRegularDirectory(directory: string): Promise<boolean> {
  try {
    const stats = await lstat(directory)
    return stats.isDirectory() && !stats.isSymbolicLink()
  } catch {
    return false
  }
}

function runtimeTurnKey(runtime: {
  readonly threadId: string
  readonly turnId: string
}): string {
  return JSON.stringify([runtime.threadId, runtime.turnId])
}

function guardOperationForRuntime(
  store: PersistedWorkspaceState,
  runtime: { readonly threadId: string; readonly turnId: string },
): string | undefined {
  const correlation = store.executionGuard?.nativeCorrelation
  return correlation?.threadId === runtime.threadId &&
    correlation.turnId === runtime.turnId
    ? store.executionGuard?.operationId
    : undefined
}

function invalidProposal(): StatePatchReviewError {
  return new StatePatchReviewError(
    'proposal_invalid',
    'The StatePatch proposal is invalid.',
  )
}

function invalidAction(): SemesterWorkspaceError {
  return new SemesterWorkspaceError(
    'action_invalid',
    'The Assignment action input is invalid.',
  )
}

function executionGuardConflict(): SemesterWorkspaceError {
  return new SemesterWorkspaceError(
    'execution_guard_conflict',
    'The protected Assignment execution baseline changed.',
  )
}
