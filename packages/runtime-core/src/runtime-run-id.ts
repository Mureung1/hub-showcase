const runtimeRunIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isRuntimeRunId(value: unknown): value is string {
  return typeof value === 'string' && runtimeRunIdPattern.test(value)
}

export function parseRuntimeRunId(
  value: unknown,
  label = 'runtime run ID',
): string {
  if (!isRuntimeRunId(value)) {
    throw new Error(`${label} must be a UUID`)
  }

  return value
}
