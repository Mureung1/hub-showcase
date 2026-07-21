import { randomUUID } from 'node:crypto'
import {
  lstat,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'

import { SemesterWorkspaceError } from './semester-workspace-error.js'
import {
  actionMetadataMaxBytes,
  assignmentTextMaxBytes,
  cloneAssignment,
  cloneExecutionGuard,
  cloneModelingRun,
  cloneStatePatch,
  compareEvidence,
  hasErrnoCode,
  invalidWorkspaceStore as invalidStore,
  isActionId,
  isAssignmentId,
  isBoundedMeaningfulText,
  isChatOperationId,
  isConfirmationId,
  isCourseId,
  isDecisionKey,
  isEvidenceArray,
  isExactAssignmentUpsert,
  isExactRecord,
  isExplicitOffsetRfc3339,
  isIsoInstant,
  isMaterialId,
  isModelingRunSourceBaseline,
  isModelingRunStatus,
  isModelingRunValidationOutcome,
  isNativeCorrelation,
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
  isStatePatchApplyOutcome,
  isStatePatchStatus,
  isWorkspaceId,
  materialFileMaxBytes,
  materialMediaType,
  normalizeStatePatchPayload,
  proposalSummaryMaxBytes,
} from './semester-workspace-values.js'
import type { ExecutionGuard } from './semester-workspace-values.js'
import type {
  Assignment,
  Course,
  EvidenceRef,
  ModelingRun,
  ModelingRunSource,
  RawMaterial,
  StatePatch,
  UserConfirmation,
} from './semester-workspace.js'

export const currentWorkspaceStoreFormatVersion = 2 as const
export const workspaceProductDirectoryName = '.ay-ple'
export const actionScratchRelativeRoot =
  `${workspaceProductDirectoryName}/runtime-scratch`
export type { ExecutionGuard } from './semester-workspace-values.js'

const storeFileName = 'workspace-state.json'

export type PersistedStatePatch = StatePatch & {
  readonly canonicalPayload: string
  readonly guardOperationId?: string
}

export type PersistedWorkspaceState = {
  readonly formatVersion: typeof currentWorkspaceStoreFormatVersion
  readonly workspaceId: string
  readonly confirmedRevision: number
  readonly course: Course | null
  readonly materials: readonly RawMaterial[]
  readonly assignments: readonly Assignment[]
  readonly statePatches: readonly PersistedStatePatch[]
  readonly userConfirmations: readonly UserConfirmation[]
  readonly modelingRuns: readonly ModelingRun[]
  readonly executionGuard: ExecutionGuard | null
}

export type WorkspaceStoreOpenResult =
  | {
      readonly status: 'ready'
      readonly store: PersistedWorkspaceState
    }
  | {
      readonly status: 'incompatible'
      readonly foundStoreFormatVersion: number | null
    }

export const semesterWorkspaceStore = {
  async open(workspaceRoot: string): Promise<WorkspaceStoreOpenResult> {
    const productRoot = path.join(
      workspaceRoot,
      workspaceProductDirectoryName,
    )
    const storePath = path.join(productRoot, storeFileName)
    if (!(await pathExists(productRoot))) {
      await mkdir(productRoot)
    } else {
      await assertRegularDirectory(productRoot)
    }

    if (!(await pathExists(storePath))) {
      const store = createEmptyWorkspaceStore()
      await writeWorkspaceStore(workspaceRoot, store)
      return { status: 'ready', store }
    }

    const stats = await lstat(storePath)
    if (!stats.isFile()) return incompatibleStore(null)

    let storeBytes: Buffer
    try {
      storeBytes = await readFile(storePath)
    } catch {
      return incompatibleStore(null)
    }

    let decoded: unknown
    try {
      decoded = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(storeBytes),
      )
    } catch {
      return incompatibleStore(null)
    }

    try {
      return { status: 'ready', store: decodeCurrentStore(decoded) }
    } catch (error) {
      if (
        !(error instanceof SemesterWorkspaceError) ||
        error.code !== 'store_invalid'
      ) {
        throw error
      }
      return incompatibleStore(decoded)
    }
  },

  write: writeWorkspaceStore,

  async matchesCanonicalBytes(
    workspaceRoot: string,
    store: PersistedWorkspaceState,
  ): Promise<boolean> {
    try {
      return (
        await readFile(workspaceStorePath(workspaceRoot), 'utf8')
      ) === encodeCurrentStore(store)
    } catch {
      return false
    }
  },
} as const

function createEmptyWorkspaceStore(): PersistedWorkspaceState {
  return {
    formatVersion: currentWorkspaceStoreFormatVersion,
    workspaceId: `workspace_${randomUUID().replaceAll('-', '')}`,
    confirmedRevision: 0,
    course: null,
    materials: [],
    assignments: [],
    statePatches: [],
    userConfirmations: [],
    modelingRuns: [],
    executionGuard: null,
  }
}

function decodeCurrentStore(value: unknown): PersistedWorkspaceState {
  if (
    !isRecord(value) ||
    !isExactRecord(value, [
      'assignments',
      'confirmedRevision',
      'course',
      'executionGuard',
      'formatVersion',
      'materials',
      'modelingRuns',
      'statePatches',
      'userConfirmations',
      'workspaceId',
    ]) ||
    value.formatVersion !== currentWorkspaceStoreFormatVersion ||
    !isWorkspaceId(value.workspaceId) ||
    !Number.isSafeInteger(value.confirmedRevision) ||
    Number(value.confirmedRevision) < 0 ||
    !isCurrentCourseOrNull(value.course) ||
    !isRawMaterialArray(value.materials) ||
    !isAssignmentArray(value.assignments) ||
    !isPersistedStatePatchArray(value.statePatches) ||
    !isUserConfirmationArray(value.userConfirmations) ||
    !isModelingRunArray(value.modelingRuns) ||
    !isExecutionGuardOrNull(value.executionGuard)
  ) {
    throw invalidStore()
  }
  const store = {
    formatVersion: currentWorkspaceStoreFormatVersion,
    workspaceId: value.workspaceId,
    confirmedRevision: Number(value.confirmedRevision),
    course: cloneCourse(value.course),
    materials: value.materials.map((material) => ({ ...material })),
    assignments: value.assignments.map(cloneAssignment),
    statePatches: value.statePatches.map(clonePersistedStatePatch),
    userConfirmations: value.userConfirmations.map((confirmation) => ({
      ...confirmation,
    })),
    modelingRuns: value.modelingRuns.map(cloneModelingRun),
    executionGuard:
      value.executionGuard === null
        ? null
        : cloneExecutionGuard(value.executionGuard),
  } satisfies PersistedWorkspaceState
  if (!hasValidWorkspaceStateInvariants(store)) throw invalidStore()
  return store
}

function incompatibleStore(decoded: unknown): WorkspaceStoreOpenResult {
  return {
    status: 'incompatible',
    foundStoreFormatVersion:
      isRecord(decoded) && Number.isSafeInteger(decoded.formatVersion)
        ? Number(decoded.formatVersion)
        : null,
  }
}

async function writeWorkspaceStore(
  workspaceRoot: string,
  store: PersistedWorkspaceState,
): Promise<void> {
  const productRoot = path.join(
    workspaceRoot,
    workspaceProductDirectoryName,
  )
  const storePath = path.join(productRoot, storeFileName)
  const temporaryPath = path.join(
    productRoot,
    `.${storeFileName}.${randomUUID()}.tmp`,
  )
  try {
    await writeFile(temporaryPath, encodeCurrentStore(store), {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
    await rename(temporaryPath, storePath)
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

function encodeCurrentStore(store: PersistedWorkspaceState): string {
  return `${JSON.stringify(store, null, 2)}\n`
}

function workspaceStorePath(workspaceRoot: string): string {
  return path.join(
    workspaceRoot,
    workspaceProductDirectoryName,
    storeFileName,
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

function cloneCourse(course: Course | null): Course | null {
  return course ? { ...course } : null
}

function clonePersistedStatePatch(
  patch: PersistedStatePatch,
): PersistedStatePatch {
  const canonicalPayload = canonicalStoredPatchPayload(patch)
  if (patch.canonicalPayload !== canonicalPayload) throw invalidStore()
  return {
    ...cloneStatePatch(patch),
    canonicalPayload,
    ...(patch.guardOperationId === undefined
      ? {}
      : { guardOperationId: patch.guardOperationId }),
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

function isModelingRunArray(value: unknown): value is readonly ModelingRun[] {
  if (!Array.isArray(value)) return false
  const runIds = new Set<string>()
  const actionIds = new Set<string>()
  for (const run of value) {
    if (
      !isExactRecord(
        run,
        [
          'actionId',
          'argumentsDigest',
          'courseId',
          'createdAt',
          'id',
          'invocationFingerprint',
          'recipeDigest',
          'recipeName',
          'recipeVersion',
          'requestedSkillName',
          'requestedSkillPath',
          'sourceBaseline',
          'status',
          'updatedAt',
          'validationOutcome',
        ],
        [
          'failureCode',
          'nativeCorrelation',
          'recoveryOutcome',
          'retryOfRunId',
          'settledAt',
        ],
      ) ||
      !isRunId(run.id) ||
      !isActionId(run.actionId) ||
      !isCourseId(run.courseId) ||
      !isSha256Digest(run.invocationFingerprint) ||
      !isSafeSkillName(run.requestedSkillName) ||
      !isSafeAbsoluteActionPath(run.requestedSkillPath) ||
      !isBoundedMeaningfulText(run.recipeName, actionMetadataMaxBytes) ||
      !isBoundedMeaningfulText(run.recipeVersion, actionMetadataMaxBytes) ||
      !isSha256Digest(run.recipeDigest) ||
      !isSha256Digest(run.argumentsDigest) ||
      !isModelingRunSourceBaseline(run.sourceBaseline) ||
      !isModelingRunStatus(run.status) ||
      !isModelingRunValidationOutcome(run.validationOutcome) ||
      (run.retryOfRunId !== undefined && !isRunId(run.retryOfRunId)) ||
      (run.recoveryOutcome !== undefined &&
        !isPersistedModelingRunRecovery(run.recoveryOutcome)) ||
      !isIsoInstant(run.createdAt) ||
      !isIsoInstant(run.updatedAt) ||
      (run.nativeCorrelation !== undefined &&
        !isNativeCorrelation(run.nativeCorrelation)) ||
      (run.failureCode !== undefined &&
        !isSafeFailureCode(run.failureCode)) ||
      (run.settledAt !== undefined && !isIsoInstant(run.settledAt)) ||
      runIds.has(run.id) ||
      actionIds.has(run.actionId)
    ) {
      return false
    }
    runIds.add(run.id)
    actionIds.add(run.actionId)
  }
  return true
}

function isPersistedModelingRunRecovery(
  value: unknown,
): value is NonNullable<ModelingRun['recoveryOutcome']> {
  return (
    isRecord(value) &&
    (((value.outcome === 'interrupted' || value.outcome === 'unknown') &&
      isExactRecord(value, ['outcome'])) ||
      (value.outcome === 'continuation_lost' &&
        isExactRecord(value, ['confirmedRevision', 'outcome']) &&
        Number.isSafeInteger(value.confirmedRevision) &&
        Number(value.confirmedRevision) >= 0))
  )
}

function isExecutionGuardOrNull(value: unknown): value is ExecutionGuard | null {
  return (
    value === null ||
    (isExactRecord(
      value,
      [
        'confirmedRevision',
        'createdAt',
        'kind',
        'materials',
        'operationId',
        'scratchRelativePath',
        'selectedMaterials',
        'state',
      ],
      ['nativeCorrelation', 'runId'],
    ) &&
      isProductOperationId(value.operationId) &&
      (value.kind === 'assignment_action' || value.kind === 'product_chat') &&
      (value.kind === 'assignment_action'
        ? isActionId(value.operationId) && isRunId(value.runId)
        : isChatOperationId(value.operationId) && value.runId === undefined) &&
      Number.isSafeInteger(value.confirmedRevision) &&
      Number(value.confirmedRevision) >= 0 &&
      isRawMaterialArray(value.materials) &&
      isGuardSelectedMaterials(value.selectedMaterials) &&
      value.scratchRelativePath ===
        `${actionScratchRelativeRoot}/${value.operationId}` &&
      (value.state === 'active' ||
        value.state === 'cleanup_required' ||
        value.state === 'recovery_required') &&
      isIsoInstant(value.createdAt) &&
      (value.nativeCorrelation === undefined ||
        isNativeCorrelation(value.nativeCorrelation)))
  )
}

function isGuardSelectedMaterials(
  value: unknown,
): value is readonly ModelingRunSource[] {
  return (
    Array.isArray(value) &&
    value.length <= 2 &&
    value.every(
      (source) =>
        isExactRecord(source, ['digest', 'rawMaterialId']) &&
        isMaterialId(source.rawMaterialId) &&
        isSha256Digest(source.digest),
    ) &&
    new Set(
      value.map((source) =>
        isRecord(source) ? source.rawMaterialId : undefined,
      ),
    ).size === value.length
  )
}

function hasValidWorkspaceStateInvariants(
  store: PersistedWorkspaceState,
): boolean {
  const courseId = store.course?.id
  if (!courseId) {
    return (
      store.confirmedRevision === 0 &&
      store.assignments.length === 0 &&
      store.statePatches.length === 0 &&
      store.userConfirmations.length === 0 &&
      store.modelingRuns.length === 0 &&
      store.executionGuard === null
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

  const runsById = new Map<string, ModelingRun>()
  const actionIds = new Set<string>()
  const retriedRunIds = new Set<string>()
  for (const run of store.modelingRuns) {
    const retrySource = run.retryOfRunId
      ? runsById.get(run.retryOfRunId)
      : undefined
    const continuationPatches =
      run.recoveryOutcome?.outcome === 'continuation_lost'
        ? store.statePatches.filter(
            (patch) =>
              patch.guardOperationId === run.actionId &&
              (patch.status === 'applied' || patch.status === 'rejected'),
          )
        : []
    const continuationPatch = continuationPatches[0]
    const continuationConfirmation = continuationPatch
      ? store.userConfirmations.find(
          (confirmation) => confirmation.patchId === continuationPatch.id,
        )
      : undefined
    const continuationRevision = continuationConfirmation
      ? continuationConfirmation.resultingRevision ?? continuationPatch?.baseRevision
      : undefined
    if (
      run.courseId !== courseId ||
      actionIds.has(run.actionId) ||
      !hasValidModelingRunLifecycle(run) ||
      (run.retryOfRunId !== undefined &&
        (!retrySource ||
          retriedRunIds.has(run.retryOfRunId) ||
          (retrySource.status !== 'interrupted' &&
            retrySource.status !== 'unknown') ||
          (retrySource.recoveryOutcome?.outcome !== 'interrupted' &&
            retrySource.recoveryOutcome?.outcome !== 'unknown') ||
          retrySource.courseId !== run.courseId ||
          retrySource.requestedSkillName !== run.requestedSkillName ||
          retrySource.requestedSkillPath !== run.requestedSkillPath ||
          retrySource.recipeName !== run.recipeName ||
          retrySource.recipeVersion !== run.recipeVersion ||
          retrySource.recipeDigest !== run.recipeDigest ||
          retrySource.argumentsDigest !== run.argumentsDigest ||
          JSON.stringify(retrySource.sourceBaseline) !==
            JSON.stringify(run.sourceBaseline))) ||
      (run.recoveryOutcome?.outcome === 'continuation_lost' &&
        (run.recoveryOutcome.confirmedRevision > store.confirmedRevision ||
          continuationPatches.length !== 1 ||
          continuationRevision !== run.recoveryOutcome.confirmedRevision)) ||
      ((run.recoveryOutcome?.outcome === 'interrupted' ||
        run.recoveryOutcome?.outcome === 'unknown') &&
        run.recoveryOutcome.outcome !== run.status)
    ) {
      return false
    }
    if (run.retryOfRunId !== undefined) retriedRunIds.add(run.retryOfRunId)
    runsById.set(run.id, run)
    actionIds.add(run.actionId)
  }
  const unfinishedRuns = store.modelingRuns.filter(
    (run) =>
      run.status === 'starting' ||
      run.status === 'running' ||
      run.status === 'acceptance_unknown',
  )
  if (unfinishedRuns.length > 1) return false
  if (store.executionGuard) {
    if (
      store.executionGuard.confirmedRevision !== store.confirmedRevision ||
      JSON.stringify(store.executionGuard.materials) !==
        JSON.stringify(store.materials) ||
      store.executionGuard.selectedMaterials.some((selected) => {
        const registered = store.materials.find(
          (material) => material.id === selected.rawMaterialId,
        )
        return !registered || registered.digest !== selected.digest
      })
    ) {
      return false
    }
    if (store.executionGuard.kind === 'assignment_action') {
      const guardedRun = runsById.get(store.executionGuard.runId!)
      if (
        !guardedRun ||
        guardedRun.actionId !== store.executionGuard.operationId ||
        JSON.stringify(guardedRun.sourceBaseline) !==
          JSON.stringify(store.executionGuard.selectedMaterials) ||
        JSON.stringify(guardedRun.nativeCorrelation) !==
          JSON.stringify(store.executionGuard.nativeCorrelation) ||
        (unfinishedRuns.length === 1 && unfinishedRuns[0]?.id !== guardedRun.id)
      ) {
        return false
      }
    } else if (unfinishedRuns.length > 0) {
      return false
    }
  } else if (unfinishedRuns.length > 0) {
    return false
  }

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

function hasValidModelingRunLifecycle(run: ModelingRun): boolean {
  if (run.updatedAt < run.createdAt) return false
  if (run.status === 'starting') {
    return (
      run.validationOutcome === 'pending' &&
      run.nativeCorrelation === undefined &&
      run.failureCode === undefined &&
      run.settledAt === undefined
    )
  }
  if (run.status === 'running') {
    return (
      run.validationOutcome === 'pending' &&
      run.nativeCorrelation !== undefined &&
      run.failureCode === undefined &&
      run.settledAt === undefined
    )
  }
  return (
    run.validationOutcome !== 'pending' &&
    run.settledAt !== undefined &&
    run.settledAt === run.updatedAt &&
    (run.status !== 'not_accepted' || run.nativeCorrelation === undefined)
  )
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
        ['guardOperationId', 'origin'],
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
      (patch.guardOperationId !== undefined &&
        !isProductOperationId(patch.guardOperationId)) ||
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
