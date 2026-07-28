export const PROPOSE_STATE_PATCH_REQUEST_MAX_BYTES = 1024 * 1024
export const INTERACTION_BROKER_BODY_MAX_BYTES = 2 * 1024 * 1024
export const INTERACTION_SAFE_MESSAGE_MAX_BYTES = 2 * 1024

export class InteractionContractError extends TypeError {
  constructor() {
    super('The interaction contract value is invalid.')
    this.name = 'InteractionContractError'
  }
}

export function invalidContract(): InteractionContractError {
  return new InteractionContractError()
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

export function hasJsonByteBound(value: unknown, maximumBytes: number): boolean {
  try {
    return utf8Bytes(JSON.stringify(value)) <= maximumBytes
  } catch {
    return false
  }
}

export function isBoundedString(
  value: unknown,
  maximumBytes: number,
): value is string {
  return typeof value === 'string' && utf8Bytes(value) <= maximumBytes
}

export function isTrimmedNonEmptyBoundedString(
  value: unknown,
  maximumBytes: number,
): value is string {
  return (
    isBoundedString(value, maximumBytes) &&
    value.trim().length > 0
  )
}

export function utf8Bytes(value: string): number {
  return new TextEncoder().encode(value).byteLength
}
