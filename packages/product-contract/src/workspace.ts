import {
  invalidContract,
  isAssignmentField,
  isAssignmentId,
  isCourseId,
  isDigest,
  isExactObject,
  isMaterialId,
  isNonEmptyString,
  isPatchId,
  isRecord,
  isRevision,
  isRunId,
  isValidationOutcome,
} from './contract-values.js'
import {
  isProductOperationRecovery,
  type ProductOperationRecovery,
} from './recovery.js'

export type ProductRawMaterial = {
  readonly id: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
}

export type ReadyProductWorkspace = {
  readonly state: 'ready'
  readonly confirmedRevision: number
  readonly course: {
    readonly id: string
    readonly displayName: string
  } | null
  readonly materials: readonly ProductRawMaterial[]
}

export type IncompatibleProductWorkspace = {
  readonly state: 'incompatible'
  readonly readOnly: true
  readonly displayMessage: string
}

export type ProductWorkspace =
  | ReadyProductWorkspace
  | IncompatibleProductWorkspace

export type ProductAccountReadiness =
  | { readonly state: 'ready' }
  | { readonly state: 'not_ready'; readonly displayMessage: string }
  | { readonly state: 'unavailable'; readonly displayMessage: string }

export type ProductEvidenceRef = {
  readonly field: 'title' | 'dueAt' | 'submissionMethod'
  readonly materialId: string
  readonly digest: string
  readonly quote: string
}

export type ProductAssignment = {
  readonly id: string
  readonly courseId: string
  readonly title: string
  readonly dueAt: string
  readonly submissionMethod: string
  readonly evidence: readonly ProductEvidenceRef[]
}

export type ProductSettledStatePatch = {
  readonly id: string
  readonly courseId: string
  readonly baseRevision: number
  readonly status: 'superseded' | 'applied' | 'rejected' | 'interrupted'
  readonly createdAt: string
  readonly applyOutcome:
    | null
    | {
        readonly type: 'applied'
        readonly assignmentId: string
        readonly resultingRevision: number
      }
    | { readonly type: 'not_applied'; readonly revision: number }
}

export type ProductUserConfirmation = {
  readonly id: string
  readonly patchId: string
  readonly decision: 'accepted' | 'rejected'
  readonly settledAt: string
  readonly assignmentId: string | null
  readonly resultingRevision: number | null
  readonly outcome: 'applied' | 'not_applied'
}

export type ProductSettledModelingRun = {
  readonly id: string
  readonly actionId: string
  readonly courseId: string
  readonly recipe: {
    readonly name: string
    readonly version: string
    readonly requestedSkillName: string
  }
  readonly sources: readonly {
    readonly materialId: string
    readonly digest: string
  }[]
  readonly retryOfRunId: string | null
  readonly recovery: ProductOperationRecovery | null
  readonly status:
    | 'not_accepted'
    | 'completed'
    | 'failed'
    | 'interrupted'
    | 'unknown'
  readonly validationOutcome: 'passed' | 'failed' | 'unknown'
  readonly createdAt: string
  readonly updatedAt: string
  readonly settledAt: string
}

export type ProductSettledHistory = {
  readonly assignments: readonly ProductAssignment[]
  readonly statePatches: readonly ProductSettledStatePatch[]
  readonly userConfirmations: readonly ProductUserConfirmation[]
  readonly modelingRuns: readonly ProductSettledModelingRun[]
}

export type ProductBootstrap = {
  readonly accountReadiness: ProductAccountReadiness
  readonly operationStatus: 'active' | 'idle'
  readonly workspace: ProductWorkspace | null
  readonly history: ProductSettledHistory
}

export type ProductWorkspaceActivationResponse = {
  readonly status: 'activated' | 'cancelled'
  readonly workspace: ProductWorkspace | null
}

export type ProductWorkspaceResponse = {
  readonly workspace: ReadyProductWorkspace
}

export type ProductMaterialPreview = {
  readonly materialId: string
  readonly relativePath: string
  readonly digest: string
  readonly mediaType: 'text/plain; charset=utf-8'
  readonly size: number
  readonly text: string
  readonly truncated: boolean
}

export function decodeProductBootstrap(value: unknown): ProductBootstrap {
  if (
    !isExactObject(value, [
      'accountReadiness',
      'history',
      'operationStatus',
      'workspace',
    ]) ||
    (value.operationStatus !== 'active' && value.operationStatus !== 'idle')
  ) {
    throw invalidContract()
  }
  return {
    accountReadiness: decodeProductAccountReadiness(value.accountReadiness),
    operationStatus: value.operationStatus,
    workspace:
      value.workspace === null ? null : decodeProductWorkspace(value.workspace),
    history: decodeProductSettledHistory(value.history),
  }
}

export function decodeProductWorkspaceActivationResponse(
  value: unknown,
): ProductWorkspaceActivationResponse {
  if (
    !isExactObject(value, ['status', 'workspace']) ||
    (value.status !== 'activated' && value.status !== 'cancelled')
  ) {
    throw invalidContract()
  }
  return {
    status: value.status,
    workspace:
      value.workspace === null ? null : decodeProductWorkspace(value.workspace),
  }
}

export function decodeProductWorkspaceResponse(
  value: unknown,
): ProductWorkspaceResponse {
  if (!isExactObject(value, ['workspace'])) throw invalidContract()
  const workspace = decodeProductWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidContract()
  return { workspace }
}

export function decodeProductMaterialPreview(
  value: unknown,
): ProductMaterialPreview {
  if (
    !isExactObject(value, [
      'digest',
      'materialId',
      'mediaType',
      'relativePath',
      'size',
      'text',
      'truncated',
    ]) ||
    !hasValidMaterialMetadata(value, 'materialId') ||
    typeof value.text !== 'string' ||
    typeof value.truncated !== 'boolean'
  ) {
    throw invalidContract()
  }
  return {
    materialId: value.materialId as string,
    relativePath: value.relativePath as string,
    digest: value.digest as string,
    mediaType: 'text/plain; charset=utf-8',
    size: value.size as number,
    text: value.text,
    truncated: value.truncated,
  }
}

export function decodeProductWorkspace(value: unknown): ProductWorkspace {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'incompatible') {
    if (
      !isExactObject(value, ['displayMessage', 'readOnly', 'state']) ||
      value.readOnly !== true ||
      !isNonEmptyString(value.displayMessage)
    ) {
      throw invalidContract()
    }
    return {
      state: 'incompatible',
      readOnly: true,
      displayMessage: value.displayMessage,
    }
  }
  if (
    value.state !== 'ready' ||
    !isExactObject(value, [
      'confirmedRevision',
      'course',
      'materials',
      'state',
    ]) ||
    !isRevision(value.confirmedRevision) ||
    !isCourseOrNull(value.course) ||
    !Array.isArray(value.materials)
  ) {
    throw invalidContract()
  }
  return {
    state: 'ready',
    confirmedRevision: value.confirmedRevision,
    course: value.course,
    materials: value.materials.map(decodeProductRawMaterial),
  }
}

function decodeProductAccountReadiness(
  value: unknown,
): ProductAccountReadiness {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidContract()
  }
  if (value.state === 'ready') {
    if (!isExactObject(value, ['state'])) throw invalidContract()
    return { state: 'ready' }
  }
  if (
    (value.state !== 'not_ready' && value.state !== 'unavailable') ||
    !isExactObject(value, ['displayMessage', 'state']) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidContract()
  }
  return { state: value.state, displayMessage: value.displayMessage }
}

function decodeProductSettledHistory(value: unknown): ProductSettledHistory {
  if (
    !isExactObject(value, [
      'assignments',
      'modelingRuns',
      'statePatches',
      'userConfirmations',
    ]) ||
    !Array.isArray(value.assignments) ||
    !Array.isArray(value.statePatches) ||
    !Array.isArray(value.userConfirmations) ||
    !Array.isArray(value.modelingRuns)
  ) {
    throw invalidContract()
  }
  return {
    assignments: value.assignments.map(decodeProductAssignment),
    statePatches: value.statePatches.map(decodeProductSettledStatePatch),
    userConfirmations: value.userConfirmations.map(
      decodeProductUserConfirmation,
    ),
    modelingRuns: value.modelingRuns.map(decodeProductSettledModelingRun),
  }
}

function decodeProductAssignment(value: unknown): ProductAssignment {
  if (
    !isExactObject(value, [
      'courseId',
      'dueAt',
      'evidence',
      'id',
      'submissionMethod',
      'title',
    ]) ||
    !isAssignmentId(value.id) ||
    !isCourseId(value.courseId) ||
    !isNonEmptyString(value.title) ||
    !isNonEmptyString(value.dueAt) ||
    !isNonEmptyString(value.submissionMethod) ||
    !Array.isArray(value.evidence)
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    title: value.title,
    dueAt: value.dueAt,
    submissionMethod: value.submissionMethod,
    evidence: value.evidence.map(decodeProductEvidenceRef),
  }
}

function decodeProductEvidenceRef(value: unknown): ProductEvidenceRef {
  if (
    !isExactObject(value, ['digest', 'field', 'materialId', 'quote']) ||
    !isAssignmentField(value.field) ||
    !isMaterialId(value.materialId) ||
    !isDigest(value.digest) ||
    typeof value.quote !== 'string'
  ) {
    throw invalidContract()
  }
  return {
    field: value.field,
    materialId: value.materialId,
    digest: value.digest,
    quote: value.quote,
  }
}

function decodeProductSettledStatePatch(
  value: unknown,
): ProductSettledStatePatch {
  if (
    !isExactObject(value, [
      'applyOutcome',
      'baseRevision',
      'courseId',
      'createdAt',
      'id',
      'status',
    ]) ||
    !isPatchId(value.id) ||
    !isCourseId(value.courseId) ||
    !isRevision(value.baseRevision) ||
    (value.status !== 'superseded' &&
      value.status !== 'applied' &&
      value.status !== 'rejected' &&
      value.status !== 'interrupted') ||
    !isTimestamp(value.createdAt)
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    baseRevision: value.baseRevision,
    status: value.status,
    createdAt: value.createdAt,
    applyOutcome: decodeProductApplyOutcome(value.applyOutcome),
  }
}

function decodeProductApplyOutcome(
  value: unknown,
): ProductSettledStatePatch['applyOutcome'] {
  if (value === null) return null
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw invalidContract()
  }
  if (
    value.type === 'applied' &&
    isExactObject(value, ['assignmentId', 'resultingRevision', 'type']) &&
    isAssignmentId(value.assignmentId) &&
    isRevision(value.resultingRevision)
  ) {
    return {
      type: 'applied',
      assignmentId: value.assignmentId,
      resultingRevision: value.resultingRevision,
    }
  }
  if (
    value.type === 'not_applied' &&
    isExactObject(value, ['revision', 'type']) &&
    isRevision(value.revision)
  ) {
    return { type: 'not_applied', revision: value.revision }
  }
  throw invalidContract()
}

function decodeProductUserConfirmation(
  value: unknown,
): ProductUserConfirmation {
  if (
    !isExactObject(value, [
      'assignmentId',
      'decision',
      'id',
      'outcome',
      'patchId',
      'resultingRevision',
      'settledAt',
    ]) ||
    !isConfirmationId(value.id) ||
    !isPatchId(value.patchId) ||
    (value.decision !== 'accepted' && value.decision !== 'rejected') ||
    !isTimestamp(value.settledAt) ||
    (value.assignmentId !== null && !isAssignmentId(value.assignmentId)) ||
    (value.resultingRevision !== null &&
      !isRevision(value.resultingRevision)) ||
    (value.outcome !== 'applied' && value.outcome !== 'not_applied')
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    patchId: value.patchId,
    decision: value.decision,
    settledAt: value.settledAt,
    assignmentId: value.assignmentId,
    resultingRevision: value.resultingRevision,
    outcome: value.outcome,
  }
}

function decodeProductSettledModelingRun(
  value: unknown,
): ProductSettledModelingRun {
  if (
    !isExactObject(value, [
      'actionId',
      'courseId',
      'createdAt',
      'id',
      'recipe',
      'recovery',
      'retryOfRunId',
      'settledAt',
      'sources',
      'status',
      'updatedAt',
      'validationOutcome',
    ]) ||
    !isRunId(value.id) ||
    !isActionId(value.actionId) ||
    !isCourseId(value.courseId) ||
    !isRecipe(value.recipe) ||
    !Array.isArray(value.sources) ||
    !value.sources.every(isModelingSource) ||
    (value.retryOfRunId !== null && !isRunId(value.retryOfRunId)) ||
    value.retryOfRunId === value.id ||
    (value.recovery !== null &&
      !isProductOperationRecovery(value.recovery)) ||
    !isSettledRunStatus(value.status) ||
    !isValidationOutcome(value.validationOutcome) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isTimestamp(value.settledAt)
  ) {
    throw invalidContract()
  }
  if (
    value.recovery !== null &&
    (value.recovery.outcome === 'interrupted' ||
      value.recovery.outcome === 'unknown') &&
    value.recovery.outcome !== value.status
  ) {
    throw invalidContract()
  }
  return {
    id: value.id,
    actionId: value.actionId,
    courseId: value.courseId,
    recipe: value.recipe,
    sources: value.sources,
    retryOfRunId: value.retryOfRunId,
    recovery: value.recovery,
    status: value.status,
    validationOutcome: value.validationOutcome,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    settledAt: value.settledAt,
  }
}

function decodeProductRawMaterial(value: unknown): ProductRawMaterial {
  if (
    !isExactObject(value, [
      'digest',
      'id',
      'mediaType',
      'relativePath',
      'size',
    ]) ||
    !hasValidMaterialMetadata(value, 'id')
  ) {
    throw invalidContract()
  }
  return {
    id: value.id as string,
    relativePath: value.relativePath as string,
    digest: value.digest as string,
    mediaType: 'text/plain; charset=utf-8',
    size: value.size as number,
  }
}

function isRecipe(
  value: unknown,
): value is ProductSettledModelingRun['recipe'] {
  return (
    isExactObject(value, ['name', 'requestedSkillName', 'version']) &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.version) &&
    isNonEmptyString(value.requestedSkillName)
  )
}

function isModelingSource(
  value: unknown,
): value is ProductSettledModelingRun['sources'][number] {
  return (
    isExactObject(value, ['digest', 'materialId']) &&
    isMaterialId(value.materialId) &&
    isDigest(value.digest)
  )
}

function isSettledRunStatus(
  value: unknown,
): value is ProductSettledModelingRun['status'] {
  return (
    value === 'not_accepted' ||
    value === 'completed' ||
    value === 'failed' ||
    value === 'interrupted' ||
    value === 'unknown'
  )
}

function hasValidMaterialMetadata(
  value: Record<string, unknown>,
  idKey: 'id' | 'materialId',
): boolean {
  return (
    isMaterialId(value[idKey]) &&
    typeof value.relativePath === 'string' &&
    isSafeRelativePath(value.relativePath) &&
    isDigest(value.digest) &&
    value.mediaType === 'text/plain; charset=utf-8' &&
    Number.isSafeInteger(value.size) &&
    Number(value.size) >= 0
  )
}

function isCourseOrNull(
  value: unknown,
): value is ReadyProductWorkspace['course'] {
  return (
    value === null ||
    (isExactObject(value, ['displayName', 'id']) &&
      isCourseId(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
  )
}

function isConfirmationId(value: unknown): value is string {
  return typeof value === 'string' && /^confirmation_[0-9a-f]{32}$/.test(value)
}

function isActionId(value: unknown): value is string {
  return typeof value === 'string' && /^action_[0-9a-f]{32}$/.test(value)
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function isSafeRelativePath(value: string): boolean {
  return (
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('../') &&
    value !== '..' &&
    !value.includes('\\') &&
    !value.split('/').includes('..')
  )
}
