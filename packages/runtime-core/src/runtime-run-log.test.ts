import assert from 'node:assert/strict'
import test from 'node:test'
import {
  parseRuntimeRunLog,
  type RuntimeRunLog,
  type RuntimeRunStartedEvent,
} from './index.js'

const runId = '11111111-1111-4111-8111-111111111111'
const adapter = 'test'
const startedAt = '2026-07-10T01:00:00.000Z'
const completedAt = '2026-07-10T01:01:00.000Z'

test('parseRuntimeRunLog preserves normalized lifecycle validation', async (t) => {
  const missingStarted = createStartedLog()
  missingStarted.events = [
    {
      type: 'output_delta',
      sequence: 1,
      runId,
      adapter,
      timestamp: startedAt,
      delta: 'unexpected',
    },
  ]

  const nonConsecutive = createCompletedLog()
  const completedEvent = nonConsecutive.events[1]

  if (completedEvent) {
    completedEvent.sequence = 3
  }

  const repeatedStarted = createStartedLog()
  repeatedStarted.events.push(createStartedEvent(2))

  const repeatedCancelling = createStartedLog()
  repeatedCancelling.status = 'cancelling'
  repeatedCancelling.events.push(
    {
      type: 'cancelling',
      sequence: 2,
      runId,
      adapter,
      timestamp: completedAt,
      reason: 'first request',
    },
    {
      type: 'cancelling',
      sequence: 3,
      runId,
      adapter,
      timestamp: completedAt,
      reason: 'second request',
    },
  )

  const afterTerminal = createCompletedLog()
  afterTerminal.events.push({
    type: 'output_delta',
    sequence: 3,
    runId,
    adapter,
    timestamp: completedAt,
    delta: 'too late',
  })

  const completedOutputMismatch = createCompletedLog()
  completedOutputMismatch.output = 'different output'

  const failedErrorMismatch = createStartedLog()
  failedErrorMismatch.status = 'failed'
  failedErrorMismatch.error = 'persisted error'
  failedErrorMismatch.events.push({
    type: 'failed',
    sequence: 2,
    runId,
    adapter,
    timestamp: completedAt,
    error: 'event error',
  })

  const cases: Array<{
    name: string
    log: RuntimeRunLog
    expected: RegExp
  }> = [
    {
      name: 'started must be first',
      log: missingStarted,
      expected: /events must begin with started/,
    },
    {
      name: 'sequences must be consecutive',
      log: nonConsecutive,
      expected: /event sequence must be consecutive/,
    },
    {
      name: 'started cannot repeat',
      log: repeatedStarted,
      expected: /started event may only appear first/,
    },
    {
      name: 'cancelling cannot repeat',
      log: repeatedCancelling,
      expected: /cancelling event may only appear once/,
    },
    {
      name: 'events cannot follow a terminal event',
      log: afterTerminal,
      expected: /events cannot continue after terminal/,
    },
    {
      name: 'completed output must match',
      log: completedOutputMismatch,
      expected: /completed event output must match log output/,
    },
    {
      name: 'failed error must match',
      log: failedErrorMismatch,
      expected: /failed event error must match log error/,
    },
  ]

  for (const entry of cases) {
    await t.test(entry.name, () => {
      assert.throws(() => parseRuntimeRunLog(entry.log), entry.expected)
    })
  }
})

test('parseRuntimeRunLog accepts output and terminal transitions while cancelling', () => {
  const log = createStartedLog()
  log.status = 'cancelled'
  log.output = 'late output'
  log.events.push(
    {
      type: 'cancelling',
      sequence: 2,
      runId,
      adapter,
      timestamp: completedAt,
      reason: 'request',
    },
    {
      type: 'output_delta',
      sequence: 3,
      runId,
      adapter,
      timestamp: completedAt,
      delta: 'late output',
    },
    {
      type: 'cancelled',
      sequence: 4,
      runId,
      adapter,
      timestamp: completedAt,
      reason: 'confirmed',
    },
  )

  assert.deepEqual(parseRuntimeRunLog(log), log)
})

test('parseRuntimeRunLog remains compatible with legacy cancelled and failed logs without completedAt', () => {
  const cancelledLog = createStartedLog()
  cancelledLog.status = 'cancelled'
  cancelledLog.events.push({
    type: 'cancelled',
    sequence: 2,
    runId,
    adapter,
    timestamp: completedAt,
    reason: 'legacy cancellation',
  })
  const failedLog = createStartedLog()
  failedLog.status = 'failed'
  failedLog.error = 'legacy failure'
  failedLog.events.push({
    type: 'failed',
    sequence: 2,
    runId,
    adapter,
    timestamp: completedAt,
    error: 'legacy failure',
  })

  assert.deepEqual(parseRuntimeRunLog(cancelledLog), cancelledLog)
  assert.deepEqual(parseRuntimeRunLog(failedLog), failedLog)
})

function createStartedLog(): RuntimeRunLog {
  return {
    runId,
    adapter,
    prompt: 'validate me',
    status: 'running',
    output: '',
    events: [createStartedEvent(1)],
    startedAt,
  }
}

function createCompletedLog(): RuntimeRunLog {
  const log = createStartedLog()

  return {
    ...log,
    status: 'completed',
    output: 'done',
    events: [
      ...log.events,
      {
        type: 'completed',
        sequence: 2,
        runId,
        adapter,
        timestamp: completedAt,
        output: 'done',
      },
    ],
    completedAt,
  }
}

function createStartedEvent(sequence: number): RuntimeRunStartedEvent {
  return {
    type: 'started',
    sequence,
    runId,
    adapter,
    timestamp: startedAt,
    prompt: 'validate me',
  }
}
