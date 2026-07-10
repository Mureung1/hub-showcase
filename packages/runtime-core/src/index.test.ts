import assert from 'node:assert/strict'
import test from 'node:test'
import {
  AgentRuntimeKernel,
  RuntimePersistenceUnavailableError,
  isRuntimeRunId,
  isTerminalRuntimeRunStatus,
  parseRuntimeRunId,
  type AgentRuntimeAdapter,
  type RuntimeCheckpointScheduler,
  type RuntimeAdapterEvent,
  type RuntimeAdapterRunInput,
  type RuntimeRunEvent,
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

class GatedFailingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  readonly started: Promise<AbortSignal>

  private readonly startedDeferred = createDeferred<AbortSignal>()
  private readonly throwDeferred = createDeferred<void>()

  constructor() {
    this.started = this.startedDeferred.promise
  }

  async *run(
    input: RuntimeAdapterRunInput,
  ): AsyncIterable<RuntimeAdapterEvent> {
    this.startedDeferred.resolve(input.signal)
    await this.throwDeferred.promise
    throw new Error('Adapter exploded')
  }

  explode(): void {
    this.throwDeferred.resolve()
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

class InvocationCountingAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'
  runCount = 0

  run(): AsyncIterable<RuntimeAdapterEvent> {
    this.runCount += 1

    return {
      async *[Symbol.asyncIterator]() {},
    }
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

class PushRuntimeAdapter implements AgentRuntimeAdapter {
  readonly name = 'test'

  private readonly streams = new Map<
    string,
    {
      events: RuntimeAdapterEvent[]
      nextEvent?: (event: RuntimeAdapterEvent) => void
    }
  >()

  run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    const stream = {
      events: [],
    } as {
      events: RuntimeAdapterEvent[]
      nextEvent?: (event: RuntimeAdapterEvent) => void
    }

    this.streams.set(input.runId, stream)

    return {
      [Symbol.asyncIterator]: () => ({
        next: async () => {
          const queuedEvent = stream.events.shift()

          if (queuedEvent) {
            return { done: false, value: queuedEvent }
          }

          return new Promise<IteratorResult<RuntimeAdapterEvent>>((resolve) => {
            stream.nextEvent = (event) => {
              delete stream.nextEvent
              resolve({ done: false, value: event })
            }
          })
        },
      }),
    }
  }

  push(runId: string, event: RuntimeAdapterEvent): void {
    const stream = this.streams.get(runId)

    if (!stream) {
      throw new Error(`Runtime stream is not ready: ${runId}`)
    }

    if (stream.nextEvent) {
      stream.nextEvent(event)
      return
    }

    stream.events.push(event)
  }
}

class AdapterConfirmedPushRuntimeAdapter extends PushRuntimeAdapter {
  readonly cancellationMode = 'adapter_confirmed'
}

class AbortObservingPushRuntimeAdapter extends PushRuntimeAdapter {
  readonly aborted: Promise<void>

  private readonly abortedDeferred = createDeferred<void>()

  constructor() {
    super()
    this.aborted = this.abortedDeferred.promise
  }

  override run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    if (input.signal.aborted) {
      this.abortedDeferred.resolve()
    } else {
      input.signal.addEventListener(
        'abort',
        () => this.abortedDeferred.resolve(),
        { once: true },
      )
    }

    return super.run(input)
  }
}

class AbortObservingAdapterConfirmedPushRuntimeAdapter extends AbortObservingPushRuntimeAdapter {
  readonly cancellationMode = 'adapter_confirmed'
}

class PostTerminalDebugAdapter implements AgentRuntimeAdapter {
  readonly name = 'post-terminal'

  private readonly allowFinishDeferred = createDeferred<void>()

  async *run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent> {
    await waitForAbort(input.signal)
    yield {
      type: 'debug_log',
      entries: [
        {
          timestamp: '2026-07-10T01:00:00.000Z',
          source: 'test-runtime',
          kind: 'post_terminal_evidence',
          message: 'evidence received after terminal cancellation',
        },
      ],
    }
    await this.allowFinishDeferred.promise
    yield { type: 'completed' }
  }

  allowFinish(): void {
    this.allowFinishDeferred.resolve()
  }
}

class ManualCheckpointScheduler implements RuntimeCheckpointScheduler {
  readonly scheduledDelays: number[] = []

  private readonly tasks: Array<{
    cancelled: boolean
    task: () => void
  }> = []

  schedule(delayMs: number, task: () => void): () => void {
    const scheduledTask = { cancelled: false, task }

    this.scheduledDelays.push(delayMs)
    this.tasks.push(scheduledTask)

    return () => {
      scheduledTask.cancelled = true
    }
  }

  runNext(): void {
    const taskIndex = this.tasks.findIndex((task) => !task.cancelled)

    if (taskIndex < 0) {
      throw new Error('No checkpoint task is ready')
    }

    const [scheduledTask] = this.tasks.splice(taskIndex, 1)

    scheduledTask?.task()
  }

  runCancelledTasks(): void {
    const cancelledTasks = this.tasks.filter((task) => task.cancelled)
    this.tasks.splice(0, this.tasks.length)

    for (const scheduledTask of cancelledTasks) {
      scheduledTask.task()
    }
  }

  pendingTaskCount(): number {
    return this.tasks.filter((task) => !task.cancelled).length
  }
}

class RecordingRuntimeRunLogPersistence implements RuntimeRunLogPersistence {
  readonly savedLogs: RuntimeRunLog[] = []
  readonly operations: string[] = []

  private readonly logs = new Map<string, RuntimeRunLog>()
  private retentionRemovedRunIds: string[] = []
  private terminalSaveRemovedRunIds: string[] = []
  private removeFailureRunId: string | undefined
  private nextSaveGate:
    | {
        release: Promise<void>
        started: (log: RuntimeRunLog) => void
      }
    | undefined
  private nextRemoveGate:
    | {
        release: Promise<void>
        started: (runId: string) => void
      }
    | undefined

  constructor(initialLogs: RuntimeRunLog[] = []) {
    for (const log of initialLogs) {
      this.logs.set(log.runId, cloneTestLog(log))
    }
  }

  async load(): Promise<RuntimeRunLog[]> {
    this.operations.push('load')
    return [...this.logs.values()].map(cloneTestLog)
  }

  async applyRetention(): Promise<{ removedRunIds: string[] }> {
    this.operations.push('applyRetention')
    const removedRunIds = this.retentionRemovedRunIds
    this.retentionRemovedRunIds = []

    for (const runId of removedRunIds) {
      this.logs.delete(runId)
    }

    return { removedRunIds: [...removedRunIds] }
  }

  async save(log: RuntimeRunLog): Promise<{ removedRunIds: string[] }> {
    this.operations.push(`save:${log.runId}:${log.status}`)
    const saveGate = this.nextSaveGate
    this.nextSaveGate = undefined

    if (saveGate) {
      saveGate.started(cloneTestLog(log))
      await saveGate.release
    }

    const savedLog = cloneTestLog(log)

    this.savedLogs.push(savedLog)
    this.logs.set(log.runId, savedLog)

    const removedRunIds = isTerminalRuntimeRunStatus(log.status)
      ? this.terminalSaveRemovedRunIds
      : []

    if (removedRunIds.length > 0) {
      this.terminalSaveRemovedRunIds = []

      for (const runId of removedRunIds) {
        this.logs.delete(runId)
      }
    }

    return { removedRunIds: [...removedRunIds] }
  }

  async remove(runId: string): Promise<void> {
    this.operations.push(`remove:${runId}`)
    const removeGate = this.nextRemoveGate
    this.nextRemoveGate = undefined

    if (removeGate) {
      removeGate.started(runId)
      await removeGate.release
    }

    if (this.removeFailureRunId === runId) {
      throw new Error(`remove failed for ${runId}`)
    }

    this.logs.delete(runId)
  }

  pruneOnRetention(runIds: string[]): void {
    this.retentionRemovedRunIds = [...runIds]
  }

  pruneOnNextTerminalSave(runIds: string[]): void {
    this.terminalSaveRemovedRunIds = [...runIds]
  }

  failRemove(runId: string): void {
    this.removeFailureRunId = runId
  }

  blockNextSave(): {
    release: () => void
    started: Promise<RuntimeRunLog>
  } {
    const release = createDeferred<void>()
    const started = createDeferred<RuntimeRunLog>()

    this.nextSaveGate = {
      release: release.promise,
      started: started.resolve,
    }

    return {
      release: () => release.resolve(),
      started: started.promise,
    }
  }

  blockNextRemove(): {
    release: () => void
    started: Promise<string>
  } {
    const release = createDeferred<void>()
    const started = createDeferred<string>()

    this.nextRemoveGate = {
      release: release.promise,
      started: started.resolve,
    }

    return {
      release: () => release.resolve(),
      started: started.promise,
    }
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

  async applyRetention(): Promise<{ removedRunIds: string[] }> {
    return { removedRunIds: [] }
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

class FaultInjectingRuntimeRunLogPersistence extends RecordingRuntimeRunLogPersistence {
  private nextSaveFailure: Error | undefined
  private nextSaveFailureGate:
    | {
        failure: Error
        release: Promise<void>
        started: (log: RuntimeRunLog) => void
      }
    | undefined
  private nextRemoveFailure: Error | undefined

  override async save(
    log: RuntimeRunLog,
  ): Promise<{ removedRunIds: string[] }> {
    const failureGate = this.nextSaveFailureGate
    this.nextSaveFailureGate = undefined

    if (failureGate) {
      this.operations.push(`save:${log.runId}:${log.status}`)
      failureGate.started(cloneTestLog(log))
      await failureGate.release
      throw failureGate.failure
    }

    const failure = this.nextSaveFailure
    this.nextSaveFailure = undefined

    if (failure) {
      this.operations.push(`save:${log.runId}:${log.status}`)
      throw failure
    }

    return super.save(log)
  }

  override async remove(runId: string): Promise<void> {
    const failure = this.nextRemoveFailure
    this.nextRemoveFailure = undefined

    if (failure) {
      this.operations.push(`remove:${runId}`)
      throw failure
    }

    await super.remove(runId)
  }

  failNextSave(failure: Error): void {
    this.nextSaveFailure = failure
  }

  blockAndFailNextSave(failure: Error): {
    release: () => void
    started: Promise<RuntimeRunLog>
  } {
    const release = createDeferred<void>()
    const started = createDeferred<RuntimeRunLog>()

    this.nextSaveFailureGate = {
      failure,
      release: release.promise,
      started: started.resolve,
    }

    return {
      release: () => release.resolve(),
      started: started.promise,
    }
  }

  failNextRemove(failure: Error): void {
    this.nextRemoveFailure = failure
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

test('AgentRuntimeKernel recovers interrupted running and cancelling logs without changing terminal history', async () => {
  const recoveredAt = '2026-07-10T03:00:00.000Z'
  const runningLog = createInterruptedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'running before restart',
    startedAt: '2026-07-10T01:00:00.000Z',
    status: 'running',
  })
  const cancellingLog = createInterruptedLog({
    runId: '22222222-2222-4222-8222-222222222222',
    prompt: 'cancelling before restart',
    startedAt: '2026-07-10T01:01:00.000Z',
    status: 'cancelling',
  })
  const terminalLog = createCompletedLog({
    runId: '33333333-3333-4333-8333-333333333333',
    prompt: 'already complete',
    startedAt: '2026-07-10T01:02:00.000Z',
  })
  const persistence = new RecordingRuntimeRunLogPersistence([
    terminalLog,
    cancellingLog,
    runningLog,
  ])
  const adapter = new InvocationCountingAdapter()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    now: () => new Date(recoveredAt),
    persistence,
  })

  assert.equal(adapter.runCount, 0)
  assert.deepEqual(kernel.getRunLog(terminalLog.runId), terminalLog)
  assert.deepEqual(
    persistence.savedLogs.map((log) => log.runId),
    [runningLog.runId, cancellingLog.runId],
  )

  for (const interruptedLog of [runningLog, cancellingLog]) {
    const recoveredLog = kernel.getRunLog(interruptedLog.runId)
    const failedEvent = recoveredLog?.events.at(-1)
    const recoveryDebugEntry = recoveredLog?.debugLog?.at(-1)

    assert.equal(recoveredLog?.status, 'failed')
    assert.equal(
      recoveredLog?.error,
      'Runtime interrupted by server restart',
    )
    assert.equal(recoveredLog?.completedAt, recoveredAt)
    assert.equal(recoveredLog?.prompt, interruptedLog.prompt)
    assert.equal(recoveredLog?.output, interruptedLog.output)
    assert.deepEqual(
      recoveredLog?.events.slice(0, -1),
      interruptedLog.events,
    )
    assert.equal(failedEvent?.type, 'failed')
    assert.equal(failedEvent?.sequence, interruptedLog.events.length + 1)
    assert.equal(failedEvent?.timestamp, recoveredAt)

    if (failedEvent?.type === 'failed') {
      assert.equal(failedEvent.error, 'Runtime interrupted by server restart')
    }

    assert.deepEqual(
      recoveredLog?.debugLog?.slice(0, -1),
      interruptedLog.debugLog,
    )
    assert.deepEqual(recoveryDebugEntry, {
      timestamp: recoveredAt,
      source: 'kernel',
      kind: 'restart_recovery',
      message: 'Runtime interrupted by server restart',
      data: {
        previousStatus: interruptedLog.status,
        recoveryReason: 'Runtime interrupted by server restart',
      },
    })
    assert.deepEqual(
      await kernel.waitForRun(interruptedLog.runId),
      recoveredLog,
    )
  }
})

test('AgentRuntimeKernel does not become ready or invoke adapters before recovery is saved', async () => {
  const interruptedLog = createInterruptedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'wait for recovery save',
    startedAt: '2026-07-10T01:00:00.000Z',
    status: 'running',
  })
  const persistence = new RecordingRuntimeRunLogPersistence([
    interruptedLog,
  ])
  const recoverySaveGate = persistence.blockNextSave()
  const adapter = new InvocationCountingAdapter()
  let factoryResolved = false
  const factoryPromise = AgentRuntimeKernel.create({
    adapters: [adapter],
    now: () => new Date('2026-07-10T03:00:00.000Z'),
    persistence,
  }).then((kernel) => {
    factoryResolved = true
    return kernel
  })
  const recoverySnapshot = await recoverySaveGate.started

  await Promise.resolve()

  assert.equal(recoverySnapshot.status, 'failed')
  assert.equal(factoryResolved, false)
  assert.equal(adapter.runCount, 0)

  recoverySaveGate.release()
  const kernel = await factoryPromise

  assert.equal(factoryResolved, true)
  assert.equal(adapter.runCount, 0)
  assert.equal(kernel.getRunLog(interruptedLog.runId)?.status, 'failed')
  assert.equal((await persistence.load())[0]?.status, 'failed')
})

test('AgentRuntimeKernel applies startup retention after every interrupted run is recovered and removes pruned memory records', async () => {
  const interruptedLog = createInterruptedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'recover before retention',
    startedAt: '2026-07-10T01:00:00.000Z',
    status: 'running',
  })
  const oldTerminalLog = createCompletedLog({
    runId: '22222222-2222-4222-8222-222222222222',
    prompt: 'prune after recovery',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const persistence = new RecordingRuntimeRunLogPersistence([
    interruptedLog,
    oldTerminalLog,
  ])
  persistence.pruneOnRetention([oldTerminalLog.runId])

  const kernel = await AgentRuntimeKernel.create({
    adapters: [new InvocationCountingAdapter()],
    now: () => new Date('2026-07-10T03:00:00.000Z'),
    persistence,
  })

  assert.deepEqual(persistence.operations.slice(0, 3), [
    'load',
    `save:${interruptedLog.runId}:failed`,
    'applyRetention',
  ])
  assert.equal(kernel.getRunLog(oldTerminalLog.runId), undefined)
  assert.equal(kernel.getRunLog(interruptedLog.runId)?.status, 'failed')
  assert.deepEqual(
    kernel.listRuns().map((run) => run.runId),
    [interruptedLog.runId],
  )
})

test('AgentRuntimeKernel synchronizes terminal-save retention before resolving the terminal run', async () => {
  const oldTerminalLog = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'old terminal run',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const persistence = new RecordingRuntimeRunLogPersistence([oldTerminalLog])
  persistence.pruneOnNextTerminalSave([oldTerminalLog.runId])
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new HappyPathAdapter()],
    generateRunId: () => '22222222-2222-4222-8222-222222222222',
    persistence,
  })

  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'new terminal run',
  })
  const terminalRun = await kernel.waitForRun(startedRun.runId)

  assert.equal(terminalRun.status, 'completed')
  assert.equal(kernel.getRunLog(oldTerminalLog.runId), undefined)
  assert.deepEqual(
    kernel.listRuns().map((run) => run.runId),
    [startedRun.runId],
  )
})

test('AgentRuntimeKernel clears the invocation-time terminal snapshot only after disk removal while an active run continues', async () => {
  const terminalLog = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'clear this terminal run',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const activeRunId = '22222222-2222-4222-8222-222222222222'
  const adapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence([terminalLog])
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    generateRunId: () => activeRunId,
    persistence,
  })
  const activeRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'continue through clear',
  })
  const publishedTypes: string[] = []
  kernel.subscribeToRun(activeRun.runId, 1, (event) => {
    publishedTypes.push(event.type)
  })
  const removeGate = persistence.blockNextRemove()
  let clearResolved = false
  const clearPromise = kernel.clearTerminalHistory().then((clearedRunIds) => {
    clearResolved = true
    return clearedRunIds
  })

  assert.equal(await removeGate.started, terminalLog.runId)
  assert.equal(clearResolved, false)
  assert.deepEqual(kernel.getRunLog(terminalLog.runId), terminalLog)

  adapter.push(activeRun.runId, {
    type: 'output_delta',
    delta: 'streamed while clear awaited disk',
  })
  await waitForRunLog(
    () => kernel.getRunLog(activeRun.runId),
    (log) => log.output === 'streamed while clear awaited disk',
  )
  adapter.push(activeRun.runId, { type: 'completed' })
  const terminalActiveRun = await kernel.waitForRun(activeRun.runId)

  assert.equal(terminalActiveRun.status, 'completed')
  assert.deepEqual(publishedTypes, ['output_delta', 'completed'])
  assert.equal(clearResolved, false)

  removeGate.release()
  const clearedRunIds = await clearPromise

  assert.deepEqual(clearedRunIds, [terminalLog.runId])
  assert.equal(kernel.getRunLog(terminalLog.runId), undefined)
  assert.deepEqual(kernel.getRunLog(activeRun.runId), terminalActiveRun)
  assert.deepEqual(
    (await persistence.load()).map((log) => log.runId),
    [activeRun.runId],
  )
  assert.equal(scheduler.pendingTaskCount(), 0)
})

test('AgentRuntimeKernel keeps disk and memory aligned for successful removals before a later clear failure', async () => {
  const firstTerminalLog = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'remove successfully',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const secondTerminalLog = createCompletedLog({
    runId: '22222222-2222-4222-8222-222222222222',
    prompt: 'fail removal',
    startedAt: '2026-07-10T00:01:00.000Z',
  })
  const persistence = new RecordingRuntimeRunLogPersistence([
    firstTerminalLog,
    secondTerminalLog,
  ])
  persistence.failRemove(secondTerminalLog.runId)
  const kernel = await AgentRuntimeKernel.create({
    adapters: [],
    persistence,
  })

  await assert.rejects(
    kernel.clearTerminalHistory(),
    new RegExp(`remove failed for ${secondTerminalLog.runId}`),
  )

  assert.equal(kernel.getRunLog(firstTerminalLog.runId), undefined)
  assert.deepEqual(
    kernel.getRunLog(secondTerminalLog.runId),
    secondTerminalLog,
  )
  assert.deepEqual(
    (await persistence.load()).map((log) => log.runId),
    [secondTerminalLog.runId],
  )
})

test('AgentRuntimeKernel degrades on clear removal failure while preserving reads and unknown lookup semantics', async () => {
  const terminalLog = createCompletedLog({
    runId: '11111111-1111-4111-8111-111111111111',
    prompt: 'preserve after failed clear',
    startedAt: '2026-07-10T00:00:00.000Z',
  })
  const persistence = new FaultInjectingRuntimeRunLogPersistence([
    terminalLog,
  ])
  const storageFailure = new Error('history unlink failed')
  persistence.failNextRemove(storageFailure)
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new InvocationCountingAdapter()],
    persistence,
  })

  await assert.rejects(kernel.clearTerminalHistory(), (error: unknown) => {
    assert.ok(error instanceof RuntimePersistenceUnavailableError)
    assert.equal(error.operation, 'clear_remove')
    assert.equal(error.cause, storageFailure)
    return true
  })

  assert.deepEqual(kernel.getPersistenceState(), {
    status: 'degraded',
    error:
      'Runtime persistence unavailable during clear_remove: history unlink failed',
  })
  assert.deepEqual(kernel.getRunLog(terminalLog.runId), terminalLog)
  assert.deepEqual(kernel.listRuns(), [
    {
      runId: terminalLog.runId,
      adapter: terminalLog.adapter,
      prompt: terminalLog.prompt,
      status: terminalLog.status,
      outputPreview: terminalLog.output,
      error: undefined,
      startedAt: terminalLog.startedAt,
      completedAt: terminalLog.completedAt,
    },
  ])
  assert.equal(kernel.listAdapters().length, 1)
  assert.equal(
    await kernel.cancelRun('22222222-2222-4222-8222-222222222222'),
    undefined,
  )
  await assert.rejects(
    kernel.cancelRun(terminalLog.runId),
    (error: unknown) =>
      error instanceof RuntimePersistenceUnavailableError &&
      error.operation === 'clear_remove',
  )
  await assert.rejects(
    kernel.startRun({ adapter: 'missing', prompt: 'invalid adapter wins' }),
    /Unknown runtime adapter: missing/,
  )
  await assert.rejects(
    kernel.startRun({ adapter: 'test', prompt: 'known adapter is rejected' }),
    (error: unknown) => error instanceof RuntimePersistenceUnavailableError,
  )
  await assert.rejects(
    kernel.clearTerminalHistory(),
    (error: unknown) => error instanceof RuntimePersistenceUnavailableError,
  )
})

test('AgentRuntimeKernel drains a terminal checkpoint before clear and prevents late evidence from recreating it', async () => {
  const adapter = new PostTerminalDebugAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'post-terminal',
    prompt: 'drain before clear',
  })
  await kernel.cancelRun(startedRun.runId)
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => (log.debugLog?.length ?? 0) === 1,
  )

  assert.equal(scheduler.pendingTaskCount(), 1)

  assert.deepEqual(await kernel.clearTerminalHistory(), [startedRun.runId])
  assert.equal(scheduler.pendingTaskCount(), 0)
  assert.equal(
    persistence.savedLogs.some(
      (log) =>
        log.runId === startedRun.runId &&
        log.debugLog?.[0]?.kind === 'post_terminal_evidence',
    ),
    true,
  )

  scheduler.runCancelledTasks()
  adapter.allowFinish()
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.equal(kernel.getRunLog(startedRun.runId), undefined)
  assert.equal(
    (await persistence.load()).some((log) => log.runId === startedRun.runId),
    false,
  )
})

test('AgentRuntimeKernel cancels removed-run checkpoint timers so late terminal evidence cannot recreate history', async () => {
  const adapter = new PostTerminalDebugAdapter()
  const completingAdapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const generatedRunIds = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ]
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter, completingAdapter],
    checkpointScheduler: scheduler,
    generateRunId: () => generatedRunIds.shift() ?? 'invalid',
    persistence,
  })
  const cancelledRun = await kernel.startRun({
    adapter: 'post-terminal',
    prompt: 'receive late debug evidence',
  })
  await kernel.cancelRun(cancelledRun.runId)
  await waitForRunLog(
    () => kernel.getRunLog(cancelledRun.runId),
    (log) => (log.debugLog?.length ?? 0) === 1,
  )

  assert.equal(scheduler.pendingTaskCount(), 1)

  const completingRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'trigger terminal retention',
  })
  persistence.pruneOnNextTerminalSave([cancelledRun.runId])
  completingAdapter.push(completingRun.runId, { type: 'completed' })
  await kernel.waitForRun(completingRun.runId)

  assert.equal(kernel.getRunLog(cancelledRun.runId), undefined)
  assert.equal(scheduler.pendingTaskCount(), 0)

  scheduler.runCancelledTasks()
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.equal(
    (await persistence.load()).some(
      (log) => log.runId === cancelledRun.runId,
    ),
    false,
  )

  adapter.allowFinish()
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
    async applyRetention() {
      return { removedRunIds: [] }
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

test('AgentRuntimeKernel degrades and keeps an initial save failure private', async () => {
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const adapter = new InvocationCountingAdapter()
  const storageFailure = new Error('initial disk write failed')
  persistence.failNextSave(storageFailure)
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    persistence,
  })

  assert.deepEqual(kernel.getPersistenceState(), { status: 'ready' })
  await assert.rejects(
    kernel.startRun({ adapter: 'test', prompt: 'must remain private' }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimePersistenceUnavailableError)
      assert.equal(error.code, 'runtime_persistence_unavailable')
      assert.equal(error.operation, 'initial_save')
      assert.equal(error.causeMessage, storageFailure.message)
      assert.equal(error.cause, storageFailure)
      return true
    },
  )

  assert.equal(adapter.runCount, 0)
  assert.deepEqual(kernel.listRuns(), [])
  assert.deepEqual(kernel.getPersistenceState(), {
    status: 'degraded',
    error:
      'Runtime persistence unavailable during initial_save: initial disk write failed',
  })
  await assert.rejects(
    kernel.startRun({ adapter: 'test', prompt: 'reject while degraded' }),
    (error: unknown) =>
      error instanceof RuntimePersistenceUnavailableError &&
      error.operation === 'initial_save' &&
      error.cause === storageFailure,
  )
  assert.equal(persistence.savedLogs.length, 0)
})

test('AgentRuntimeKernel coalesces rapid streaming evidence without delaying the in-memory view', async () => {
  const adapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'checkpoint quickly',
  })
  const publishedEventTypes: string[] = []

  kernel.subscribeToRun(startedRun.runId, 1, (event) => {
    publishedEventTypes.push(event.type)
  })

  adapter.push(startedRun.runId, {
    type: 'debug_log',
    entries: [
      {
        timestamp: '2026-07-10T01:00:00.000Z',
        source: 'test-runtime',
        kind: 'evidence',
        message: 'checkpoint evidence',
      },
    ],
  })
  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'first ',
  })
  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'second',
  })

  const liveLog = await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'first second',
  )

  assert.equal(persistence.savedLogs.length, 1)
  assert.deepEqual(scheduler.scheduledDelays, [100])
  assert.equal(scheduler.pendingTaskCount(), 1)
  assert.deepEqual(publishedEventTypes, ['output_delta', 'output_delta'])
  assert.deepEqual(
    liveLog.events.map((event) => event.type),
    ['started', 'output_delta', 'output_delta'],
  )
  assert.deepEqual(liveLog.debugLog, [
    {
      timestamp: '2026-07-10T01:00:00.000Z',
      source: 'test-runtime',
      kind: 'evidence',
      message: 'checkpoint evidence',
    },
  ])

  scheduler.runNext()
  await waitForSavedLogCount(persistence, 2)

  const checkpointLog = persistence.savedLogs[1]

  assert.equal(checkpointLog?.status, 'running')
  assert.equal(checkpointLog?.output, 'first second')
  assert.deepEqual(checkpointLog?.events, liveLog.events)
  assert.deepEqual(checkpointLog?.debugLog, liveLog.debugLog)

  adapter.push(startedRun.runId, { type: 'completed' })
  await kernel.waitForRun(startedRun.runId)
})

test('AgentRuntimeKernel checkpoints each fixed window during continuous streaming', async () => {
  const adapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'stream continuously',
  })

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'window one',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'window one',
  )
  scheduler.runNext()
  await waitForSavedLogCount(persistence, 2)

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: ' and two',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'window one and two',
  )

  assert.deepEqual(scheduler.scheduledDelays, [100, 100])
  assert.equal(scheduler.pendingTaskCount(), 1)

  scheduler.runNext()
  await waitForSavedLogCount(persistence, 3)

  assert.deepEqual(
    persistence.savedLogs.slice(1).map((log) => log.output),
    ['window one', 'window one and two'],
  )

  adapter.push(startedRun.runId, { type: 'completed' })
  await kernel.waitForRun(startedRun.runId)
})

test('AgentRuntimeKernel aborts and publishes a non-durable emergency failure when a streaming checkpoint fails', async () => {
  const runId = '11111111-1111-4111-8111-111111111111'
  const adapter = new AbortObservingPushRuntimeAdapter()
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const failureAt = '2026-07-10T02:00:00.000Z'
  const storageFailure = new Error('checkpoint fsync failed')
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    generateRunId: () => runId,
    now: () => new Date(failureAt),
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'stream before storage failure',
  })
  const publishedEvents: RuntimeRunEvent[] = []
  kernel.subscribeToRun(startedRun.runId, 1, (event) => {
    publishedEvents.push(event)
  })

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'partial output',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'partial output',
  )
  persistence.failNextSave(storageFailure)
  scheduler.runNext()

  await adapter.aborted
  const failedLog = await kernel.waitForRun(startedRun.runId)
  const failedEvent = failedLog.events.at(-1)
  const persistenceEntry = failedLog.debugLog?.at(-1)

  assert.equal(failedLog.status, 'failed')
  assert.equal(
    failedLog.error,
    'Runtime persistence unavailable during checkpoint_save: checkpoint fsync failed',
  )
  assert.equal(failedLog.completedAt, failureAt)
  assert.equal(failedLog.output, 'partial output')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'output_delta', 'failed'],
  )
  assert.equal(failedEvent?.sequence, 3)
  assert.deepEqual(persistenceEntry, {
    timestamp: failureAt,
    source: 'kernel',
    kind: 'persistence_error',
    message:
      'Runtime persistence unavailable during checkpoint_save: checkpoint fsync failed',
    data: {
      code: 'runtime_persistence_unavailable',
      operation: 'checkpoint_save',
      cause: storageFailure.message,
      durable: false,
    },
  })
  assert.deepEqual(
    publishedEvents.map((event) => event.type),
    ['output_delta', 'failed'],
  )
  assert.deepEqual(kernel.getPersistenceState(), {
    status: 'degraded',
    error:
      'Runtime persistence unavailable during checkpoint_save: checkpoint fsync failed',
  })
  assert.equal(persistence.savedLogs.length, 1)
  assert.equal(persistence.savedLogs[0]?.status, 'running')
  assert.equal(persistence.savedLogs[0]?.output, '')

  adapter.push(startedRun.runId, { type: 'completed' })
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(kernel.getRunLog(startedRun.runId)?.events.length, 3)
  assert.equal(persistence.savedLogs.length, 1)

  const restartedKernel = await AgentRuntimeKernel.create({
    adapters: [new InvocationCountingAdapter()],
    now: () => new Date('2026-07-10T02:01:00.000Z'),
    persistence,
  })
  const recoveredLog = restartedKernel.getRunLog(runId)

  assert.equal(recoveredLog?.status, 'failed')
  assert.equal(recoveredLog?.error, 'Runtime interrupted by server restart')
  assert.deepEqual(
    recoveredLog?.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.equal(recoveredLog?.debugLog?.at(-1)?.kind, 'restart_recovery')
})

test('AgentRuntimeKernel avoids a checkpoint-worker and terminal-flush deadlock', async () => {
  const adapter = new AbortObservingPushRuntimeAdapter()
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'race checkpoint with terminal flush',
  })

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'partial',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'partial',
  )
  const checkpointFailure = persistence.blockAndFailNextSave(
    new Error('in-flight checkpoint failed'),
  )
  scheduler.runNext()
  await checkpointFailure.started

  adapter.push(startedRun.runId, { type: 'completed' })
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(kernel.getRunLog(startedRun.runId)?.status, 'running')

  checkpointFailure.release()
  const failedLog = await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.status === 'failed',
  )
  await adapter.aborted

  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'output_delta', 'failed'],
  )
  assert.equal(
    failedLog.debugLog?.at(-1)?.data?.operation,
    'checkpoint_save',
  )
  assert.equal(
    failedLog.events.filter((event) => event.type === 'failed').length,
    1,
  )
  assert.deepEqual(await kernel.waitForRun(startedRun.runId), failedLog)
})

test('AgentRuntimeKernel keeps checkpoint ordering independent between runs', async () => {
  const adapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const generatedRunIds = [
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
  ]
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    generateRunId: () => generatedRunIds.shift() ?? 'invalid',
    persistence,
  })
  const firstRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'blocked run',
  })
  const secondRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'independent run',
  })

  adapter.push(firstRun.runId, {
    type: 'output_delta',
    delta: 'blocked output',
  })
  adapter.push(secondRun.runId, {
    type: 'output_delta',
    delta: 'independent output',
  })
  await waitForRunLog(
    () => kernel.getRunLog(secondRun.runId),
    (log) => log.output === 'independent output',
  )

  const firstCheckpointGate = persistence.blockNextSave()
  scheduler.runNext()
  const blockedCheckpoint = await firstCheckpointGate.started

  assert.equal(blockedCheckpoint.runId, firstRun.runId)

  scheduler.runNext()
  await waitForPersistedRun(
    persistence,
    (log) =>
      log.runId === secondRun.runId && log.output === 'independent output',
  )

  assert.equal(
    persistence.savedLogs.some(
      (log) =>
        log.runId === firstRun.runId && log.output === 'blocked output',
    ),
    false,
  )

  firstCheckpointGate.release()
  await waitForPersistedRun(
    persistence,
    (log) => log.runId === firstRun.runId && log.output === 'blocked output',
  )

  adapter.push(firstRun.runId, { type: 'completed' })
  adapter.push(secondRun.runId, { type: 'completed' })
  await Promise.all([
    kernel.waitForRun(firstRun.runId),
    kernel.waitForRun(secondRun.runId),
  ])
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

test('AgentRuntimeKernel drains an in-flight checkpoint and latest evidence before terminal publication', async () => {
  const adapter = new PushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'drain before terminal',
  })

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'first ',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'first ',
  )

  const checkpointGate = persistence.blockNextSave()
  scheduler.runNext()
  const inFlightSnapshot = await checkpointGate.started

  assert.equal(inFlightSnapshot.status, 'running')
  assert.equal(inFlightSnapshot.output, 'first ')

  adapter.push(startedRun.runId, {
    type: 'debug_log',
    entries: [
      {
        timestamp: '2026-07-10T01:00:01.000Z',
        source: 'test-runtime',
        kind: 'evidence',
        message: 'arrived during checkpoint',
      },
    ],
  })
  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'second',
  })

  const liveLog = await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'first second',
  )

  assert.equal(liveLog.status, 'running')
  assert.equal(persistence.savedLogs.length, 1)

  const publishedTerminalTypes: string[] = []
  kernel.subscribeToRun(startedRun.runId, liveLog.events.length, (event) => {
    if (event.type === 'completed') {
      publishedTerminalTypes.push(event.type)
    }
  })

  adapter.push(startedRun.runId, { type: 'completed' })

  let waiterResolved = false
  const terminalPromise = kernel.waitForRun(startedRun.runId).then((log) => {
    waiterResolved = true
    return log
  })

  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.equal(waiterResolved, false)
  assert.deepEqual(publishedTerminalTypes, [])

  checkpointGate.release()
  const terminalLog = await terminalPromise
  const [persistedLog] = await persistence.load()

  assert.equal(terminalLog.status, 'completed')
  assert.equal(terminalLog.output, 'first second')
  assert.deepEqual(publishedTerminalTypes, ['completed'])
  assert.equal(persistedLog?.status, 'completed')
  assert.equal(persistedLog?.output, 'first second')
  assert.deepEqual(
    persistence.savedLogs.map((log) => ({
      output: log.output,
      status: log.status,
    })),
    [
      { output: '', status: 'running' },
      { output: 'first ', status: 'running' },
      { output: 'first second', status: 'running' },
      { output: 'first second', status: 'completed' },
    ],
  )
  assert.equal(scheduler.pendingTaskCount(), 0)

  const saveCountAfterTerminal = persistence.savedLogs.length

  scheduler.runCancelledTasks()
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.equal(persistence.savedLogs.length, saveCountAfterTerminal)
  assert.equal((await persistence.load())[0]?.status, 'completed')
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

test('AgentRuntimeKernel fails in memory without publishing cancelling when the cancelling save fails', async () => {
  const adapter = new AbortObservingAdapterConfirmedPushRuntimeAdapter()
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const storageFailure = new Error('cancelling snapshot failed')
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    now: () => new Date('2026-07-10T03:00:00.000Z'),
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'cancel durably',
  })
  const publishedEventTypes: string[] = []
  kernel.subscribeToRun(startedRun.runId, 1, (event) => {
    publishedEventTypes.push(event.type)
  })
  persistence.failNextSave(storageFailure)

  await assert.rejects(kernel.cancelRun(startedRun.runId), (error: unknown) => {
    assert.ok(error instanceof RuntimePersistenceUnavailableError)
    assert.equal(error.operation, 'cancelling_save')
    assert.equal(error.cause, storageFailure)
    return true
  })
  await adapter.aborted
  const failedLog = await kernel.waitForRun(startedRun.runId)

  assert.equal(failedLog.status, 'failed')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.equal(failedLog.debugLog?.at(-1)?.kind, 'persistence_error')
  assert.equal(
    failedLog.debugLog?.at(-1)?.data?.operation,
    'cancelling_save',
  )
  assert.deepEqual(publishedEventTypes, ['failed'])
  assert.deepEqual(
    persistence.savedLogs.map((log) => log.status),
    ['running'],
  )
})

test('AgentRuntimeKernel aborts and publishes one emergency failure when a terminal save fails', async () => {
  const adapter = new AbortObservingPushRuntimeAdapter()
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const storageFailure = new Error('terminal rename failed')
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    now: () => new Date('2026-07-10T03:01:00.000Z'),
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'finish durably',
  })
  const publishedEventTypes: string[] = []
  kernel.subscribeToRun(startedRun.runId, 1, (event) => {
    publishedEventTypes.push(event.type)
  })
  persistence.failNextSave(storageFailure)

  adapter.push(startedRun.runId, { type: 'completed' })
  await adapter.aborted
  const failedLog = await kernel.waitForRun(startedRun.runId)

  assert.equal(failedLog.status, 'failed')
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.equal(failedLog.events.at(-1)?.sequence, 2)
  assert.equal(
    failedLog.debugLog?.at(-1)?.data?.operation,
    'terminal_save',
  )
  assert.equal(failedLog.debugLog?.at(-1)?.data?.durable, false)
  assert.deepEqual(publishedEventTypes, ['failed'])
  assert.deepEqual(
    persistence.savedLogs.map((log) => log.status),
    ['running'],
  )
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.equal(kernel.getRunLog(startedRun.runId)?.events.length, 2)
})

test('AgentRuntimeKernel contains persistence failure after adapter error', async (testContext) => {
  const adapter = new GatedFailingAdapter()
  const persistence = new FaultInjectingRuntimeRunLogPersistence()
  const storageFailure = new Error(
    'terminal save failed after adapter error',
  )
  const failureMessage =
    'Runtime persistence unavailable during terminal_save: terminal save failed after adapter error'
  const failureAt = '2026-07-10T03:02:00.000Z'
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    generateRunId: () => '11111111-1111-4111-8111-111111111111',
    now: () => new Date(failureAt),
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'explode before terminal persistence',
  })
  const signal = await adapter.started
  const publishedEventTypes: string[] = []
  kernel.subscribeToRun(startedRun.runId, 1, (event) => {
    publishedEventTypes.push(event.type)
  })
  let terminalResolutionCount = 0
  const terminalRun = kernel.waitForRun(startedRun.runId).then((log) => {
    terminalResolutionCount += 1
    return log
  })
  const unhandledRejections: unknown[] = []
  const captureUnhandledRejection = (reason: unknown): void => {
    unhandledRejections.push(reason)
  }
  process.on('unhandledRejection', captureUnhandledRejection)
  testContext.after(() => {
    process.off('unhandledRejection', captureUnhandledRejection)
  })
  persistence.failNextSave(storageFailure)

  adapter.explode()
  const failedLog = await terminalRun
  await new Promise<void>((resolve) => setImmediate(resolve))

  assert.equal(signal.aborted, true)
  assert.equal(failedLog.status, 'failed')
  assert.equal(failedLog.error, failureMessage)
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )
  assert.equal(
    failedLog.events.filter((event) => event.type === 'failed').length,
    1,
  )
  assert.deepEqual(failedLog.debugLog?.at(-1), {
    timestamp: failureAt,
    source: 'kernel',
    kind: 'persistence_error',
    message: failureMessage,
    data: {
      code: 'runtime_persistence_unavailable',
      operation: 'terminal_save',
      cause: storageFailure.message,
      durable: false,
    },
  })
  assert.deepEqual(kernel.getPersistenceState(), {
    status: 'degraded',
    error: failureMessage,
  })
  assert.deepEqual(publishedEventTypes, ['failed'])
  assert.equal(terminalResolutionCount, 1)
  assert.deepEqual(
    persistence.savedLogs.map((log) => log.status),
    ['running'],
  )
  assert.deepEqual(
    (await persistence.load()).map((log) => ({
      runId: log.runId,
      status: log.status,
      eventTypes: log.events.map((event) => event.type),
    })),
    [
      {
        runId: startedRun.runId,
        status: 'running',
        eventTypes: ['started'],
      },
    ],
  )
  assert.deepEqual(unhandledRejections, [])
})

test('AgentRuntimeKernel drains checkpoints before cancelling and terminal cancellation transitions', async () => {
  const adapter = new AdapterConfirmedPushRuntimeAdapter()
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [adapter],
    checkpointScheduler: scheduler,
    persistence,
  })
  const startedRun = await kernel.startRun({
    adapter: 'test',
    prompt: 'cancel with checkpoint evidence',
  })

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: 'before checkpoint',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'before checkpoint',
  )

  const checkpointGate = persistence.blockNextSave()
  scheduler.runNext()
  await checkpointGate.started

  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: ' before cancel',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output === 'before checkpoint before cancel',
  )

  const publishedEventTypes: string[] = []
  kernel.subscribeToRun(startedRun.runId, 3, (event) => {
    publishedEventTypes.push(event.type)
  })

  let cancelResolved = false
  const cancelPromise = kernel.cancelRun(startedRun.runId).then((log) => {
    cancelResolved = true
    return log
  })

  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })

  assert.equal(cancelResolved, false)
  assert.deepEqual(publishedEventTypes, [])

  checkpointGate.release()
  const cancellingLog = await cancelPromise

  assert.equal(cancellingLog?.status, 'cancelling')
  assert.deepEqual(publishedEventTypes, ['cancelling'])

  adapter.push(startedRun.runId, {
    type: 'debug_log',
    entries: [
      {
        timestamp: '2026-07-10T01:00:02.000Z',
        source: 'test-runtime',
        kind: 'evidence',
        message: 'adapter cancellation evidence',
      },
    ],
  })
  adapter.push(startedRun.runId, {
    type: 'output_delta',
    delta: ' while cancelling',
  })
  await waitForRunLog(
    () => kernel.getRunLog(startedRun.runId),
    (log) => log.output.endsWith('while cancelling'),
  )

  adapter.push(startedRun.runId, {
    type: 'cancelled',
    reason: 'Adapter confirmed cancellation',
  })
  const terminalLog = await kernel.waitForRun(startedRun.runId)
  const [persistedLog] = await persistence.load()

  assert.equal(terminalLog.status, 'cancelled')
  assert.equal(persistedLog?.status, 'cancelled')
  assert.deepEqual(publishedEventTypes, [
    'cancelling',
    'output_delta',
    'cancelled',
  ])
  assert.deepEqual(
    persistence.savedLogs.map((log) => ({
      output: log.output,
      status: log.status,
    })),
    [
      { output: '', status: 'running' },
      { output: 'before checkpoint', status: 'running' },
      { output: 'before checkpoint before cancel', status: 'running' },
      { output: 'before checkpoint before cancel', status: 'cancelling' },
      {
        output: 'before checkpoint before cancel while cancelling',
        status: 'cancelling',
      },
      {
        output: 'before checkpoint before cancel while cancelling',
        status: 'cancelled',
      },
    ],
  )
  assert.deepEqual(persistedLog?.debugLog, [
    {
      timestamp: '2026-07-10T01:00:02.000Z',
      source: 'test-runtime',
      kind: 'evidence',
      message: 'adapter cancellation evidence',
    },
  ])
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
  assert.equal(waitedLog.completedAt, waitedLog.events.at(-1)?.timestamp)
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
      completedAt: '2026-07-09T00:00:00.000Z',
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
  assert.equal(failedLog.completedAt, failedLog.events.at(-1)?.timestamp)
  assert.deepEqual(
    failedLog.events.map((event) => event.type),
    ['started', 'failed'],
  )

  const failedEvent = failedLog.events[1]
  assert.equal(failedEvent?.type, 'failed')

  if (failedEvent?.type === 'failed') {
    assert.equal(failedEvent.error, 'Adapter exploded')
  }

  assert.deepEqual(kernel.getPersistenceState(), { status: 'ready' })
  assert.deepEqual(kernel.listRuns(), [
    {
      adapter: 'test',
      completedAt: '2026-07-09T00:00:00.000Z',
      error: 'Adapter exploded',
      outputPreview: '',
      prompt: '실패해줘',
      runId,
      startedAt: '2026-07-09T00:00:00.000Z',
      status: 'failed',
    },
  ])
})

test('AgentRuntimeKernel uses each terminal event timestamp as completedAt', async (t) => {
  const cases: Array<{
    name: string
    event: RuntimeAdapterEvent
    status: RuntimeRunLog['status']
  }> = [
    {
      name: 'completed',
      event: { type: 'completed' },
      status: 'completed',
    },
    {
      name: 'cancelled',
      event: { type: 'cancelled', reason: 'terminal cancellation' },
      status: 'cancelled',
    },
    {
      name: 'failed',
      event: { type: 'failed', error: 'terminal failure' },
      status: 'failed',
    },
  ]

  for (const [index, entry] of cases.entries()) {
    await t.test(entry.name, async () => {
      const adapter = new PushRuntimeAdapter()
      let timestampIndex = 0
      const baseTime = Date.parse(`2026-07-10T0${index + 1}:00:00.000Z`)
      const kernel = await AgentRuntimeKernel.create({
        adapters: [adapter],
        generateRunId: () =>
          `${index + 1}1111111-1111-4111-8111-111111111111`,
        now: () => new Date(baseTime + timestampIndex++ * 1_000),
        persistence: new InMemoryRuntimeRunLogPersistence(),
      })
      const startedRun = await kernel.startRun({
        adapter: 'test',
        prompt: `${entry.name} timestamp`,
      })

      adapter.push(startedRun.runId, entry.event)
      const terminalRun = await kernel.waitForRun(startedRun.runId)
      const terminalEvent = terminalRun.events.at(-1)

      assert.equal(terminalRun.status, entry.status)
      assert.equal(terminalRun.completedAt, terminalEvent?.timestamp)
    })
  }
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
  const persistence = new RecordingRuntimeRunLogPersistence()
  const scheduler = new ManualCheckpointScheduler()
  const kernel = await AgentRuntimeKernel.create({
    adapters: [new CancelDebugLogAdapter()],
    checkpointScheduler: scheduler,
    now: () => new Date('2026-07-09T00:00:00.000Z'),
    persistence,
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
  await waitForPersistedRun(
    persistence,
    (log) =>
      log.status === 'cancelled' &&
      log.debugLog?.some(
        (entry) => entry.data?.method === 'turn/interrupt',
      ) === true,
  )
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

function createInterruptedLog(input: {
  runId: string
  prompt: string
  startedAt: string
  status: 'running' | 'cancelling'
}): RuntimeRunLog {
  const outputAt = new Date(
    new Date(input.startedAt).getTime() + 1_000,
  ).toISOString()
  const events: RuntimeRunLog['events'] = [
    {
      type: 'started',
      sequence: 1,
      runId: input.runId,
      adapter: 'test',
      timestamp: input.startedAt,
      prompt: input.prompt,
    },
    {
      type: 'output_delta',
      sequence: 2,
      runId: input.runId,
      adapter: 'test',
      timestamp: outputAt,
      delta: 'partial evidence',
    },
  ]

  if (input.status === 'cancelling') {
    events.push({
      type: 'cancelling',
      sequence: 3,
      runId: input.runId,
      adapter: 'test',
      timestamp: outputAt,
      reason: 'Runtime run cancellation requested',
    })
  }

  return {
    runId: input.runId,
    adapter: 'test',
    prompt: input.prompt,
    status: input.status,
    output: 'partial evidence',
    events,
    debugLog: [
      {
        timestamp: outputAt,
        source: 'test-runtime',
        kind: 'evidence',
        message: `debug before ${input.status} restart`,
      },
    ],
    startedAt: input.startedAt,
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

async function waitForSavedLogCount(
  persistence: RecordingRuntimeRunLogPersistence,
  expectedCount: number,
): Promise<void> {
  const deadline = Date.now() + 500

  while (Date.now() < deadline) {
    if (persistence.savedLogs.length >= expectedCount) {
      return
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail(`expected at least ${expectedCount} persisted runtime logs`)
}

async function waitForPersistedRun(
  persistence: { savedLogs: RuntimeRunLog[] },
  predicate: (log: RuntimeRunLog) => boolean,
): Promise<void> {
  const deadline = Date.now() + 500

  while (Date.now() < deadline) {
    if (persistence.savedLogs.some(predicate)) {
      return
    }

    await new Promise<void>((resolve) => {
      setImmediate(resolve)
    })
  }

  assert.fail('expected persisted runtime run was not observed')
}

async function waitForAbort(signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return
  }

  await new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}
