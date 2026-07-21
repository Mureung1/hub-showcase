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
import type {
  Assignment,
  AssignmentField,
  AssignmentUpsert,
  Course,
  EvidenceRef,
  ModelingRun,
  ModelingRunSource,
  RawMaterial,
  StatePatch,
  StatePatchApplyOutcome,
  StatePatchStatus,
  UserConfirmation,
} from './semester-workspace.js'

export const currentWorkspaceStoreFormatVersion = 2 as const
export const workspaceProductDirectoryName = '.ay-ple'

const storeFileName = 'workspace-state.json'
const materialMediaType = 'text/plain; charset=utf-8'
const materialFileMaxBytes = 1024 * 1024
const proposalSummaryMaxBytes = 2 * 1024
const assignmentTextMaxBytes = 1024
const evidenceQuoteMaxBytes = 16 * 1024
const proposalEvidenceMax = 64
const actionMetadataMaxBytes = 512
const actionPathMaxBytes = 16 * 1024
const actionScratchRelativeRoot = `${workspaceProductDirectoryName}/runtime-scratch`

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

export type ExecutionGuard = {
  readonly operationId: string
  readonly kind: 'assignment_action' | 'product_chat'
  readonly runId?: string
  readonly confirmedRevision: number
  readonly materials: readonly RawMaterial[]
  readonly selectedMaterials: readonly ModelingRunSource[]
  readonly scratchRelativePath: string
  readonly state: 'active' | 'cleanup_required' | 'recovery_required'
  readonly createdAt: string
  readonly nativeCorrelation?: {
    readonly threadId: string
    readonly turnId: string
  }
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

  async matches(
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
    ...(patch.guardOperationId === undefined
      ? {}
      : { guardOperationId: patch.guardOperationId }),
  }
}

function cloneModelingRun(run: ModelingRun): ModelingRun {
  return {
    ...run,
    sourceBaseline: run.sourceBaseline.map((source) => ({ ...source })),
    ...(run.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...run.nativeCorrelation } }),
  }
}

function cloneExecutionGuard(guard: ExecutionGuard): ExecutionGuard {
  return {
    ...guard,
    materials: guard.materials.map((material) => ({ ...material })),
    selectedMaterials: guard.selectedMaterials.map((source) => ({ ...source })),
    ...(guard.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...guard.nativeCorrelation } }),
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
        ['failureCode', 'nativeCorrelation', 'settledAt'],
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
  for (const run of store.modelingRuns) {
    if (
      run.courseId !== courseId ||
      actionIds.has(run.actionId) ||
      !hasValidModelingRunLifecycle(run)
    ) {
      return false
    }
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
        (evidence) => isRecord(evidence) && evidence.field === field,
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

function normalizeStatePatchPayload(patch: StatePatch): {
  readonly requestKey: string
  readonly workspaceId: string
  readonly courseId: string
  readonly baseRevision: number
  readonly summary: string
  readonly changes: AssignmentUpsert
  readonly evidence: readonly EvidenceRef[]
  readonly origin?: string
} {
  const evidence = patch.evidence.map(cloneEvidenceRef)
  evidence.sort(compareEvidence)
  return {
    requestKey: patch.requestKey,
    workspaceId: patch.workspaceId,
    courseId: patch.courseId,
    baseRevision: patch.baseRevision,
    summary: patch.summary,
    changes: cloneAssignmentUpsert(patch.changes),
    evidence,
    ...(patch.origin === undefined ? {} : { origin: patch.origin }),
  }
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

function isBoundedMeaningfulText(
  value: unknown,
  maxBytes: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= maxBytes
  )
}

function isAssignmentField(value: unknown): value is AssignmentField {
  return assignmentFields.some((field) => field === value)
}

function isModelingRunSourceBaseline(
  value: unknown,
): value is readonly [ModelingRunSource, ModelingRunSource] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every(
      (source) =>
        isExactRecord(source, ['digest', 'rawMaterialId']) &&
        isMaterialId(source.rawMaterialId) &&
        isSha256Digest(source.digest),
    ) &&
    value[0]?.rawMaterialId !== value[1]?.rawMaterialId
  )
}

function isNativeCorrelation(value: unknown): value is {
  readonly threadId: string
  readonly turnId: string
} {
  return (
    isExactRecord(value, ['threadId', 'turnId']) &&
    isOpaqueRuntimeIdentity(value.threadId) &&
    isOpaqueRuntimeIdentity(value.turnId)
  )
}

function isModelingRunStatus(value: unknown): value is ModelingRun['status'] {
  return (
    value === 'starting' ||
    value === 'not_accepted' ||
    value === 'acceptance_unknown' ||
    value === 'running' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function isModelingRunValidationOutcome(
  value: unknown,
): value is ModelingRun['validationOutcome'] {
  return (
    value === 'pending' ||
    value === 'passed' ||
    value === 'failed' ||
    value === 'unknown'
  )
}

function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isSafeFailureCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,127}$/.test(value)
}

function isSafeSkillName(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value)
}

function isSafeAbsoluteActionPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    Buffer.byteLength(value, 'utf8') <= actionPathMaxBytes
  )
}

function isWorkspaceId(value: unknown): value is string {
  return typeof value === 'string' && /^workspace_[0-9a-f]{32}$/.test(value)
}

function isActionId(value: unknown): value is string {
  return typeof value === 'string' && /^action_[0-9a-f]{32}$/.test(value)
}

function isChatOperationId(value: unknown): value is string {
  return typeof value === 'string' && /^chat_[0-9a-f]{32}$/.test(value)
}

function isProductOperationId(value: unknown): value is string {
  return isActionId(value) || isChatOperationId(value)
}

function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^run_[0-9a-f]{32}$/.test(value)
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
