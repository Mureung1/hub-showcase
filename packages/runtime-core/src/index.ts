import {
  compareRuntimeRunLogs,
  isTerminalRuntimeRunStatus,
  parseRuntimeRunLog,
} from './runtime-run-log.js'
import {
  isRuntimeRunId,
  parseRuntimeRunId,
} from './runtime-run-id.js'

export {
  compareRuntimeRunLogs,
  isRuntimeRunId,
  isTerminalRuntimeRunStatus,
  parseRuntimeRunId,
  parseRuntimeRunLog,
}

export type RuntimeRunStatus =
  | 'running'
  | 'cancelling'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type RuntimeRunEvent =
  | RuntimeRunStartedEvent
  | RuntimeRunOutputDeltaEvent
  | RuntimeRunCancellingEvent
  | RuntimeRunCompletedEvent
  | RuntimeRunCancelledEvent
  | RuntimeRunFailedEvent

export type RuntimeRunTerminalEvent =
  | RuntimeRunCompletedEvent
  | RuntimeRunCancelledEvent
  | RuntimeRunFailedEvent

export type RuntimeRunStartedEvent = {
  type: 'started'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  prompt: string
}

export type RuntimeRunOutputDeltaEvent = {
  type: 'output_delta'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  delta: string
}

export type RuntimeRunCancellingEvent = {
  type: 'cancelling'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  reason: string
}

export type RuntimeRunCompletedEvent = {
  type: 'completed'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  output: string
}

export type RuntimeRunCancelledEvent = {
  type: 'cancelled'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  reason: string
}

export type RuntimeRunFailedEvent = {
  type: 'failed'
  sequence: number
  runId: string
  adapter: string
  timestamp: string
  error: string
}

export type RuntimeRunLog = {
  runId: string
  adapter: string
  prompt: string
  status: RuntimeRunStatus
  output: string
  error?: string
  events: RuntimeRunEvent[]
  debugLog?: RuntimeRunDebugLogEntry[]
  startedAt: string
  completedAt?: string
}

export type RuntimeRunDebugLogEntry = {
  timestamp: string
  source: string
  kind: string
  raw?: string
  message?: string
  data?: Record<string, unknown>
}

export type RuntimeRunSummary = {
  runId: string
  adapter: string
  prompt: string
  status: RuntimeRunStatus
  outputPreview: string
  error?: string
  startedAt: string
  completedAt?: string
}

export type RuntimeAdapterDescriptor = {
  name: string
  label: string
  description?: string
}

export type RuntimeAdapterRunInput = {
  runId: string
  prompt: string
  signal: AbortSignal
}

export type RuntimeAdapterCancellationMode = 'immediate' | 'adapter_confirmed'

export type RuntimeAdapterEvent =
  | {
      type: 'output_delta'
      delta: string
    }
  | {
      type: 'completed'
      output?: string
    }
  | {
      type: 'cancelled'
      reason: string
    }
  | {
      type: 'failed'
      error: string
    }
  | {
      type: 'debug_log'
      entries: RuntimeRunDebugLogEntry[]
    }

export type AgentRuntimeAdapter = {
  readonly name: string
  readonly label?: string
  readonly description?: string
  readonly cancellationMode?: RuntimeAdapterCancellationMode
  run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent>
}

export type StartRuntimeRunInput = {
  adapter: string
  prompt: string
}

export type RuntimeRunLogPersistenceMutationResult = {
  removedRunIds: string[]
}

export type RuntimeRunLogPersistence = {
  load(): Promise<RuntimeRunLog[]>
  applyRetention(): Promise<RuntimeRunLogPersistenceMutationResult>
  save(log: RuntimeRunLog): Promise<RuntimeRunLogPersistenceMutationResult>
  remove(runId: string): Promise<void>
}

export type RuntimePersistenceOperation =
  | 'initial_save'
  | 'checkpoint_save'
  | 'cancelling_save'
  | 'terminal_save'
  | 'clear_remove'

export type RuntimePersistenceState =
  | { status: 'ready' }
  | { status: 'degraded'; error: string }

export class RuntimePersistenceUnavailableError extends Error {
  readonly code = 'runtime_persistence_unavailable'
  readonly causeMessage: string
  readonly operation: RuntimePersistenceOperation

  constructor(
    operation: RuntimePersistenceOperation,
    cause: unknown,
  ) {
    const causeMessage = toPersistenceCauseMessage(cause)

    super(
      `Runtime persistence unavailable during ${operation}: ${causeMessage}`,
      { cause },
    )
    this.name = 'RuntimePersistenceUnavailableError'
    this.operation = operation
    this.causeMessage = causeMessage
  }
}

export type RuntimeCheckpointScheduler = {
  schedule(delayMs: number, task: () => void): () => void
}

export type AgentRuntimeKernelOptions = {
  adapters: AgentRuntimeAdapter[]
  persistence: RuntimeRunLogPersistence
  checkpointScheduler?: RuntimeCheckpointScheduler
  generateRunId?: () => string
  now?: () => Date
}

type RunSubscriber = (event: RuntimeRunEvent) => void

type RuntimeRunEventInput =
  | { type: 'started'; prompt: string }
  | { type: 'output_delta'; delta: string }
  | { type: 'cancelling'; reason: string }
  | { type: 'completed'; output: string }
  | { type: 'cancelled'; reason: string }
  | { type: 'failed'; error: string }

type PersistedRuntimeRunTransition = Extract<
  RuntimeRunEventInput,
  { type: RuntimeRunStatus }
>

type TerminalResolver = {
  promise: Promise<RuntimeRunLog>
  resolve: (log: RuntimeRunLog) => void
}

type RunCheckpointState = {
  dirtyRevision: number
  durableRevision: number
  requested: boolean
  paused: boolean
  timerGeneration: number
  cancelTimer?: () => void
  worker?: Promise<void>
  error?: unknown
}

const runtimeCheckpointIntervalMs = 100
const runtimeRestartRecoveryError = 'Runtime interrupted by server restart'

export class AgentRuntimeKernel {
  private readonly adapters = new Map<string, AgentRuntimeAdapter>()
  private readonly logs = new Map<string, RuntimeRunLog>()
  private readonly subscribers = new Map<string, Set<RunSubscriber>>()
  private readonly terminalResolvers = new Map<string, TerminalResolver>()
  private readonly abortControllers = new Map<string, AbortController>()
  private readonly reservedRunIds = new Set<string>()
  private readonly emergencyRunIds = new Set<string>()
  private readonly runMutationLocks = new Map<string, Promise<void>>()
  private readonly runCheckpoints = new Map<string, RunCheckpointState>()
  private readonly persistence: RuntimeRunLogPersistence
  private readonly checkpointScheduler: RuntimeCheckpointScheduler
  private readonly generateRunId: () => string
  private readonly now: () => Date
  private persistenceError: RuntimePersistenceUnavailableError | undefined

  private constructor(options: AgentRuntimeKernelOptions) {
    this.persistence = options.persistence
    this.checkpointScheduler =
      options.checkpointScheduler ?? createDefaultCheckpointScheduler()
    this.generateRunId =
      options.generateRunId ?? (() => globalThis.crypto.randomUUID())
    this.now = options.now ?? (() => new Date())

    for (const adapter of options.adapters) {
      this.adapters.set(adapter.name, adapter)
    }
  }

  static async create(
    options: AgentRuntimeKernelOptions,
  ): Promise<AgentRuntimeKernel> {
    const kernel = new AgentRuntimeKernel(options)
    const persistedLogs = await options.persistence.load()
    const sortedLogs = [...persistedLogs].sort(compareRuntimeRunLogs)

    for (const log of sortedLogs) {
      kernel.logs.set(log.runId, cloneLog(log))
    }

    for (const persistedLog of sortedLogs) {
      const log = kernel.logs.get(persistedLog.runId)

      if (!log || isTerminalRuntimeRunStatus(log.status)) {
        continue
      }

      const recoveredLog = kernel.recoverInterruptedRun(log)
      kernel.logs.set(recoveredLog.runId, recoveredLog)

      const saveResult = await options.persistence.save(cloneLog(recoveredLog))

      kernel.removePersistedRunIds(saveResult.removedRunIds)
    }

    const retentionResult = await options.persistence.applyRetention()

    kernel.removePersistedRunIds(retentionResult.removedRunIds)

    return kernel
  }

  listAdapters(): RuntimeAdapterDescriptor[] {
    return [...this.adapters.values()].map((adapter) => ({
      name: adapter.name,
      label: adapter.label ?? adapter.name,
      description: adapter.description,
    }))
  }

  getPersistenceState(): RuntimePersistenceState {
    if (!this.persistenceError) {
      return { status: 'ready' }
    }

    return {
      status: 'degraded',
      error: this.persistenceError.message,
    }
  }

  async startRun(input: StartRuntimeRunInput): Promise<RuntimeRunLog> {
    const adapter = this.adapters.get(input.adapter)

    if (!adapter) {
      throw new Error(`Unknown runtime adapter: ${input.adapter}`)
    }

    this.assertPersistenceReady()

    const runId = this.createRunId()
    const startedAt = this.timestamp()
    const log: RuntimeRunLog = {
      runId,
      adapter: adapter.name,
      prompt: input.prompt,
      status: 'running',
      output: '',
      events: [],
      startedAt,
    }
    const startedEvent = this.appendEvent(
      log,
      {
        type: 'started',
        prompt: input.prompt,
      },
      false,
    )

    try {
      let saveResult: RuntimeRunLogPersistenceMutationResult

      try {
        saveResult = await this.persistence.save(cloneLog(log))
      } catch (cause) {
        throw this.markPersistenceUnavailable('initial_save', cause)
      }

      this.removePersistedRunIds(saveResult.removedRunIds)
      this.logs.set(runId, log)
      this.runCheckpoints.set(runId, this.createRunCheckpointState())
      this.terminalResolvers.set(runId, this.createTerminalResolver())
      this.abortControllers.set(runId, new AbortController())
      this.publishEvent(log.runId, startedEvent)

      void this.runAdapter(adapter, log)

      return cloneLog(log)
    } finally {
      this.reservedRunIds.delete(runId)
    }
  }

  getRunLog(runId: string): RuntimeRunLog | undefined {
    const log = this.logs.get(runId)

    return log ? cloneLog(log) : undefined
  }

  listRuns(): RuntimeRunSummary[] {
    return [...this.logs.values()]
      .map((log) => ({
        runId: log.runId,
        adapter: log.adapter,
        prompt: log.prompt,
        status: log.status,
        outputPreview: previewOutput(log.output),
        error: log.error,
        startedAt: log.startedAt,
        completedAt: log.completedAt,
      }))
      .reverse()
  }

  waitForRun(runId: string): Promise<RuntimeRunLog> {
    const log = this.logs.get(runId)

    if (!log) {
      return Promise.reject(new Error(`Unknown runtime run: ${runId}`))
    }

    if (isTerminalRuntimeRunStatus(log.status)) {
      return Promise.resolve(cloneLog(log))
    }

    const resolver = this.terminalResolvers.get(runId)

    if (!resolver) {
      return Promise.resolve(cloneLog(log))
    }

    return resolver.promise.then(cloneLog)
  }

  subscribeToRun(
    runId: string,
    afterSequence: number,
    subscriber: RunSubscriber,
  ): () => void {
    const log = this.logs.get(runId)

    if (!log) {
      throw new Error(`Unknown runtime run: ${runId}`)
    }

    for (const event of log.events) {
      if (event.sequence > afterSequence) {
        subscriber(cloneEvent(event))
      }
    }

    if (isTerminalRuntimeRunStatus(log.status)) {
      return () => {}
    }

    const subscribers = this.subscribers.get(runId) ?? new Set<RunSubscriber>()
    subscribers.add(subscriber)
    this.subscribers.set(runId, subscribers)

    return () => {
      subscribers.delete(subscriber)
    }
  }

  async cancelRun(runId: string): Promise<RuntimeRunLog | undefined> {
    return this.withRunMutation(runId, async () => {
      const log = this.logs.get(runId)

      if (!log) {
        return undefined
      }

      this.assertPersistenceReady()

      if (isTerminalRuntimeRunStatus(log.status)) {
        return cloneLog(log)
      }

      if (log.status === 'cancelling') {
        return cloneLog(log)
      }

      const abortController = this.abortControllers.get(runId)
      const adapter = this.adapters.get(log.adapter)

      if (adapter?.cancellationMode === 'adapter_confirmed') {
        await this.beginCancellingRun(
          log,
          'Runtime run cancellation requested',
        )
        abortController?.abort()

        return cloneLog(log)
      }

      await this.cancelRunLog(log, 'Runtime run cancelled')
      abortController?.abort()
      this.abortControllers.delete(runId)

      return cloneLog(log)
    })
  }

  async clearTerminalHistory(): Promise<string[]> {
    this.assertPersistenceReady()

    const targetRunIds = [...this.logs.values()]
      .filter((log) => isTerminalRuntimeRunStatus(log.status))
      .map((log) => log.runId)
    const clearedRunIds: string[] = []

    for (const runId of targetRunIds) {
      const cleared = await this.withRunMutation(runId, async () => {
        const log = this.logs.get(runId)

        if (!log || !isTerminalRuntimeRunStatus(log.status)) {
          return false
        }

        await this.finishRunCheckpointing(log)
        try {
          await this.persistence.remove(runId)
        } catch (cause) {
          throw this.markPersistenceUnavailable('clear_remove', cause)
        }
        this.removePersistedRunIds([runId])

        return true
      })

      if (cleared) {
        clearedRunIds.push(runId)
      }
    }

    return clearedRunIds
  }

  private async runAdapter(
    adapter: AgentRuntimeAdapter,
    log: RuntimeRunLog,
  ): Promise<void> {
    const abortController = this.abortControllers.get(log.runId)

    try {
      for await (const adapterEvent of adapter.run({
        runId: log.runId,
        prompt: log.prompt,
        signal: abortController?.signal ?? AbortSignal.abort(),
      })) {
        const shouldStop = await this.withRunMutation(log.runId, () =>
          this.applyAdapterEvent(log, adapterEvent),
        )

        if (shouldStop) {
          return
        }
      }

      await this.withRunMutation(log.runId, async () => {
        if (isTerminalRuntimeRunStatus(log.status)) {
          return
        }

        if (log.status === 'cancelling') {
          await this.failRun(
            log,
            'Runtime run cancellation was not confirmed by adapter',
          )
          return
        }

        await this.completeRun(log)
      })
    } catch (error) {
      if (error instanceof RuntimePersistenceUnavailableError) {
        return
      }

      try {
        await this.withRunMutation(log.runId, async () => {
          if (!isTerminalRuntimeRunStatus(log.status)) {
            await this.failRun(log, toErrorMessage(error))
          }
        })
      } catch (failureError) {
        if (!(failureError instanceof RuntimePersistenceUnavailableError)) {
          throw failureError
        }
      }
    } finally {
      try {
        await this.finishRunCheckpointing(log)
      } catch (error) {
        if (!(error instanceof RuntimePersistenceUnavailableError)) {
          throw error
        }
      }
    }
  }

  private async applyAdapterEvent(
    log: RuntimeRunLog,
    adapterEvent: RuntimeAdapterEvent,
  ): Promise<boolean> {
    if (adapterEvent.type === 'debug_log') {
      if (this.appendDebugLog(log, adapterEvent.entries)) {
        this.markCheckpointDirty(log)
      }

      return false
    }

    if (isTerminalRuntimeRunStatus(log.status)) {
      return true
    }

    if (adapterEvent.type === 'output_delta') {
      log.output += adapterEvent.delta
      this.appendEvent(log, {
        type: 'output_delta',
        delta: adapterEvent.delta,
      })
      this.markCheckpointDirty(log)
      return false
    }

    if (adapterEvent.type === 'completed') {
      if (adapterEvent.output !== undefined) {
        log.output = adapterEvent.output
      }

      await this.completeRun(log)
      return true
    }

    if (adapterEvent.type === 'cancelled') {
      await this.cancelRunLog(log, adapterEvent.reason)
      return true
    }

    await this.failRun(log, adapterEvent.error)
    return true
  }

  private appendDebugLog(
    log: RuntimeRunLog,
    entries: RuntimeRunDebugLogEntry[],
  ): boolean {
    if (entries.length < 1) {
      return false
    }

    log.debugLog = [...(log.debugLog ?? []), ...entries.map(cloneDebugLogEntry)]

    return true
  }

  private markCheckpointDirty(log: RuntimeRunLog): void {
    const state = this.runCheckpoints.get(log.runId)

    if (!state) {
      return
    }

    state.dirtyRevision += 1

    if (state.paused || state.cancelTimer || state.error) {
      return
    }

    const timerGeneration = state.timerGeneration + 1
    state.timerGeneration = timerGeneration
    state.cancelTimer = this.checkpointScheduler.schedule(
      runtimeCheckpointIntervalMs,
      () => {
        if (state.timerGeneration !== timerGeneration) {
          return
        }

        delete state.cancelTimer
        this.requestCheckpoint(log, state)
      },
    )
  }

  private requestCheckpoint(
    log: RuntimeRunLog,
    state: RunCheckpointState,
  ): void {
    if (state.error || state.dirtyRevision <= state.durableRevision) {
      return
    }

    state.requested = true

    if (state.worker) {
      return
    }

    const worker = this.runCheckpointWorker(log, state).catch((cause) => {
      const persistenceError = this.markPersistenceUnavailable(
        'checkpoint_save',
        cause,
      )

      state.error = persistenceError
      this.queueEmergencyRunFailure(log, persistenceError)
    })
    state.worker = worker

    void worker.finally(() => {
      if (state.worker === worker) {
        delete state.worker
      }
    })
  }

  private async runCheckpointWorker(
    log: RuntimeRunLog,
    state: RunCheckpointState,
  ): Promise<void> {
    while (state.requested && !state.error) {
      state.requested = false

      if (state.dirtyRevision <= state.durableRevision) {
        continue
      }

      const checkpointRevision = state.dirtyRevision
      const saveResult = await this.persistence.save(cloneLog(log))

      state.durableRevision = checkpointRevision
      this.removePersistedRunIds(saveResult.removedRunIds)
    }
  }

  private pauseCheckpointing(state: RunCheckpointState): void {
    state.paused = true
    state.timerGeneration += 1
    state.cancelTimer?.()
    delete state.cancelTimer
  }

  private async flushRunCheckpoint(
    log: RuntimeRunLog,
    state: RunCheckpointState,
  ): Promise<void> {
    this.pauseCheckpointing(state)

    while (state.dirtyRevision > state.durableRevision || state.worker) {
      if (state.error) {
        throw state.error
      }

      if (state.dirtyRevision > state.durableRevision) {
        this.requestCheckpoint(log, state)
      }

      const worker = state.worker

      if (!worker) {
        continue
      }

      await worker
    }

    if (state.error) {
      throw state.error
    }
  }

  private async finishRunCheckpointing(log: RuntimeRunLog): Promise<void> {
    const state = this.runCheckpoints.get(log.runId)

    if (!state) {
      return
    }

    try {
      await this.flushRunCheckpoint(log, state)
    } finally {
      this.pauseCheckpointing(state)
      this.runCheckpoints.delete(log.runId)
    }
  }

  private async completeRun(log: RuntimeRunLog): Promise<void> {
    await this.persistRunTransition(log, {
      type: 'completed',
      output: log.output,
    })
  }

  private async beginCancellingRun(
    log: RuntimeRunLog,
    reason: string,
  ): Promise<void> {
    await this.persistRunTransition(log, { type: 'cancelling', reason })
  }

  private async cancelRunLog(
    log: RuntimeRunLog,
    reason: string,
  ): Promise<void> {
    await this.persistRunTransition(log, { type: 'cancelled', reason })
  }

  private async failRun(log: RuntimeRunLog, error: string): Promise<void> {
    await this.persistRunTransition(log, { type: 'failed', error })
  }

  private async persistRunTransition(
    log: RuntimeRunLog,
    transition: PersistedRuntimeRunTransition,
  ): Promise<void> {
    const checkpointState = this.runCheckpoints.get(log.runId)

    if (checkpointState) {
      await this.flushRunCheckpoint(log, checkpointState)
    }

    const transitionedLog = cloneLog(log)
    transitionedLog.status = transition.type

    if (transition.type === 'failed') {
      transitionedLog.error = transition.error
    }

    const transitionEvent = this.appendEvent(
      transitionedLog,
      transition,
      false,
    )

    if (isTerminalRuntimeRunStatus(transition.type)) {
      transitionedLog.completedAt = transitionEvent.timestamp
    }

    let saveResult: RuntimeRunLogPersistenceMutationResult

    try {
      saveResult = await this.persistence.save(cloneLog(transitionedLog))
    } catch (cause) {
      const operation: RuntimePersistenceOperation =
        transition.type === 'cancelling'
          ? 'cancelling_save'
          : 'terminal_save'
      const persistenceError = this.markPersistenceUnavailable(
        operation,
        cause,
      )

      this.queueEmergencyRunFailure(log, persistenceError)
      throw persistenceError
    }

    if (checkpointState) {
      checkpointState.durableRevision = checkpointState.dirtyRevision
    }

    replaceLog(log, transitionedLog)
    this.removePersistedRunIds(saveResult.removedRunIds)
    this.publishEvent(log.runId, transitionEvent)

    if (checkpointState) {
      checkpointState.paused = false
    }

    if (isTerminalRuntimeRunStatus(log.status)) {
      this.resolveTerminal(log)
      this.abortControllers.delete(log.runId)
    }
  }

  private appendEvent(
    log: RuntimeRunLog,
    event: RuntimeRunEventInput,
    publish = true,
  ): RuntimeRunEvent {
    const base = {
      sequence: log.events.length + 1,
      runId: log.runId,
      adapter: log.adapter,
      timestamp: this.timestamp(),
    }
    const runtimeEvent = { ...base, ...event } as RuntimeRunEvent

    log.events.push(runtimeEvent)

    if (publish) {
      this.publishEvent(log.runId, runtimeEvent)
    }

    return runtimeEvent
  }

  private publishEvent(runId: string, event: RuntimeRunEvent): void {
    const subscribers = this.subscribers.get(runId)

    for (const subscriber of subscribers ?? []) {
      subscriber(cloneEvent(event))
    }
  }

  private resolveTerminal(log: RuntimeRunLog): void {
    const resolver = this.terminalResolvers.get(log.runId)

    if (resolver) {
      resolver.resolve(cloneLog(log))
      this.terminalResolvers.delete(log.runId)
    }

    this.subscribers.delete(log.runId)
  }

  private async withRunMutation<T>(
    runId: string,
    mutation: () => T | Promise<T>,
  ): Promise<T> {
    const previousLock = this.runMutationLocks.get(runId) ?? Promise.resolve()
    let releaseLock: () => void = () => {}
    const currentLock = new Promise<void>((resolve) => {
      releaseLock = resolve
    })

    this.runMutationLocks.set(runId, currentLock)
    await previousLock

    try {
      return await mutation()
    } finally {
      releaseLock()

      if (this.runMutationLocks.get(runId) === currentLock) {
        this.runMutationLocks.delete(runId)
      }
    }
  }

  private createRunId(): string {
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const runId = parseRuntimeRunId(
        this.generateRunId(),
        'generated runtime run ID',
      )

      if (!this.logs.has(runId) && !this.reservedRunIds.has(runId)) {
        this.reservedRunIds.add(runId)
        return runId
      }
    }

    throw new Error('Unable to create a unique runtime run ID')
  }

  private recoverInterruptedRun(log: RuntimeRunLog): RuntimeRunLog {
    const previousStatus = log.status
    const recoveredAt = this.timestamp()
    const recoveredLog = cloneLog(log)

    recoveredLog.status = 'failed'
    recoveredLog.error = runtimeRestartRecoveryError
    recoveredLog.completedAt = recoveredAt
    recoveredLog.events.push({
      type: 'failed',
      sequence: recoveredLog.events.length + 1,
      runId: recoveredLog.runId,
      adapter: recoveredLog.adapter,
      timestamp: recoveredAt,
      error: runtimeRestartRecoveryError,
    })
    recoveredLog.debugLog = [
      ...(recoveredLog.debugLog ?? []),
      {
        timestamp: recoveredAt,
        source: 'kernel',
        kind: 'restart_recovery',
        message: runtimeRestartRecoveryError,
        data: {
          previousStatus,
          recoveryReason: runtimeRestartRecoveryError,
        },
      },
    ]

    return recoveredLog
  }

  private removePersistedRunIds(runIds: string[]): void {
    for (const runId of runIds) {
      const checkpointState = this.runCheckpoints.get(runId)

      if (checkpointState) {
        this.pauseCheckpointing(checkpointState)
        checkpointState.requested = false
      }

      this.logs.delete(runId)
      this.runCheckpoints.delete(runId)
    }
  }

  private timestamp(): string {
    return this.now().toISOString()
  }

  private createTerminalResolver(): TerminalResolver {
    let resolveTerminal: (log: RuntimeRunLog) => void = () => {}
    const promise = new Promise<RuntimeRunLog>((resolve) => {
      resolveTerminal = resolve
    })

    return {
      promise,
      resolve: resolveTerminal,
    }
  }

  private createRunCheckpointState(): RunCheckpointState {
    return {
      dirtyRevision: 0,
      durableRevision: 0,
      requested: false,
      paused: false,
      timerGeneration: 0,
    }
  }

  private assertPersistenceReady(): void {
    if (this.persistenceError) {
      throw this.persistenceError
    }
  }

  private markPersistenceUnavailable(
    operation: RuntimePersistenceOperation,
    cause: unknown,
  ): RuntimePersistenceUnavailableError {
    const persistenceError = new RuntimePersistenceUnavailableError(
      operation,
      cause,
    )

    this.persistenceError = persistenceError

    return persistenceError
  }

  private queueEmergencyRunFailure(
    log: RuntimeRunLog,
    persistenceError: RuntimePersistenceUnavailableError,
  ): void {
    if (
      !isTerminalRuntimeRunStatus(log.status) &&
      !this.emergencyRunIds.has(log.runId)
    ) {
      this.emergencyRunIds.add(log.runId)
      const emergencyTransition = this.withRunMutation(log.runId, () => {
        if (!isTerminalRuntimeRunStatus(log.status)) {
          this.applyEmergencyRunFailure(log, persistenceError)
        }
      })

      void emergencyTransition.then(
        () => this.emergencyRunIds.delete(log.runId),
        () => this.emergencyRunIds.delete(log.runId),
      )
    }

    this.abortControllers.get(log.runId)?.abort()
    this.stopRunCheckpointing(log.runId)
  }

  private stopRunCheckpointing(runId: string): void {
    const state = this.runCheckpoints.get(runId)

    if (!state) {
      return
    }

    this.pauseCheckpointing(state)
    state.requested = false
    this.runCheckpoints.delete(runId)
  }

  private applyEmergencyRunFailure(
    log: RuntimeRunLog,
    persistenceError: RuntimePersistenceUnavailableError,
  ): void {
    log.status = 'failed'
    log.error = persistenceError.message
    const failedEvent = this.appendEvent(
      log,
      { type: 'failed', error: persistenceError.message },
      false,
    )
    log.completedAt = failedEvent.timestamp
    log.debugLog = [
      ...(log.debugLog ?? []),
      {
        timestamp: failedEvent.timestamp,
        source: 'kernel',
        kind: 'persistence_error',
        message: persistenceError.message,
        data: {
          code: persistenceError.code,
          operation: persistenceError.operation,
          cause: persistenceError.causeMessage,
          durable: false,
        },
      },
    ]

    try {
      this.publishEvent(log.runId, failedEvent)
    } finally {
      this.resolveTerminal(log)
      this.abortControllers.delete(log.runId)
    }
  }
}

function createDefaultCheckpointScheduler(): RuntimeCheckpointScheduler {
  return {
    schedule(delayMs, task) {
      const timeout = setTimeout(task, delayMs)

      return () => {
        clearTimeout(timeout)
      }
    },
  }
}

function previewOutput(output: string): string {
  const compactOutput = output.replace(/\s+/g, ' ').trim()

  if (compactOutput.length <= 120) {
    return compactOutput
  }

  return `${compactOutput.slice(0, 117)}...`
}

function cloneLog(log: RuntimeRunLog): RuntimeRunLog {
  const clonedLog: RuntimeRunLog = {
    ...log,
    events: log.events.map(cloneEvent),
  }

  if (log.debugLog) {
    clonedLog.debugLog = log.debugLog.map(cloneDebugLogEntry)
  }

  return clonedLog
}

function cloneEvent(event: RuntimeRunEvent): RuntimeRunEvent {
  return { ...event }
}

function cloneDebugLogEntry(
  entry: RuntimeRunDebugLogEntry,
): RuntimeRunDebugLogEntry {
  const clonedEntry: RuntimeRunDebugLogEntry = {
    ...entry,
  }

  if (entry.data) {
    clonedEntry.data = { ...entry.data }
  }

  return clonedEntry
}

function replaceLog(target: RuntimeRunLog, source: RuntimeRunLog): void {
  target.runId = source.runId
  target.adapter = source.adapter
  target.prompt = source.prompt
  target.status = source.status
  target.output = source.output
  target.events = source.events.map(cloneEvent)
  target.startedAt = source.startedAt

  if (source.error === undefined) {
    delete target.error
  } else {
    target.error = source.error
  }

  if (source.debugLog === undefined) {
    delete target.debugLog
  } else {
    target.debugLog = source.debugLog.map(cloneDebugLogEntry)
  }

  if (source.completedAt === undefined) {
    delete target.completedAt
  } else {
    target.completedAt = source.completedAt
  }
}

export function isTerminalRuntimeRunEvent(
  event: RuntimeRunEvent,
): event is RuntimeRunTerminalEvent {
  return isTerminalRuntimeRunStatus(event.type as RuntimeRunStatus)
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Runtime run failed'
}

function toPersistenceCauseMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message
  }

  return String(cause)
}
