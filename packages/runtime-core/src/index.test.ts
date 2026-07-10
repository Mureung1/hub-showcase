import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  isRuntimeRunId,
  parseRuntimeRunId,
  type AgentRuntimeAdapter,
  type RuntimeAdapterEvent,
  type RuntimeAdapterRunInput,
  type RuntimeRunLog,
  type RuntimeRunLogPersistence,
} from './index.js'
import { InMemoryRuntimeRunLogPersistence } from './testing/index.js'

class HappyPathAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    yield { type: 'output_delta', delta: `Echo: ${input.prompt}` }
    yield { type: 'completed' }
  }
}

class HangingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield { type: 'output_delta', delta: 'late output' }
    yield { type: 'completed' }
  }
}

class FailingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    throw new Error('Adapter exploded')
  }
}

class DebugLogAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-09T00:00:00.000Z',
          source: 'server',
          kind: 'notification',
          message: 'observed raw notification',
          data: { method: 'turn/completed' },
        },
      ],
    }
    yield { type: 'completed' }
  }
}

class CancelDebugLogAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)

    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-09T00:00:00.000Z',
          source: 'client',
          kind: 'stdin',
          message: 'interrupt sent after cancellation',
          data: { method: 'turn/interrupt' },
        },
      ],
    }
    yield { type: 'completed' }
  }
}

class AdapterConfirmedCancelAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield { type: 'cancelled', reason: 'Adapter confirmed cancellation' }
  }
}

class AdapterConfirmedCancelFailureAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield { type: 'failed', error: 'Adapter cancellation failed' }
  }
}

class AdapterConfirmedCancelWithoutTerminalAdapter
  implements AgentRuntimeAdapter
{
  readonly name = 'test'
  readonly cancellationMode = 'adapter_confirmed'

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
  }
}

class ObservedStartAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  startedAfterDurableSnapshot = false

  constructor(private readonly isStartedSnapshotDurable: () => boolean) {}

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    this.startedAfterDurableSnapshot = this.isStartedSnapshotDurable()
    yield { type: 'completed' }
  }
}

class OutputAndDebugAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-10T01:00:00.000Z',
          source: 'test-runtime',
          kind: 'evidence',
          message: 'terminal evidence',
        },
      ],
    }
    yield { type: 'output_delta', delta: 'durable output' }
    yield { type: 'completed' }
  }
}

class CompletionRaceAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly completionStarted: Promise<void>

  private readonly allowCompletionDeferred = createDeferred<void>()
  private readonly completionStartedDeferred = createDeferred<void>()

  constructor() {
    this.completionStarted = this.completionStartedDeferred.promise
  }

  async *run(): AsyncIterable<RuntimeAdapterEvent> {
    await this.allowCompletionDeferred.promise
    this.completionStartedDeferred.resolve()
    yield { type: 'completed' }
  }

  allowCompletion(): void {
    this.allowCompletionDeferred.resolve()
  }
}

class GatedRuntimeRunLogPersistence implements RuntimeRunLogPersistence {
  readonly persistedStatuses: string[] = []
  readonly blockedSaveStarted: Promise<void>

  private readonly logs = new Map<string, RuntimeRunLog>()
  private readonly blockedSaveStartedDeferred = createDeferred<void>()
  private readonly releaseBlockedSaveDeferred = createDeferred<void>()
  private saveCount = 0

  constructor(private readonly blockedSaveNumber: number) {
    this.blockedSaveStarted = this.blockedSaveStartedDeferred.promise
  }

  async load(): Promise<RuntimeRunLog[]> {
    return [...this.logs.values()].map(cloneTestLog)
  }

  async save(log: RuntimeRunLog): Promise<{ removedRunIds: string[] }> {
    this.saveCount += 1

    if (this.saveCount === this.blockedSaveNumber) {
      this.blockedSaveStartedDeferred.resolve()
      await this.releaseBlockedSaveDeferred.promise
    }

    this.logs.set(log.runId, cloneTestLog(log))
    this.persistedStatuses.push(log.status)

    return { removedRunIds: [] }
  }

  async remove(runId: string): Promise<void> {
    this.logs.delete(runId)
  }

  releaseBlockedSave(): void {
    this.releaseBlockedSaveDeferred.resolve()
  }
}

test('AgentRuntimeKernel hydrates persisted logs before exposing a ready instance', async () => {
  const olderRun = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'older',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const newerRun = createCompletedLog({
    runId: '22222222-2222-4222-8222-222222222222',
    prompt: 'newer',
    startedAt: '2026-07-10T00:01:00.000Z',
  })
  const persistence = new InMemoryRuntimeRunLogPersistence([
    newerRun,
    olderRun,
  ])

  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HappyPathAdapter()],
    persistence,
  })

  assert.deepEqual(
    kernel.listRuns().map((run) => run.runId),
    [newerRun.runId, olderRun.runId],
  )
  assert.deepEqual(kernel.getRunLog(olderRun.runId), olderRun)
})

test('AgentRuntimeKernel avoids hydrated UUID collisions when starting a run', async () => {
  const hydratedRun = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'hydrated',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const generatedIds = [
    hydratedRun.runId,
    '22222222-2222-4222-8222-222222222222',
  ]
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HappyPathAdapter()],
    generateRunId: () => generatedIds.shift() ?? hydratedRun.runId,
    now: () => new Date('2026-07-10T00:02:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence([hydratedRun]),
  })

  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'new run',
  })
  await kernel.waitForRun(startedRun.runId)

  assert.equal(startedRun.runId, '22222222-2222-4222-8222-222222222222')
  assert.equal(kernel.getRunLog(hydratedRun.runId)?.prompt, 'hydrated')
  assert.equal(kernel.listRuns().length, 2)
})

test('isRuntimeRunId recognizes the shared runtime run ID invariant', () => {
  const validRunId = '11111111-1111-4111-8111-111111111111'

  assert.equal(parseRuntimeRunId(validRunId), validRunId)
  assert.equal(
    isRuntimeRunId(validRunId),
    true,
  )
  assert.equal(
    isRuntimeRunId('AAAAAAAA-AAAA-5AAA-BAAA-AAAAAAAAAAAA'),
    true,
  )
  assert.equal(
    isRuntimeRunId('11111111-1111-0111-8111-111111111111'),
    false,
  )
  assert.equal(
    isRuntimeRunId('11111111-1111-4111-7111-111111111111'),
    false,
  )
  assert.equal(isRuntimeRunId('not-a-uuid'), false)
  assert.equal(isRuntimeRunId(undefined), false)
  assert.throws(
    () => parseRuntimeRunId('not-a-uuid'),
    /runtime run ID must be a UUID/,
  )
})

test('AgentRuntimeKernel rejects an invalid generated run ID before save or adapter execution', async () => {
  let adapterRunCount = 0
  let saveCount = 0
  const adapter: AgentRuntimeAdapter = {
    name: 'test',
    async *run(): AsyncIterable<RuntimeAdapterEvent> {
      adapterRunCount += 1
      yield { type: 'completed' }
    },
  }
  const persistence: RuntimeRunLogPersistence = {
    async load() {
      return []
    },
    async save() {
      saveCount += 1
      return { removedRunIds: [] }
    },
    async remove() {},
  }
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    generateRunId: () => 'not-a-uuid',
    persistence,
  })

  await assert.rejects(
    kernel.startRun({ adapter: 'test', prompt: 'must not run' }),
    /generated runtime run ID must be a UUID/i,
  )

  assert.equal(adapterRunCount, 0)
  assert.equal(saveCount, 0)
  assert.deepEqual(kernel.listRuns(), [])
})

test('AgentRuntimeKernel saves a started snapshot before invoking the adapter', async () => {
  const persistence = new GatedRuntimeRunLogPersistence(1)
  const adapter = new ObservedStartAdapter(
    () => persistence.persistedStatuses[0] === 'running',
  )
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    persistence,
  })

  const startPromise = kernel.startRun({
    adapter: 'test',
    prompt: 'persist before adapter',
  })

  await persistence.blockedSaveStarted
  assert.equal(adapter.startedAfterDurableSnapshot, false)
  assert.deepEqual(await persistence.load(), [])

  persistence.releaseBlockedSave()
  const startedRun = await startPromise
  await kernel.waitForRun(startedRun.runId)

  assert.equal(adapter.startedAfterDurableSnapshot, true)
  assert.deepEqual(persistence.persistedStatuses, ['running', 'completed'])
})

test('AgentRuntimeKernel saves completed output and debug evidence before publishing terminal state', async () => {
  const persistence = new GatedRuntimeRunLogPersistence(2)
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new OutputAndDebugAdapter()],
    now: () => new Date('2026-07-10T01:00:00.000Z'),
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'persist terminal evidence',
  })
  const publishedEventTypes: string[] = []
  let completedPublishedAfterSave = false

  kernel.subscribeToRun(startedRun.runId, 0, (event) => {
    publishedEventTypes.push(event.type)

    if (event.type === 'completed') {
      completedPublishedAfterSave =
        persistence.persistedStatuses.at(-1) === 'completed'
    }
  })

  let waiterResolved = false
  const terminalPromise = kernel.waitForRun(startedRun.runId).then((log) => {
    waiterResolved = true
    return log
  })

  await persistence.blockedSaveStarted
  assert.equal(kernel.getRunLog(startedRun.runId)?.status, 'running')
  assert.equal(publishedEventTypes.includes('completed'), false)
  assert.equal(waiterResolved, false)

  persistence.releaseBlockedSave()
  const completedRun = await terminalPromise
  const [persistedRun] = await persistence.load()

  assert.equal(completedPublishedAfterSave, true)
  assert.equal(completedRun.status, 'completed')
  assert.equal(persistedRun?.output, 'durable output')
  assert.deepEqual(persistedRun?.debugLog, [
    {
      timestamp: '2026-07-10T01:00:00.000Z',
      source: 'test-runtime',
      kind: 'evidence',
      message: 'terminal evidence',
    },
  ])
  assert.deepEqual(
    persistedRun?.events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )
})

test('AgentRuntimeKernel serializes cancellation against adapter completion', async () => {
  const persistence = new GatedRuntimeRunLogPersistence(2)
  const adapter = new CompletionRaceAdapter()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'cancel before completion wins',
  })
  const cancellationPromise = kernel.cancelRun(startedRun.runId)

  await persistence.blockedSaveStarted
  adapter.allowCompletion()
  await adapter.completionStarted
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.deepEqual(persistence.persistedStatuses, ['running'])

  persistence.releaseBlockedSave()
  const cancelledRun = await cancellationPromise
  const waitedRun = await kernel.waitForRun(startedRun.runId)
  const [persistedRun] = await persistence.load()

  assert.equal(cancelledRun?.status, 'cancelled')
  assert.equal(waitedRun.status, 'cancelled')
  assert.equal(kernel.getRunLog(startedRun.runId)?.status, 'cancelled')
  assert.equal(persistedRun?.status, 'cancelled')
  assert.deepEqual(
    waitedRun.events.map((event) => event.type),
    ['started', 'cancelled'],
  )
})

test('AgentRuntimeKernel creates UUID run IDs by default', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HappyPathAdapter()],
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'uuid run',
  })

  assert.equal(isRuntimeRunId(startedRun.runId), true)
})

test('AgentRuntimeKernel records a completed run lifecycle and log', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HappyPathAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '정리해줘',
  })
  const completedLog = await kernel.waitForRun(startedLog.runId)
  const events = completedLog.events

  assert.deepEqual(
    events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )

  assert.equal(events[0]?.sequence, 1)
  assert.equal(events[1]?.sequence, 2)
  assert.equal(events[2]?.sequence, 3)
  assert.equal(events[0]?.runId, events[1]?.runId)
  assert.equal(events[1]?.runId, events[2]?.runId)

  const runId = startedLog.runId
  const log = kernel.getRunLog(runId)
  const history = kernel.listRuns()

  assert.equal(log?.prompt, '정리해줘')
  assert.equal(log?.status, 'completed')
  assert.equal(log?.output, 'Echo: 정리해줘')
  assert.deepEqual(
    log?.events.map((event) => event.type),
    ['started', 'output_delta', 'completed'],
  )
  assert.deepEqual(history, [
    {
      adapter: 'test',
      completedAt: '2026-07-09T00:00:00.000Z',
      error: undefined,
      outputPreview: 'Echo: 정리해줘',
      prompt: '정리해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'completed',
    },
  ])
})

test('AgentRuntimeKernel records a cancelled run lifecycle and log', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HangingAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '멈춰줘',
  })
  const cancelledLog = await kernel.cancelRun(startedLog.runId)
  const waitedLog = await kernel.waitForRun(startedLog.runId)
  const runId = startedLog.runId

  assert.equal(cancelledLog?.status, 'cancelled')
  assert.equal(waitedLog.status, 'cancelled')
  assert.deepEqual(
    waitedLog.events.map((event) => event.type),
    ['started', 'cancelled'],
  )
  assert.equal(waitedLog.events[1]?.sequence, 2)

  const cancelledEvent = waitedLog.events[1]
  assert.equal(cancelledEvent?.type, 'cancelled')

  if (cancelledEvent?.type === 'cancelled') {
    assert.equal(cancelledEvent.reason, 'Runtime run cancelled')
  }

  assert.deepEqual(kernel.listRuns(), [
    {
      adapter: 'test',
      completedAt: undefined,
      error: undefined,
      outputPreview: '',
      prompt: '멈춰줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'cancelled',
    },
  ])
})

test('AgentRuntimeKernel records a failed run lifecycle and log', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new FailingAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '실패해줘',
  })
  const failedLog = await kernel.waitForRun(startedLog.runId)
  const runId = startedLog.runId

  assert.equal(failedLog.status, 'failed')
  assert.equal(failedLog.error, 'Adapter exploded')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )

  const failedEvent = failedLog.events[1]
  assert.equal(failedEvent?.type, 'failed')

  if (failedEvent?.type === 'failed') {
    assert.equal(failedEvent.error, 'Adapter exploded')
  }

  assert.deepEqual(kernel.listRuns(), [
    {
      adapter: 'test',
      completedAt: undefined,
      error: 'Adapter exploded',
      outputPreview: '',
      prompt: '실패해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'failed',
    },
  ])
})

test('AgentRuntimeKernel records adapter debug log entries outside normalized events', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new DebugLogAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '관측해줘',
  })
  const completedLog = await kernel.waitForRun(startedLog.runId)

  assert.deepEqual(
    completedLog.events.map((event) => event.type),
    ['started', 'completed'],
  )
  assert.deepEqual(completedLog.debugLog, [
    {
      timestamp: '2026-07-09T00:00:00.000Z',
      source: 'server',
      kind: 'notification',
      message: 'observed raw notification',
      data: { method: 'turn/completed' },
    },
  ])
})

test('AgentRuntimeKernel retains debug log entries yielded after cancellation', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new CancelDebugLogAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '멈춰줘',
  })
  const cancelledLog = await kernel.cancelRun(startedLog.runId)
  const logWithDebug = await waitForRunLog(
    () => kernel.getRunLog(startedLog.runId),
    (log) => (log.debugLog?.length ?? 0) > 0,
  )

  assert.equal(cancelledLog?.status, 'cancelled')
  assert.equal(logWithDebug.status, 'cancelled')
  assert.deepEqual(
    logWithDebug.events.map((event) => event.type),
    ['started', 'cancelled'],
  )
  assert.deepEqual(logWithDebug.debugLog, [
    {
      timestamp: '2026-07-09T00:00:00.000Z',
      source: 'client',
      kind: 'stdin',
      message: 'interrupt sent after cancellation',
      data: { method: 'turn/interrupt' },
    },
  ])
})

test('AgentRuntimeKernel supports adapter-confirmed cancellation', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new AdapterConfirmedCancelAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '멈춰줘',
  })
  const cancellingLog = await kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'cancelled')
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'cancelled'],
  )

  const cancellingEvent = terminalLog.events[1]
  assert.equal(cancellingEvent?.type, 'cancelling')

  if (cancellingEvent?.type === 'cancelling') {
    assert.equal(cancellingEvent.reason, 'Runtime run cancellation requested')
  }
})

test('AgentRuntimeKernel records adapter-confirmed cancellation failure', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new AdapterConfirmedCancelFailureAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '멈춰줘',
  })
  const cancellingLog = await kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'failed')
  assert.equal(terminalLog.error, 'Adapter cancellation failed')
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'failed'],
  )
})

test('AgentRuntimeKernel fails adapter-confirmed cancellation without terminal confirmation', async () => {
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new AdapterConfirmedCancelWithoutTerminalAdapter()],
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence: new InMemoryRuntimeRunLogPersistence(),
  })

  const startedLog = await kernel.startRun({
    adapter: 'test',
    prompt: '멈춰줘',
  })
  const cancellingLog = await kernel.cancelRun(startedLog.runId)
  const terminalLog = await kernel.waitForRun(startedLog.runId)

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.equal(terminalLog.status, 'failed')
  assert.equal(
    terminalLog.error,
    'Runtime run cancellation was not confirmed by adapter',
  )
  assert.deepEqual(
    terminalLog.events.map((event) => event.type),
    ['started', 'cancelling', 'failed'],
  )
})

function createCompletedLog(input: {
  runId: string
  prompt: string
  startedAt: string
}): RuntimeRunLog {
  const completedAt = new Date(
    new Date(input.startedAt).getTime() + 1_000,
  ).toISOString()

  return {
    runId: input.runId,
    adapter: 'test',
    prompt: input.prompt,
    status: 'completed',
    output: `Echo: ${input.prompt}`,
    events: [
      {
        type: 'started',
        sequence: 1,
        runId: input.runId,
        adapter: 'test',
        timestamp: input.startedAt,
        prompt: input.prompt,
      },
      {
        type: 'completed',
        sequence: 2,
        runId: input.runId,
        adapter: 'test',
        timestamp: completedAt,
        output: `Echo: ${input.prompt}`,
      },
    ],
    startedAt: input.startedAt,
    completedAt,
  }
}

function cloneTestLog(log: RuntimeRunLog): RuntimeRunLog {
  return structuredClone(log)
}

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
} {
  let resolvePromise: (value: T) => void = () => {}
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })

  return {
    promise,
    resolve: resolvePromise,
  }
}

async function waitForRunLog(
  getLog: () => ReturnType<AgentRuntimeKernel['getRunLog']>,
  predicate: (log: NonNullable<ReturnType<AgentRuntimeKernel['getRunLog']>>) => boolean,
): Promise<NonNullable<ReturnType<AgentRuntimeKernel['getRunLog']>>> {
  const deadline = Date.now() + 500

  while (Date.now() < deadline) {
    const log = getLog()

    if (log && predicate(log)) {
      return log
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail('expected run log condition was not observed')
}

async function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return
  }

  await new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}
