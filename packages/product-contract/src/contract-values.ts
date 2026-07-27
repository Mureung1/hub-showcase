export const PRODUCT_JSON_ENVELOPE_MAX_BYTES = 16 * 1024

export class ProductContractError extends TypeError {
  constructor() {
    super('The product contract value is invalid.')
    this.name = 'ProductContractError'
  }
}

export function isProductMaterialId(value: unknown): value is string {
  return isMaterialId(value)
}

export function isProductDigest(value: unknown): value is string {
  return isDigest(value)
}

export function isProductPatchId(value: unknown): value is string {
  return isPatchId(value)
}

export function isProductDecisionKey(value: unknown): value is string {
  return isDecisionKey(value)
}

export function isProductOperationId(value: unknown): value is string {
  return (
    typeof value === 'string' && /^(?:action|chat)_[0-9a-f]{32}$/.test(value)
  )
}

export function isTargetProductOperationId(value: unknown): value is string {
  return (
    typeof value === 'string' && /^operation_[0-9a-f]{32}$/.test(value)
  )
}

export function isProductWorkspaceId(value: unknown): value is string {
  return (
    typeof value === 'string' && /^workspace_[0-9a-f]{32}$/.test(value)
  )
}

export function isProductInteractionId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    utf8Bytes(value) <= 256
  )
}

export function isProductQuestionId(value: unknown): value is string {
  return typeof value === 'string' && /^question_[0-9a-f]{32}$/.test(value)
}

export function isMaterialId(value: unknown): value is string {
  return typeof value === 'string' && /^material_[0-9a-f]{32}$/.test(value)
}

export function isCourseId(value: unknown): value is string {
  return typeof value === 'string' && /^course_[0-9a-f]{32}$/.test(value)
}

export function isAssignmentId(value: unknown): value is string {
  return typeof value === 'string' && /^assignment_[0-9a-f]{32}$/.test(value)
}

export function isPatchId(value: unknown): value is string {
  return typeof value === 'string' && /^patch_[0-9a-f]{32}$/.test(value)
}

export function isRunId(value: unknown): value is string {
  return typeof value === 'string' && /^run_[0-9a-f]{32}$/.test(value)
}

export function isDecisionKey(value: unknown): value is string {
  return typeof value === 'string' && /^decision_[0-9a-f]{32}$/.test(value)
}

export function isDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

export function isRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function isAssignmentField(
  value: unknown,
): value is 'title' | 'dueAt' | 'submissionMethod' {
  return (
    value === 'title' || value === 'dueAt' || value === 'submissionMethod'
  )
}

export function isValidationOutcome(
  value: unknown,
): value is 'passed' | 'failed' | 'unknown' {
  return value === 'passed' || value === 'failed' || value === 'unknown'
}

export function hasValidJsonEnvelope(value: unknown): boolean {
  try {
    return utf8Bytes(JSON.stringify(value)) <= PRODUCT_JSON_ENVELOPE_MAX_BYTES
  } catch {
    return false
  }
}

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}

export function invalidContract(): ProductContractError {
  return new ProductContractError()
}

export function isExactObject(
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
