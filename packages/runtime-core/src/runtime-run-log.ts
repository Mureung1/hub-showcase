import type {
  RuntimeRunDebugLogEntry,
  RuntimeRunEvent,
  RuntimeRunLog,
  RuntimeRunStatus,
} from './index.js'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const runtimeRunStatuses = new Set<RuntimeRunStatus>([
  'running',
  'cancelling',
  'completed',
  'cancelled',
  'failed',
])

export function parseRuntimeRunLog(value: unknown): RuntimeRunLog {
  assertRecord(value, 'log')
  assertAllowedKeys(
    value,
    ['runId', 'adapter', 'prompt', 'status', 'output', 'events', 'startedAt'],
    ['error', 'debugLog', 'completedAt'],
    'log',
  )
  assertUuid(value.runId, 'log runId')
  assertString(value.adapter, 'log adapter')
  assertString(value.prompt, 'log prompt')
  assertRuntimeRunStatus(value.status)
  assertString(value.output, 'log output')
  assertIsoTimestamp(value.startedAt, 'log startedAt')

  const runId = value.runId
  const adapter = value.adapter
  const prompt = value.prompt
  const status = value.status
  const output = value.output
  const startedAt = value.startedAt

  if (value.error !== undefined) {
    assertString(value.error, 'log error')
  }

  if (value.completedAt !== undefined) {
    assertIsoTimestamp(value.completedAt, 'log completedAt')
  }

  if (!Array.isArray(value.events) || value.events.length === 0) {
    throw new Error('log events must be a non-empty array')
  }

  const events = value.events.map((event, index) =>
    parseRuntimeRunEvent(event, {
      adapter,
      expectedSequence: index + 1,
      runId,
    }),
  )

  if (events[0]?.type !== 'started') {
    throw new Error('log events must begin with started')
  }

  if (events[0].prompt !== prompt) {
    throw new Error('started event prompt must match log prompt')
  }

  assertStatusMatchesEvents(
    {
      completedAt: value.completedAt,
      error: value.error,
      output,
      status,
    },
    events,
  )

  let debugLog: RuntimeRunDebugLogEntry[] | undefined

  if (value.debugLog !== undefined) {
    if (!Array.isArray(value.debugLog)) {
      throw new Error('log debugLog must be an array')
    }

    debugLog = value.debugLog.map(parseRuntimeRunDebugLogEntry)
  }

  return {
    runId,
    adapter,
    prompt,
    status,
    output,
    ...(value.error === undefined ? {} : { error: value.error }),
    events,
    ...(debugLog === undefined ? {} : { debugLog }),
    startedAt,
    ...(value.completedAt === undefined
      ? {}
      : { completedAt: value.completedAt }),
  }
}

export function compareRuntimeRunLogs(
  left: RuntimeRunLog,
  right: RuntimeRunLog,
): number {
  const startedAtComparison = left.startedAt.localeCompare(right.startedAt)

  if (startedAtComparison !== 0) {
    return startedAtComparison
  }

  return left.runId.localeCompare(right.runId)
}

export function isTerminalRuntimeRunStatus(
  status: RuntimeRunStatus,
): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'failed'
}

function parseRuntimeRunEvent(
  value: unknown,
  expected: {
    adapter: string
    expectedSequence: number
    runId: string
  },
): RuntimeRunEvent {
  assertRecord(value, `event ${expected.expectedSequence}`)
  assertString(value.type, `event ${expected.expectedSequence} type`)

  const detailKey = eventDetailKey(value.type)
  assertExactKeys(
    value,
    ['type', 'sequence', 'runId', 'adapter', 'timestamp', detailKey],
    `event ${expected.expectedSequence}`,
  )

  if (value.sequence !== expected.expectedSequence) {
    throw new Error(
      `event sequence must be consecutive at ${expected.expectedSequence}`,
    )
  }

  if (value.runId !== expected.runId) {
    throw new Error(`event ${expected.expectedSequence} runId must match log`)
  }

  if (value.adapter !== expected.adapter) {
    throw new Error(`event ${expected.expectedSequence} adapter must match log`)
  }

  assertIsoTimestamp(
    value.timestamp,
    `event ${expected.expectedSequence} timestamp`,
  )
  assertString(
    value[detailKey],
    `event ${expected.expectedSequence} ${detailKey}`,
  )

  return value as RuntimeRunEvent
}

function parseRuntimeRunDebugLogEntry(
  value: unknown,
  index: number,
): RuntimeRunDebugLogEntry {
  const label = `debugLog entry ${index + 1}`
  assertRecord(value, label)
  assertAllowedKeys(
    value,
    ['timestamp', 'source', 'kind'],
    ['raw', 'message', 'data'],
    label,
  )
  assertIsoTimestamp(value.timestamp, `${label} timestamp`)
  assertString(value.source, `${label} source`)
  assertString(value.kind, `${label} kind`)

  if (value.raw !== undefined) {
    assertString(value.raw, `${label} raw`)
  }

  if (value.message !== undefined) {
    assertString(value.message, `${label} message`)
  }

  if (value.data !== undefined) {
    assertRecord(value.data, `${label} data`)
  }

  return value as RuntimeRunDebugLogEntry
}

function assertStatusMatchesEvents(
  log: Record<string, unknown> & {
    completedAt?: unknown
    error?: unknown
    output: string
    status: RuntimeRunStatus
  },
  events: RuntimeRunEvent[],
): void {
  let observedStatus: RuntimeRunStatus = 'running'

  for (const event of events.slice(1)) {
    if (isTerminalRuntimeRunStatus(observedStatus)) {
      throw new Error('log events cannot continue after terminal')
    }

    if (event.type === 'started') {
      throw new Error('started event may only appear first')
    }

    if (event.type === 'output_delta') {
      continue
    }

    if (event.type === 'cancelling') {
      if (observedStatus !== 'running') {
        throw new Error('cancelling event may only appear once')
      }

      observedStatus = 'cancelling'
      continue
    }

    observedStatus = event.type
  }

  if (observedStatus !== log.status) {
    throw new Error(
      `log status ${log.status} does not match event status ${observedStatus}`,
    )
  }

  const lastEvent = events.at(-1)

  if (log.status === 'running') {
    return
  }

  if (log.status === 'cancelling') {
    return
  }

  if (log.status === 'completed') {
    if (lastEvent?.type !== 'completed') {
      throw new Error('completed log must end with completed event')
    }

    if (lastEvent.output !== log.output) {
      throw new Error('completed event output must match log output')
    }

    if (log.completedAt === undefined) {
      throw new Error('completed log must include completedAt')
    }
  }

  if (log.status === 'failed') {
    if (lastEvent?.type !== 'failed') {
      throw new Error('failed log must end with failed event')
    }

    if (lastEvent.error !== log.error) {
      throw new Error('failed event error must match log error')
    }
  }
}

function eventDetailKey(
  type: string,
): 'prompt' | 'delta' | 'reason' | 'output' | 'error' {
  if (type === 'started') {
    return 'prompt'
  }

  if (type === 'output_delta') {
    return 'delta'
  }

  if (type === 'cancelling' || type === 'cancelled') {
    return 'reason'
  }

  if (type === 'completed') {
    return 'output'
  }

  if (type === 'failed') {
    return 'error'
  }

  throw new Error(`unsupported runtime event type: ${type}`)
}

function assertRuntimeRunStatus(
  value: unknown,
): asserts value is RuntimeRunStatus {
  if (
    typeof value !== 'string' ||
    !runtimeRunStatuses.has(value as RuntimeRunStatus)
  ) {
    throw new Error(`unsupported runtime run status: ${String(value)}`)
  }
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: string[],
  label: string,
): void {
  assertAllowedKeys(value, keys, [], label)
}

function assertAllowedKeys(
  value: Record<string, unknown>,
  requiredKeys: string[],
  optionalKeys: string[],
  label: string,
): void {
  const allowedKeys = new Set([...requiredKeys, ...optionalKeys])

  for (const requiredKey of requiredKeys) {
    if (!(requiredKey in value)) {
      throw new Error(`${label} is missing ${requiredKey}`)
    }
  }

  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) {
      throw new Error(`${label} contains unexpected field ${key}`)
    }
  }
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`)
  }
}

function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(`${label} must be a string`)
  }
}

function assertIsoTimestamp(
  value: unknown,
  label: string,
): asserts value is string {
  assertString(value, label)

  const parsedTime = new Date(value)

  if (Number.isNaN(parsedTime.getTime()) || parsedTime.toISOString() !== value) {
    throw new Error(`${label} must be an ISO 8601 UTC timestamp`)
  }
}

function assertUuid(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) {
    throw new Error(`${label} must be a UUID`)
  }
}
