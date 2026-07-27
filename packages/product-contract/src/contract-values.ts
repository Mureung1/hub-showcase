export const PRODUCT_JSON_ENVELOPE_MAX_BYTES = 16 * 1024

export class ProductContractError extends TypeError {
  constructor() {
    super('The product contract value is invalid.')
    this.name = 'ProductContractError'
  }
}

export function isProductOperationId(value: unknown): value is string {
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

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
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
