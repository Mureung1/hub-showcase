import path from 'node:path'

import { SemesterWorkspaceError } from './semester-workspace-error.js'
import type {
  Assignment,
  AssignmentField,
  AssignmentUpsert,
  EvidenceRef,
  ModelingRun,
  ModelingRunRecoveryOutcome,
  ModelingRunSource,
  RawMaterial,
  StatePatch,
  StatePatchApplyOutcome,
  StatePatchStatus,
} from './semester-workspace.js'

export const materialMediaType = 'text/plain; charset=utf-8'
export const materialFileMaxBytes = 1024 * 1024
export const proposalSummaryMaxBytes = 2 * 1024
export const assignmentTextMaxBytes = 1024
export const evidenceQuoteMaxBytes = 16 * 1024
export const proposalEvidenceMax = 64
export const actionMetadataMaxBytes = 512
export const actionPathMaxBytes = 16 * 1024

const assignmentFields = [
  'title',
  'dueAt',
  'submissionMethod',
] as const satisfies readonly AssignmentField[]

export type CanonicalStatePatchPayload = {
  readonly requestKey: string
  readonly workspaceId: string
  readonly courseId: string
  readonly baseRevision: number
  readonly summary: string
  readonly changes: AssignmentUpsert
  readonly evidence: readonly EvidenceRef[]
  readonly origin?: string
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

export function cloneAssignment(assignment: Assignment): Assignment {
  return {
    ...assignment,
    evidence: assignment.evidence.map(cloneEvidenceRef),
  }
}

export function cloneAssignmentUpsert(
  changes: AssignmentUpsert,
): AssignmentUpsert {
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

export function cloneEvidenceRef(evidence: EvidenceRef): EvidenceRef {
  return {
    field: evidence.field,
    rawMaterialId: evidence.rawMaterialId,
    digest: evidence.digest,
    quote: evidence.quote,
  }
}

export function cloneStatePatch(patch: StatePatch): StatePatch {
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

export function cloneModelingRun(run: ModelingRun): ModelingRun {
  return {
    ...run,
    sourceBaseline: run.sourceBaseline.map((source) => ({ ...source })),
    ...(run.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...run.nativeCorrelation } }),
    ...(run.recoveryOutcome === undefined
      ? {}
      : { recoveryOutcome: { ...run.recoveryOutcome } }),
  }
}

export function cloneExecutionGuard(guard: ExecutionGuard): ExecutionGuard {
  return {
    ...guard,
    materials: guard.materials.map((material) => ({ ...material })),
    selectedMaterials: guard.selectedMaterials.map((source) => ({ ...source })),
    ...(guard.nativeCorrelation === undefined
      ? {}
      : { nativeCorrelation: { ...guard.nativeCorrelation } }),
  }
}

export function normalizeStatePatchPayload(
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

export function compareEvidence(
  left: EvidenceRef,
  right: EvidenceRef,
): number {
  return (
    compareLexically(left.field, right.field) ||
    compareLexically(left.rawMaterialId, right.rawMaterialId) ||
    compareLexically(left.digest, right.digest) ||
    compareLexically(left.quote, right.quote)
  )
}

export function isSafeMaterialRelativePath(relativePath: string): boolean {
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

export function isExactAssignmentUpsert(
  value: unknown,
): value is AssignmentUpsert {
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

export function isEvidenceArray(
  value: unknown,
): value is readonly EvidenceRef[] {
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

export function isStatePatchApplyOutcome(
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

export function isStatePatchStatus(value: unknown): value is StatePatchStatus {
  return (
    value === 'pending' ||
    value === 'superseded' ||
    value === 'applied' ||
    value === 'rejected' ||
    value === 'interrupted'
  )
}

export function isBoundedMeaningfulText(
  value: unknown,
  maxBytes: number,
): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    Buffer.byteLength(value, 'utf8') <= maxBytes
  )
}

export function isModelingRunSourceBaseline(
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

export function isNativeCorrelation(value: unknown): value is {
  readonly threadId: string
  readonly turnId: string
} {
  return (
    isExactRecord(value, ['threadId', 'turnId']) &&
    isOpaqueRuntimeIdentity(value.threadId) &&
    isOpaqueRuntimeIdentity(value.turnId)
  )
}

export function isModelingRunStatus(
  value: unknown,
): value is ModelingRun['status'] {
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

export function isModelingRunValidationOutcome(
  value: unknown,
): value is ModelingRun['validationOutcome'] {
  return (
    value === 'pending' ||
    value === 'passed' ||
    value === 'failed' ||
    value === 'unknown'
  )
}

export function isModelingRunRecoveryOutcome(
  value: unknown,
): value is ModelingRunRecoveryOutcome {
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

export function isSha256Digest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

export function isSafeFailureCode(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]{0,127}$/.test(value)
}

export function isSafeSkillName(value: unknown): value is string {
  return typeof value === 'string' && /^[a-z0-9][a-z0-9_-]{0,127}$/.test(value)
}

export function isSafeAbsoluteActionPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    path.isAbsolute(value) &&
    Buffer.byteLength(value, 'utf8') <= actionPathMaxBytes
  )
}

export function isWorkspaceId(value: unknown): value is string {
  return typeof value === 'string' && /^workspace_[0-9a-f]{32}$/.test(value)
}

export function isActionId(value: unknown): value is string {
  return typeof value === 'string' && /^action_[0-9a-f]{32}$/.test(value)
}

export function isChatOperationId(value: unknown): value is string {
  return typeof value === 'string' && /^chat_[0-9a-f]{32}$/.test(value)
}

export function isProductOperationId(value: unknown): value is string {
  return isActionId(value) || isChatOperationId(value)
}

export function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^run_[0-9a-f]{32}$/.test(value)
}

export function isCourseId(value: unknown): value is string {
  return typeof value === 'string' && /^course_[0-9a-f]{32}$/.test(value)
}

export function isMaterialId(value: unknown): value is string {
  return typeof value === 'string' && /^material_[0-9a-f]{32}$/.test(value)
}

export function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && /^assignment_[0-9a-f]{32}$/.test(value)
}

export function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

export function isProposalKey(value: unknown): value is string {
  return typeof value === 'string' && /^proposal_[0-9a-f]{32}$/.test(value)
}

export function isDecisionKey(value: unknown): value is string {
  return typeof value === 'string' && /^decision_[0-9a-f]{32}$/.test(value)
}

export function isConfirmationId(value: unknown): value is string {
  return typeof value === 'string' && /^confirmation_[0-9a-f]{32}$/.test(value)
}

export function isOpaqueRuntimeIdentity(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    Buffer.byteLength(value, 'utf8') <= 512
  )
}

export function isIsoInstant(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  )
}

export function isExactRecord(
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function hasErrnoCode(error: unknown, code: string): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === code
  )
}

export function invalidWorkspaceStore(): SemesterWorkspaceError {
  return new SemesterWorkspaceError(
    'store_invalid',
    'SemesterWorkspace state has an invalid format.',
  )
}

function compareLexically(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function isAssignmentField(value: unknown): value is AssignmentField {
  return assignmentFields.some((field) => field === value)
}

export function isExplicitOffsetRfc3339(value: unknown): value is string {
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
