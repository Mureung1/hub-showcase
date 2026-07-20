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
  readonly workspace: ProductWorkspace | null
  readonly history: ProductSettledHistory
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

export class ProductApiError extends Error {
  readonly code: string
  readonly displayMessage: string

  constructor(code: string, displayMessage: string) {
    super(displayMessage)
    this.name = 'ProductApiError'
    this.code = code
    this.displayMessage = displayMessage
  }
}

export async function fetchProductBootstrap(
  signal?: AbortSignal,
): Promise<ProductBootstrap> {
  const response = await fetch('/api/product/bootstrap', {
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await toProductApiError(response)
  const value = await parseJson(response)
  if (!isExactObject(value, ['accountReadiness', 'history', 'workspace'])) {
    throw invalidResponse()
  }
  return {
    accountReadiness: parseAccountReadiness(value.accountReadiness),
    workspace:
      value.workspace === null ? null : parseWorkspace(value.workspace),
    history: parseSettledHistory(value.history),
  }
}

export async function activateProductWorkspace(
  signal?: AbortSignal,
): Promise<ProductWorkspace | null> {
  const value = await postJson('/api/product/workspaces/activate', {}, signal)
  if (!isExactObject(value, ['status', 'workspace'])) throw invalidResponse()
  if (value.status !== 'activated' && value.status !== 'cancelled') {
    throw invalidResponse()
  }
  return value.workspace === null ? null : parseWorkspace(value.workspace)
}

export async function createProductCourse(
  displayName: string,
  signal?: AbortSignal,
): Promise<ReadyProductWorkspace> {
  const value = await postJson(
    '/api/product/courses',
    { displayName },
    signal,
  )
  if (!isExactObject(value, ['workspace'])) throw invalidResponse()
  const workspace = parseWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidResponse()
  return workspace
}

export async function refreshProductMaterials(
  signal?: AbortSignal,
): Promise<ReadyProductWorkspace> {
  const value = await postJson('/api/product/materials/refresh', {}, signal)
  if (!isExactObject(value, ['workspace'])) throw invalidResponse()
  const workspace = parseWorkspace(value.workspace)
  if (workspace.state !== 'ready') throw invalidResponse()
  return workspace
}

export async function fetchProductMaterialPreview(
  material: Pick<ProductRawMaterial, 'id' | 'digest'>,
  signal?: AbortSignal,
): Promise<ProductMaterialPreview> {
  const response = await fetch(
    `/api/product/materials/${encodeURIComponent(material.id)}/preview?digest=${encodeURIComponent(material.digest)}`,
    { headers: { accept: 'application/json' }, signal },
  )
  if (!response.ok) throw await toProductApiError(response)
  return parsePreview(await parseJson(response))
}

async function postJson(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })
  if (!response.ok) throw await toProductApiError(response)
  return parseJson(response)
}

function parseWorkspace(value: unknown): ProductWorkspace {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidResponse()
  }
  if (value.state === 'incompatible') {
    if (
      !isExactObject(value, [
        'displayMessage',
        'readOnly',
        'state',
      ]) ||
      value.readOnly !== true ||
      typeof value.displayMessage !== 'string' ||
      value.displayMessage.length === 0
    ) {
      throw invalidResponse()
    }
    return value as unknown as IncompatibleProductWorkspace
  }
  if (
    value.state !== 'ready' ||
    !isExactObject(value, [
      'confirmedRevision',
      'course',
      'materials',
      'state',
    ]) ||
    !Number.isSafeInteger(value.confirmedRevision) ||
    Number(value.confirmedRevision) < 0 ||
    !isCourseOrNull(value.course) ||
    !Array.isArray(value.materials)
  ) {
    throw invalidResponse()
  }
  return {
    state: 'ready',
    confirmedRevision: Number(value.confirmedRevision),
    course: value.course,
    materials: value.materials.map(parseMaterial),
  }
}

function parseAccountReadiness(value: unknown): ProductAccountReadiness {
  if (!isRecord(value) || typeof value.state !== 'string') {
    throw invalidResponse()
  }
  if (value.state === 'ready') {
    if (!isExactObject(value, ['state'])) throw invalidResponse()
    return { state: 'ready' }
  }
  if (
    (value.state !== 'not_ready' && value.state !== 'unavailable') ||
    !isExactObject(value, ['displayMessage', 'state']) ||
    !isNonEmptyString(value.displayMessage)
  ) {
    throw invalidResponse()
  }
  return {
    state: value.state,
    displayMessage: value.displayMessage,
  }
}

function parseSettledHistory(value: unknown): ProductSettledHistory {
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
    throw invalidResponse()
  }
  return {
    assignments: value.assignments.map(parseAssignment),
    statePatches: value.statePatches.map(parseSettledStatePatch),
    userConfirmations: value.userConfirmations.map(parseUserConfirmation),
    modelingRuns: value.modelingRuns.map(parseSettledModelingRun),
  }
}

function parseAssignment(value: unknown): ProductAssignment {
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
    throw invalidResponse()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    title: value.title,
    dueAt: value.dueAt,
    submissionMethod: value.submissionMethod,
    evidence: value.evidence.map(parseEvidence),
  }
}

function parseEvidence(value: unknown): ProductEvidenceRef {
  if (
    !isExactObject(value, ['digest', 'field', 'materialId', 'quote']) ||
    (value.field !== 'title' &&
      value.field !== 'dueAt' &&
      value.field !== 'submissionMethod') ||
    !isMaterialId(value.materialId) ||
    !isDigest(value.digest) ||
    typeof value.quote !== 'string'
  ) {
    throw invalidResponse()
  }
  return value as unknown as ProductEvidenceRef
}

function parseSettledStatePatch(value: unknown): ProductSettledStatePatch {
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
    throw invalidResponse()
  }
  return {
    id: value.id,
    courseId: value.courseId,
    baseRevision: value.baseRevision,
    status: value.status,
    createdAt: value.createdAt,
    applyOutcome: parseApplyOutcome(value.applyOutcome),
  }
}

function parseApplyOutcome(
  value: unknown,
): ProductSettledStatePatch['applyOutcome'] {
  if (value === null) return null
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw invalidResponse()
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
  throw invalidResponse()
}

function parseUserConfirmation(value: unknown): ProductUserConfirmation {
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
    throw invalidResponse()
  }
  return value as unknown as ProductUserConfirmation
}

function parseSettledModelingRun(value: unknown): ProductSettledModelingRun {
  if (
    !isExactObject(value, [
      'actionId',
      'courseId',
      'createdAt',
      'id',
      'recipe',
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
    !isSettledRunStatus(value.status) ||
    !isValidationOutcome(value.validationOutcome) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt) ||
    !isTimestamp(value.settledAt)
  ) {
    throw invalidResponse()
  }
  return value as unknown as ProductSettledModelingRun
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

function isValidationOutcome(
  value: unknown,
): value is ProductSettledModelingRun['validationOutcome'] {
  return (
    value === 'passed' ||
    value === 'failed' ||
    value === 'unknown'
  )
}

function parseMaterial(value: unknown): ProductRawMaterial {
  if (
    !isExactObject(value, ['digest', 'id', 'mediaType', 'relativePath', 'size']) ||
    !hasValidMaterialMetadata(value, 'id')
  ) {
    throw invalidResponse()
  }
  return value as unknown as ProductRawMaterial
}

function parsePreview(value: unknown): ProductMaterialPreview {
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
    throw invalidResponse()
  }
  return value as unknown as ProductMaterialPreview
}

function hasValidMaterialMetadata(
  value: Record<string, unknown>,
  idKey: 'id' | 'materialId',
): boolean {
  return (
    typeof value[idKey] === 'string' &&
    /^material_[0-9a-f]{32}$/.test(value[idKey]) &&
    typeof value.relativePath === 'string' &&
    isSafeRelativePath(value.relativePath) &&
    typeof value.digest === 'string' &&
    /^[0-9a-f]{64}$/.test(value.digest) &&
    value.mediaType === 'text/plain; charset=utf-8' &&
    Number.isSafeInteger(value.size) &&
    Number(value.size) >= 0
  )
}

function isMaterialId(value: unknown): value is string {
  return typeof value === 'string' && /^material_[0-9a-f]{32}$/.test(value)
}

function isCourseId(value: unknown): value is string {
  return typeof value === 'string' && /^course_[0-9a-f]{32}$/.test(value)
}

function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && /^assignment_[0-9a-f]{32}$/.test(value)
}

function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

function isConfirmationId(value: unknown): value is string {
  return typeof value === 'string' && /^confirmation_[0-9a-f]{32}$/.test(value)
}

function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^run_[0-9a-f]{32}$/.test(value)
}

function isActionId(value: unknown): value is string {
  return typeof value === 'string' && /^action_[0-9a-f]{32}$/.test(value)
}

function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

function isTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Number.isFinite(Date.parse(value))
  )
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isCourseOrNull(
  value: unknown,
): value is ReadyProductWorkspace['course'] {
  return (
    value === null ||
    (isExactObject(value, ['displayName', 'id']) &&
      typeof value.id === 'string' &&
      /^course_[0-9a-f]{32}$/.test(value.id) &&
      typeof value.displayName === 'string' &&
      value.displayName.trim().length > 0)
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

async function parseJson(response: Response): Promise<unknown> {
  try {
    return JSON.parse(await response.text()) as unknown
  } catch {
    throw invalidResponse()
  }
}

async function toProductApiError(response: Response): Promise<ProductApiError> {
  try {
    const value = await parseJson(response)
    if (
      !isExactObject(value, ['code', 'displayMessage']) ||
      typeof value.code !== 'string' ||
      value.code.length === 0 ||
      typeof value.displayMessage !== 'string' ||
      value.displayMessage.length === 0
    ) {
      throw new TypeError()
    }
    return new ProductApiError(value.code, value.displayMessage)
  } catch {
    return new ProductApiError(
      'request_failed',
      '학기 작업공간 응답을 확인하지 못했습니다.',
    )
  }
}

function invalidResponse(): ProductApiError {
  return new ProductApiError(
    'invalid_response',
    '학기 작업공간 응답을 확인하지 못했습니다.',
  )
}

function isExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (!isRecord(value)) return false
  const actual = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return (
    actual.length === expected.length &&
    actual.every((key, index) => key === expected[index])
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
