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
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type { UserInputRequestedEvent } from '@ay-ple/codex-chat-runtime/contract'

import { rootsAreDisjoint } from './root-isolation.js'
import { isExactAssignmentReviewQuestion } from './state-patch-review.js'

const storeFormatVersion = 2
const productDirectoryName = '.ay-ple'
const storeFileName = 'workspace-state.json'
const incompatibleStoreDisplayMessage =
  '이 SemesterWorkspace의 제품 상태는 현재 AY-PLE에서 안전하게 열 수 없습니다. 원본을 보존한 채 지원되는 AY-PLE로 다시 여세요.'
const materialMediaType = 'text/plain; charset=utf-8'
const materialFileMaxBytes = 1024 * 1024
const materialAggregateMaxBytes = 8 * 1024 * 1024
const materialScanEntryMax = 4096
const materialPreviewMaxBytes = 256 * 1024
const proposalSummaryMaxBytes = 2 * 1024
const assignmentTextMaxBytes = 1024
const evidenceQuoteMaxBytes = 16 * 1024
const proposalEvidenceMax = 64
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
  bindAssignmentReview(
    request: UserInputRequestedEvent,
  ): Promise<AssignmentReviewBinding | null>
  commitAssignmentReviewDecision(
    input: AssignmentReviewDecisionInput,
  ): Promise<AssignmentReviewCommit>
  createCourse(displayName: string): Promise<ReadySemesterWorkspaceSnapshot>
  createAssignmentProposalSession(
    input: CreateAssignmentProposalSessionInput,
  ): Promise<AssignmentProposalSession>
  nativeCwd(): string
  readMaterialPreview(input: {
    readonly materialId: string
    readonly digest: string
  }): Promise<RawMaterialPreview>
  refreshMaterials(): Promise<ReadySemesterWorkspaceSnapshot>
  selectCourse(courseId: string): Promise<ReadySemesterWorkspaceSnapshot>
  snapshot(): SemesterWorkspaceSnapshot | null
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
  readonly decision: 'accept' | 'reject'
}

export type AssignmentReviewCommit = {
  readonly binding: AssignmentReviewBinding
  readonly confirmation: UserConfirmation
  readonly patch: StatePatch
  readonly confirmedRevision: number
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

export type SemesterWorkspaceErrorCode =
  | 'course_already_exists'
  | 'course_invalid'
  | 'course_unknown'
  | 'chooser_unavailable'
  | 'material_scan_limit'
  | 'material_stale'
  | 'material_unknown'
  | 'root_invalid'
  | 'root_overlap'
  | 'store_invalid'
  | 'workspace_inactive'
  | 'workspace_incompatible'

export class SemesterWorkspaceError extends Error {
  readonly code: SemesterWorkspaceErrorCode

  constructor(code: SemesterWorkspaceErrorCode, message: string) {
    super(message)
    this.name = 'SemesterWorkspaceError'
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

type PersistedStatePatch = StatePatch & {
  readonly canonicalPayload: string
}

type PersistedWorkspaceState = {
  readonly formatVersion: 2
  readonly workspaceId: string
  readonly confirmedRevision: number
  readonly course: Course | null
  readonly materials: readonly RawMaterial[]
  readonly assignments: readonly Assignment[]
  readonly statePatches: readonly PersistedStatePatch[]
  readonly userConfirmations: readonly UserConfirmation[]
}

type ActiveProposalContext = {
  readonly context: AssignmentProposalContext
  readonly runtime: {
    readonly threadId: string
    readonly turnId: string
  }
}

type ActiveReviewBinding = AssignmentReviewBinding & {
  readonly threadId: string
  readonly turnId: string
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
  readonly chooseDirectory: SemesterWorkspaceDirectoryChooser
  readonly packageRoot: string
}): SemesterWorkspaceController {
  let active: OpenWorkspace | undefined
  let operationTail = Promise.resolve()
  const proposalContexts = new Map<string, ActiveProposalContext>()
  const activePatchByTurn = new Map<string, string>()
  const reviewBindings = new Map<string, ActiveReviewBinding>()

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = operationTail.then(operation)
    operationTail = result.then(
      () => undefined,
      () => undefined,
    )
    return result
  }

  return {
    activate() {
      return enqueue(async () => {
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
          await refreshReadyWorkspace(opened)
        } else if (active) {
          throw new SemesterWorkspaceError(
            'workspace_incompatible',
            incompatibleStoreDisplayMessage,
          )
        }
        active = opened
        proposalContexts.clear()
        activePatchByTurn.clear()
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

    bindAssignmentReview(request) {
      return enqueue(async () => {
        if (!isExactAssignmentReviewQuestion(request.questions)) return null
        const opened = requireReadyWorkspace(active)
        const turnKey = runtimeTurnKey(request)
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
      return enqueue(() =>
        commitAssignmentReviewDecision(
          requireReadyWorkspace(active),
          input,
          reviewBindings,
          activePatchByTurn,
        ),
      )
    },

    createCourse(displayName) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
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
        await writeStore(opened.root, nextStore)
        opened.store = nextStore
        opened.snapshot = readySnapshot(nextStore)
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    createAssignmentProposalSession(input) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
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
          ).size !== input.selectedMaterials.length ||
          !isOpaqueRuntimeIdentity(input.runtime.threadId) ||
          !isOpaqueRuntimeIdentity(input.runtime.turnId)
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
        const requestKey = `proposal_${randomUUID().replaceAll('-', '')}`
        const context = {
          requestKey,
          workspaceId: opened.store.workspaceId,
          courseId: course.id,
          baseRevision: opened.store.confirmedRevision,
          selectedMaterials,
        } satisfies AssignmentProposalContext
        const activeContext = {
          context,
          runtime: { ...input.runtime },
        } satisfies ActiveProposalContext
        proposalContexts.set(requestKey, activeContext)
        return {
          context: cloneAssignmentProposalContext(context),
          mcpTool: {
            name: 'propose_state_patch',
            invoke: (payload) =>
              enqueue(() => {
                if (proposalContexts.get(requestKey) !== activeContext) {
                  throw new StatePatchReviewError(
                    'proposal_context_invalid',
                    'The proposal session is no longer active.',
                  )
                }
                return proposeAssignmentStatePatch(
                  requireReadyWorkspace(active),
                  activeContext,
                  payload,
                  activePatchByTurn,
                )
              }),
          },
        }
      })
    },

    nativeCwd() {
      return requireReadyWorkspace(active).root
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

    refreshMaterials() {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        await refreshReadyWorkspace(opened)
        return cloneReadySnapshot(opened.snapshot)
      })
    },

    selectCourse(courseId) {
      return enqueue(async () => {
        const opened = requireReadyWorkspace(active)
        if (!opened.store.course || opened.store.course.id !== courseId) {
          throw new SemesterWorkspaceError(
            'course_unknown',
            'The selected Course does not exist in this SemesterWorkspace.',
          )
        }
        return cloneReadySnapshot(opened.snapshot)
      })
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
  await writeStore(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
}

type CanonicalStatePatchPayload = {
  readonly requestKey: string
  readonly workspaceId: string
  readonly courseId: string
  readonly baseRevision: number
  readonly summary: string
  readonly changes: AssignmentUpsert
  readonly evidence: readonly EvidenceRef[]
  readonly origin?: string
}

async function proposeAssignmentStatePatch(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  activeContext: ActiveProposalContext,
  input: unknown,
  activePatchByTurn: Map<string, string>,
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
  if (activePatchByTurn.has(turnKey)) {
    throw new StatePatchReviewError(
      'proposal_conflict',
      'This native Turn already has an active StatePatch.',
    )
  }
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
  } satisfies PersistedStatePatch
  const nextStore = {
    ...opened.store,
    statePatches: [...opened.store.statePatches, patch],
  } satisfies PersistedWorkspaceState
  await writeStore(opened.root, nextStore)
  opened.store = nextStore
  opened.snapshot = readySnapshot(nextStore)
  activePatchByTurn.set(turnKey, patch.id)
  return cloneStatePatch(patch)
}

async function commitAssignmentReviewDecision(
  opened: Extract<OpenWorkspace, { store: PersistedWorkspaceState }>,
  input: AssignmentReviewDecisionInput,
  reviewBindings: Map<string, ActiveReviewBinding>,
  activePatchByTurn: Map<string, string>,
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
    activeBinding.decisionKey !== input.decisionKey
  ) {
    throw new StatePatchReviewError(
      'review_not_pending',
      'The Review decision is not pending.',
    )
  }
  const patchIndex = opened.store.statePatches.findIndex(
    (patch) => patch.id === input.patchId,
  )
  const patch = opened.store.statePatches[patchIndex]
  if (
    patchIndex < 0 ||
    !patch ||
    patch.status !== 'pending' ||
    patch.workspaceId !== opened.store.workspaceId ||
    patch.courseId !== opened.store.course?.id ||
    activePatchByTurn.get(runtimeTurnKey(activeBinding)) !== patch.id
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
  } satisfies PersistedWorkspaceState
  await writeStore(opened.root, nextStore)
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

function normalizeStatePatchPayload(
  input: CanonicalStatePatchPayload,
): CanonicalStatePatchPayload {
  const evidence = input.evidence.map(cloneEvidenceRef)
  evidence.sort(compareEvidence)

  return {
    requestKey: input.requestKey,
    workspaceId: input.workspaceId,
    courseId: input.courseId,
    baseRevision: input.baseRevision,
    summary: input.summary,
    changes: cloneAssignmentUpsert(input.changes),
    evidence,
    ...(input.origin === undefined ? {} : { origin: input.origin }),
  }
}

async function openWorkspace(workspaceRoot: string): Promise<OpenWorkspace> {
  const productRoot = path.join(workspaceRoot, productDirectoryName)
  const storePath = path.join(productRoot, storeFileName)
  if (!(await pathExists(productRoot))) {
    await mkdir(productRoot)
  } else {
    await assertRegularDirectory(productRoot)
  }

  if (!(await pathExists(storePath))) {
    const store = {
      formatVersion: storeFormatVersion,
      workspaceId: `workspace_${randomUUID().replaceAll('-', '')}`,
      confirmedRevision: 0,
      course: null,
      materials: [],
      assignments: [],
      statePatches: [],
      userConfirmations: [],
    } satisfies PersistedWorkspaceState
    await writeStore(workspaceRoot, store)
    return { root: workspaceRoot, store, snapshot: readySnapshot(store) }
  }

  const stats = await lstat(storePath)
  if (!stats.isFile() || stats.isSymbolicLink()) {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace state must be a regular file.',
    )
  }
  let storeBytes: Buffer
  try {
    storeBytes = await readFile(storePath)
  } catch {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace state could not be read.',
    )
  }
  let decoded: unknown
  try {
    decoded = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(storeBytes),
    )
  } catch {
    return incompatibleWorkspace(workspaceRoot, null)
  }
  try {
    const store = decodeCurrentStore(decoded)
    return { root: workspaceRoot, store, snapshot: readySnapshot(store) }
  } catch (error) {
    if (
      !(error instanceof SemesterWorkspaceError) ||
      error.code !== 'store_invalid'
    ) {
      throw error
    }
    return incompatibleWorkspace(workspaceRoot, decoded)
  }
}

function decodeCurrentStore(value: unknown): PersistedWorkspaceState {
  if (
    !isRecord(value) ||
    !isExactRecord(value, [
      'assignments',
      'confirmedRevision',
      'course',
      'formatVersion',
      'materials',
      'statePatches',
      'userConfirmations',
      'workspaceId',
    ]) ||
    value.formatVersion !== storeFormatVersion ||
    !isWorkspaceId(value.workspaceId) ||
    !Number.isSafeInteger(value.confirmedRevision) ||
    Number(value.confirmedRevision) < 0 ||
    !isCurrentCourseOrNull(value.course) ||
    !isRawMaterialArray(value.materials) ||
    !isAssignmentArray(value.assignments) ||
    !isPersistedStatePatchArray(value.statePatches) ||
    !isUserConfirmationArray(value.userConfirmations)
  ) {
    throw invalidStore()
  }
  const store = {
    formatVersion: storeFormatVersion,
    workspaceId: value.workspaceId,
    confirmedRevision: Number(value.confirmedRevision),
    course: cloneCourse(value.course),
    materials: value.materials.map((material) => ({ ...material })),
    assignments: value.assignments.map(cloneAssignment),
    statePatches: value.statePatches.map(clonePersistedStatePatch),
    userConfirmations: value.userConfirmations.map((confirmation) => ({
      ...confirmation,
    })),
  } satisfies PersistedWorkspaceState
  if (!hasValidWorkspaceStateInvariants(store)) throw invalidStore()
  return store
}

function incompatibleWorkspace(
  workspaceRoot: string,
  decoded: unknown,
): OpenWorkspace {
  return {
    root: workspaceRoot,
    snapshot: {
      state: 'incompatible',
      readOnly: true,
      supportedStoreFormatVersion: storeFormatVersion,
      foundStoreFormatVersion:
        isRecord(decoded) && Number.isSafeInteger(decoded.formatVersion)
          ? Number(decoded.formatVersion)
          : null,
      displayMessage: incompatibleStoreDisplayMessage,
    },
  }
}

async function writeStore(
  workspaceRoot: string,
  store: PersistedWorkspaceState,
): Promise<void> {
  const productRoot = path.join(workspaceRoot, productDirectoryName)
  const storePath = path.join(productRoot, storeFileName)
  const temporaryPath = path.join(
    productRoot,
    `.${storeFileName}.${randomUUID()}.tmp`,
  )
  try {
    await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
    await rename(temporaryPath, storePath)
  } finally {
    await rm(temporaryPath, { force: true })
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

function cloneAssignment(assignment: Assignment): Assignment {
  return {
    ...assignment,
    evidence: assignment.evidence.map(cloneEvidenceRef),
  }
}

function cloneAssignmentUpsert(changes: AssignmentUpsert): AssignmentUpsert {
  return {
    operation: 'assignment.upsert',
    ...(changes.assignmentId === undefined
      ? {}
      : { assignmentId: changes.assignmentId }),
    values: {
      title: changes.values.title,
      dueAt: changes.values.dueAt,
      submissionMethod: changes.values.submissionMethod,
    },
  }
}

function cloneEvidenceRef(evidence: EvidenceRef): EvidenceRef {
  return {
    field: evidence.field,
    rawMaterialId: evidence.rawMaterialId,
    digest: evidence.digest,
    quote: evidence.quote,
  }
}

function cloneStatePatch(patch: StatePatch): StatePatch {
  return {
    id: patch.id,
    workspaceId: patch.workspaceId,
    courseId: patch.courseId,
    requestKey: patch.requestKey,
    baseRevision: patch.baseRevision,
    summary: patch.summary,
    changes: cloneAssignmentUpsert(patch.changes),
    evidence: patch.evidence.map(cloneEvidenceRef),
    ...(patch.origin === undefined ? {} : { origin: patch.origin }),
    status: patch.status,
    createdAt: patch.createdAt,
    applyOutcome:
      patch.applyOutcome === null ? null : { ...patch.applyOutcome },
  }
}

function clonePersistedStatePatch(
  patch: PersistedStatePatch,
): PersistedStatePatch {
  const canonicalPayload = canonicalStoredPatchPayload(patch)
  if (patch.canonicalPayload !== canonicalPayload) throw invalidStore()
  return {
    ...cloneStatePatch(patch),
    canonicalPayload,
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

function isSafeMaterialRelativePath(relativePath: string): boolean {
  return (
    relativePath.length > 0 &&
    !relativePath.includes('\\') &&
    !path.posix.isAbsolute(relativePath) &&
    path.posix.normalize(relativePath) === relativePath &&
    relativePath !== '..' &&
    !relativePath.startsWith('../') &&
    path.posix.extname(relativePath).toLowerCase() === '.txt'
  )
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

async function assertRegularDirectory(directory: string): Promise<void> {
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new SemesterWorkspaceError(
      'store_invalid',
      'SemesterWorkspace product state path must be a regular directory.',
    )
  }
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath)
    return true
  } catch (error) {
    if (hasErrnoCode(error, 'ENOENT')) return false
    throw error
  }
}

function isCourseOrNull(value: unknown): value is Course | null {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.id === 'string' &&
      /^course_[0-9a-f]{32}$/.test(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
  )
}

function isCurrentCourseOrNull(value: unknown): value is Course | null {
  return (
    value === null ||
    (isExactRecord(value, ['displayName', 'id']) &&
      isCourseOrNull(value) &&
      Buffer.byteLength(value.displayName, 'utf8') <= 512)
  )
}

function isRawMaterialArray(value: unknown): value is readonly RawMaterial[] {
  if (!Array.isArray(value)) return false
  const materialIds = new Set<string>()
  const relativePaths = new Set<string>()
  for (const material of value) {
    if (
      !isRecord(material) ||
      Object.keys(material).sort().join(',') !==
        'digest,id,mediaType,relativePath,size' ||
      typeof material.id !== 'string' ||
      !/^material_[0-9a-f]{32}$/.test(material.id) ||
      typeof material.relativePath !== 'string' ||
      !isSafeMaterialRelativePath(material.relativePath) ||
      typeof material.digest !== 'string' ||
      !/^[0-9a-f]{64}$/.test(material.digest) ||
      material.mediaType !== materialMediaType ||
      !Number.isSafeInteger(material.size) ||
      Number(material.size) < 0 ||
      Number(material.size) > materialFileMaxBytes ||
      materialIds.has(material.id) ||
      relativePaths.has(material.relativePath)
    ) {
      return false
    }
    materialIds.add(material.id)
    relativePaths.add(material.relativePath)
  }
  return true
}

const assignmentFields = [
  'title',
  'dueAt',
  'submissionMethod',
] as const satisfies readonly AssignmentField[]

function hasValidWorkspaceStateInvariants(
  store: PersistedWorkspaceState,
): boolean {
  const courseId = store.course?.id
  if (!courseId) {
    return (
      store.assignments.length === 0 &&
      store.statePatches.length === 0 &&
      store.userConfirmations.length === 0
    )
  }
  if (
    store.assignments.some((assignment) => assignment.courseId !== courseId)
  ) {
    return false
  }

  const patchesById = new Map<string, PersistedStatePatch>()
  for (const patch of store.statePatches) {
    if (
      patch.workspaceId !== store.workspaceId ||
      patch.courseId !== courseId ||
      patch.baseRevision > store.confirmedRevision ||
      !hasValidPatchLifecycle(patch, store.confirmedRevision) ||
      !isCanonicallyOrderedEvidence(patch.evidence) ||
      patch.canonicalPayload !== canonicalStoredPatchPayload(patch)
    ) {
      return false
    }
    patchesById.set(patch.id, patch)
  }

  const confirmationsByPatch = new Map<string, UserConfirmation>()
  const acceptedRevisions = new Set<number>()
  for (const confirmation of store.userConfirmations) {
    if (confirmationsByPatch.has(confirmation.patchId)) return false
    const patch = patchesById.get(confirmation.patchId)
    if (!patch) return false
    if (confirmation.decision === 'accepted') {
      if (
        patch.status !== 'applied' ||
        patch.applyOutcome?.type !== 'applied' ||
        patch.applyOutcome.assignmentId !== confirmation.assignmentId ||
        (patch.changes.assignmentId !== undefined &&
          patch.changes.assignmentId !== confirmation.assignmentId) ||
        patch.applyOutcome.resultingRevision !==
          confirmation.resultingRevision ||
        confirmation.resultingRevision !== patch.baseRevision + 1 ||
        confirmation.resultingRevision > store.confirmedRevision ||
        acceptedRevisions.has(confirmation.resultingRevision) ||
        !store.assignments.some(
          (assignment) => assignment.id === confirmation.assignmentId,
        )
      ) {
        return false
      }
      acceptedRevisions.add(confirmation.resultingRevision)
    } else if (
      patch.status !== 'rejected' ||
      patch.applyOutcome?.type !== 'not_applied' ||
      patch.applyOutcome.revision !== patch.baseRevision
    ) {
      return false
    }
    confirmationsByPatch.set(confirmation.patchId, confirmation)
  }
  if (acceptedRevisions.size !== store.confirmedRevision) return false

  for (const patch of store.statePatches) {
    const hasConfirmation = confirmationsByPatch.has(patch.id)
    if (
      ((patch.status === 'applied' || patch.status === 'rejected') &&
        !hasConfirmation) ||
      ((patch.status === 'pending' ||
        patch.status === 'superseded' ||
        patch.status === 'interrupted') &&
        hasConfirmation)
    ) {
      return false
    }
  }

  for (const assignment of store.assignments) {
    const latest = store.userConfirmations
      .filter(
        (confirmation) =>
          confirmation.decision === 'accepted' &&
          confirmation.assignmentId === assignment.id,
      )
      .sort(
        (left, right) =>
          Number(right.resultingRevision) - Number(left.resultingRevision),
      )[0]
    if (!latest) return false
    const patch = patchesById.get(latest.patchId)
    if (
      !patch ||
      patch.changes.values.title !== assignment.title ||
      patch.changes.values.dueAt !== assignment.dueAt ||
      patch.changes.values.submissionMethod !== assignment.submissionMethod ||
      JSON.stringify(patch.evidence) !== JSON.stringify(assignment.evidence)
    ) {
      return false
    }
  }
  return true
}

function hasValidPatchLifecycle(
  patch: PersistedStatePatch,
  confirmedRevision: number,
): boolean {
  if (patch.status === 'pending') return patch.applyOutcome === null
  if (patch.status === 'applied') {
    return (
      patch.applyOutcome?.type === 'applied' &&
      patch.applyOutcome.resultingRevision <= confirmedRevision
    )
  }
  if (patch.status === 'rejected') {
    return (
      patch.applyOutcome?.type === 'not_applied' &&
      patch.applyOutcome.revision <= confirmedRevision
    )
  }
  return (
    patch.applyOutcome === null ||
    (patch.applyOutcome.type === 'not_applied' &&
      patch.applyOutcome.revision <= confirmedRevision)
  )
}

function isCanonicallyOrderedEvidence(
  evidence: readonly EvidenceRef[],
): boolean {
  return evidence.every(
    (candidate, index) =>
      index === 0 || compareEvidence(evidence[index - 1]!, candidate) <= 0,
  )
}

function canonicalStoredPatchPayload(patch: PersistedStatePatch): string {
  return JSON.stringify(normalizeStatePatchPayload(patch))
}

function cloneCourse(course: Course | null): Course | null {
  return course ? { ...course } : null
}

function isAssignmentArray(value: unknown): value is readonly Assignment[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  for (const assignment of value) {
    if (
      !isExactRecord(assignment, [
        'courseId',
        'dueAt',
        'evidence',
        'id',
        'submissionMethod',
        'title',
      ]) ||
      !isAssignmentId(assignment.id) ||
      !isCourseId(assignment.courseId) ||
      !isBoundedMeaningfulText(assignment.title, assignmentTextMaxBytes) ||
      !isExplicitOffsetRfc3339(assignment.dueAt) ||
      !isBoundedMeaningfulText(
        assignment.submissionMethod,
        assignmentTextMaxBytes,
      ) ||
      !isEvidenceArray(assignment.evidence) ||
      ids.has(assignment.id)
    ) {
      return false
    }
    ids.add(assignment.id)
  }
  return true
}

function isPersistedStatePatchArray(
  value: unknown,
): value is readonly PersistedStatePatch[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const requestKeys = new Set<string>()
  for (const patch of value) {
    if (
      !isExactRecord(
        patch,
        [
          'applyOutcome',
          'baseRevision',
          'canonicalPayload',
          'changes',
          'courseId',
          'createdAt',
          'evidence',
          'id',
          'requestKey',
          'status',
          'summary',
          'workspaceId',
        ],
        ['origin'],
      ) ||
      !isPatchId(patch.id) ||
      !isWorkspaceId(patch.workspaceId) ||
      !isCourseId(patch.courseId) ||
      !isProposalKey(patch.requestKey) ||
      !Number.isSafeInteger(patch.baseRevision) ||
      Number(patch.baseRevision) < 0 ||
      !isBoundedMeaningfulText(patch.summary, proposalSummaryMaxBytes) ||
      !isExactAssignmentUpsert(patch.changes) ||
      !isEvidenceArray(patch.evidence) ||
      (patch.origin !== undefined &&
        !isBoundedMeaningfulText(patch.origin, proposalSummaryMaxBytes)) ||
      !isStatePatchStatus(patch.status) ||
      !isIsoInstant(patch.createdAt) ||
      !isStatePatchApplyOutcome(patch.applyOutcome) ||
      typeof patch.canonicalPayload !== 'string' ||
      Buffer.byteLength(patch.canonicalPayload, 'utf8') > 1024 * 1024 ||
      ids.has(patch.id) ||
      requestKeys.has(patch.requestKey)
    ) {
      return false
    }
    ids.add(patch.id)
    requestKeys.add(patch.requestKey)
  }
  return true
}

function isUserConfirmationArray(
  value: unknown,
): value is readonly UserConfirmation[] {
  if (!Array.isArray(value)) return false
  const ids = new Set<string>()
  const decisionKeys = new Set<string>()
  for (const confirmation of value) {
    if (!isRecord(confirmation)) return false
    const accepted = confirmation.decision === 'accepted'
    if (
      !isExactRecord(
        confirmation,
        accepted
          ? [
              'assignmentId',
              'decision',
              'decisionKey',
              'id',
              'outcome',
              'patchId',
              'resultingRevision',
              'settledAt',
            ]
          : [
              'decision',
              'decisionKey',
              'id',
              'outcome',
              'patchId',
              'settledAt',
            ],
      ) ||
      !isConfirmationId(confirmation.id) ||
      !isPatchId(confirmation.patchId) ||
      !isDecisionKey(confirmation.decisionKey) ||
      !isIsoInstant(confirmation.settledAt) ||
      (accepted
        ? confirmation.outcome !== 'applied' ||
          !isAssignmentId(confirmation.assignmentId) ||
          !Number.isSafeInteger(confirmation.resultingRevision) ||
          Number(confirmation.resultingRevision) < 1
        : confirmation.decision !== 'rejected' ||
          confirmation.outcome !== 'not_applied') ||
      ids.has(confirmation.id) ||
      decisionKeys.has(confirmation.decisionKey)
    ) {
      return false
    }
    ids.add(confirmation.id)
    decisionKeys.add(confirmation.decisionKey)
  }
  return true
}

function isExactAssignmentUpsert(value: unknown): value is AssignmentUpsert {
  return (
    isExactRecord(value, ['operation', 'values'], ['assignmentId']) &&
    value.operation === 'assignment.upsert' &&
    (value.assignmentId === undefined || isAssignmentId(value.assignmentId)) &&
    isExactRecord(value.values, ['dueAt', 'submissionMethod', 'title']) &&
    isBoundedMeaningfulText(value.values.title, assignmentTextMaxBytes) &&
    isExplicitOffsetRfc3339(value.values.dueAt) &&
    isBoundedMeaningfulText(
      value.values.submissionMethod,
      assignmentTextMaxBytes,
    )
  )
}

function isEvidenceArray(value: unknown): value is readonly EvidenceRef[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= proposalEvidenceMax &&
    value.every(
      (evidence) =>
        isExactRecord(evidence, [
          'digest',
          'field',
          'quote',
          'rawMaterialId',
        ]) &&
        isAssignmentField(evidence.field) &&
        isMaterialId(evidence.rawMaterialId) &&
        typeof evidence.digest === 'string' &&
        /^[0-9a-f]{64}$/.test(evidence.digest) &&
        isBoundedMeaningfulText(evidence.quote, evidenceQuoteMaxBytes),
    ) &&
    assignmentFields.every((field) =>
      value.some(
        (evidence) =>
          isRecord(evidence) && evidence.field === field,
      ),
    )
  )
}

function isStatePatchApplyOutcome(
  value: unknown,
): value is StatePatchApplyOutcome {
  if (value === null) return true
  if (!isRecord(value) || typeof value.type !== 'string') return false
  if (value.type === 'applied') {
    return (
      isExactRecord(value, ['assignmentId', 'resultingRevision', 'type']) &&
      isAssignmentId(value.assignmentId) &&
      Number.isSafeInteger(value.resultingRevision) &&
      Number(value.resultingRevision) >= 1
    )
  }
  return (
    value.type === 'not_applied' &&
    isExactRecord(value, ['revision', 'type']) &&
    Number.isSafeInteger(value.revision) &&
    Number(value.revision) >= 0
  )
}

function isStatePatchStatus(value: unknown): value is StatePatchStatus {
  return (
    value === 'pending' ||
    value === 'superseded' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'interrupted'
  )
}

function compareEvidence(left: EvidenceRef, right: EvidenceRef): number {
  return (
    compareLexically(left.field, right.field) ||
    compareLexically(left.rawMaterialId, right.rawMaterialId) ||
    compareLexically(left.digest, right.digest) ||
    compareLexically(left.quote, right.quote)
  )
}

function compareLexically(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
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

function isExplicitOffsetRfc3339(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    )
  if (!match) return false
  if (match[7] === '-00:00') return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const hour = Number(match[4])
  const minute = Number(match[5])
  const second = Number(match[6])
  const offsetHour = match[7] === 'Z' ? 0 : Number(match[9])
  const offsetMinute = match[7] === 'Z' ? 0 : Number(match[10])
  return (
    year >= 1 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth(year, month) &&
    hour <= 23 &&
    minute <= 59 &&
    second <= 59 &&
    offsetHour <= 23 &&
    offsetMinute <= 59
  )
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

function isBoundedMeaningfulText(value: unknown, maxBytes: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= maxBytes
  )
}

function isAssignmentField(value: unknown): value is AssignmentField {
  return assignmentFields.some((field) => field === value)
}

function isWorkspaceId(value: unknown): value is string {
  return typeof value === 'string' && /^workspace_[0-9a-f]{32}$/.test(value)
}

function isCourseId(value: unknown): value is string {
  return typeof value === 'string' && /^course_[0-9a-f]{32}$/.test(value)
}

function isMaterialId(value: unknown): value is string {
  return typeof value === 'string' && /^material_[0-9a-f]{32}$/.test(value)
}

function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && /^assignment_[0-9a-f]{32}$/.test(value)
}

function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

function isProposalKey(value: unknown): value is string {
  return typeof value === 'string' && /^proposal_[0-9a-f]{32}$/.test(value)
}

function isDecisionKey(value: unknown): value is string {
  return typeof value === 'string' && /^decision_[0-9a-f]{32}$/.test(value)
}

function isConfirmationId(value: unknown): value is string {
  return typeof value === 'string' && /^confirmation_[0-9a-f]{32}$/.test(value)
}

function isOpaqueRuntimeIdentity(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 512
  )
}

function runtimeTurnKey(runtime: {
  readonly threadId: string
  readonly turnId: string
}): string {
  return JSON.stringify([runtime.threadId, runtime.turnId])
}

function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

function isExactRecord(
  value: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const actual = Object.keys(value).sort()
  const allowed = new Set([...requiredKeys, ...optionalKeys])
  return (
    requiredKeys.every((key) => Object.hasOwn(value, key)) &&
    actual.every((key) => allowed.has(key)) &&
    actual.length >= requiredKeys.length &&
    actual.length <= requiredKeys.length + optionalKeys.length
  )
}

function invalidProposal(): StatePatchReviewError {
  return new StatePatchReviewError(
    'proposal_invalid',
    'The StatePatch proposal is invalid.',
  )
}

function invalidStore(): SemesterWorkspaceError {
  return new SemesterWorkspaceError(
    'store_invalid',
    'SemesterWorkspace state has an invalid format.',
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}
