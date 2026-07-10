import {
  compareRuntimeRunLogs,
  isTerminalRuntimeRunStatus,
  parseRuntimeRunLog,
} from './runtime-run-log.js'

export {
  compareRuntimeRunLogs,
  isTerminalRuntimeRunStatus,
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

export type RuntimeRunLogPersistenceSaveResult = {
  removedRunIds: string[]
}

export type RuntimeRunLogPersistence = {
  load(): Promise<RuntimeRunLog[]>
  save(log: RuntimeRunLog): Promise<RuntimeRunLogPersistenceSaveResult>
  remove(runId: string): Promise<void>
}

export type AgentRuntimeKernelOptions = {
  adapters: AgentRuntimeAdapter[]
  persistence: RuntimeRunLogPersistence
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

export class AgentRuntimeKernel {
  private readonly adapters = new Map<string, AgentRuntimeAdapter>()
  private readonly logs = new Map<string, RuntimeRunLog>()
  private readonly subscribers = new Map<string, Set<RunSubscriber>>()
  private readonly terminalResolvers = new Map<string, TerminalResolver>()
  private readonly abortControllers = new Map<string, AbortController>()
  private readonly reservedRunIds = new Set<string>()
  private readonly runMutationLocks = new Map<string, Promise<void>>()
  private readonly persistence: RuntimeRunLogPersistence
  private readonly generateRunId: () => string
  private readonly now: () => Date

  private constructor(options: AgentRuntimeKernelOptions) {
    this.persistence = options.persistence
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

    for (const log of [...persistedLogs].sort(compareRuntimeRunLogs)) {
      kernel.logs.set(log.runId, cloneLog(log))
    }

    return kernel
  }

  listAdapters(): RuntimeAdapterDescriptor[] {
    return [...this.adapters.values()].map((adapter) => ({
      name: adapter.name,
      label: adapter.label ?? adapter.name,
      description: adapter.description,
    }))
  }

  async startRun(input: StartRuntimeRunInput): Promise<RuntimeRunLog> {
    const adapter = this.adapters.get(input.adapter)

    if (!adapter) {
      throw new Error(`Unknown runtime adapter: ${input.adapter}`)
    }

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
      const saveResult = await this.persistence.save(cloneLog(log))

      this.removePersistedRunIds(saveResult.removedRunIds)
      this.logs.set(runId, log)
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
      await this.withRunMutation(log.runId, async () => {
        if (!isTerminalRuntimeRunStatus(log.status)) {
          await this.failRun(log, toErrorMessage(error))
        }
      })
    }
  }

  private async applyAdapterEvent(
    log: RuntimeRunLog,
    adapterEvent: RuntimeAdapterEvent,
  ): Promise<boolean> {
    if (adapterEvent.type === 'debug_log') {
      this.appendDebugLog(log, adapterEvent.entries)
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
  ): void {
    if (entries.length < 1) {
      return
    }

    log.debugLog = [...(log.debugLog ?? []), ...entries.map(cloneDebugLogEntry)]
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
    const transitionedLog = cloneLog(log)
    transitionedLog.status = transition.type

    if (transition.type === 'completed') {
      transitionedLog.completedAt = this.timestamp()
    }

    if (transition.type === 'failed') {
      transitionedLog.error = transition.error
    }

    const transitionEvent = this.appendEvent(
      transitionedLog,
      transition,
      false,
    )
    const saveResult = await this.persistence.save(cloneLog(transitionedLog))

    replaceLog(log, transitionedLog)
    this.removePersistedRunIds(saveResult.removedRunIds)
    this.publishEvent(log.runId, transitionEvent)

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
      const runId = this.generateRunId()

      if (!this.logs.has(runId) && !this.reservedRunIds.has(runId)) {
        this.reservedRunIds.add(runId)
        return runId
      }
    }

    throw new Error('Unable to create a unique runtime run ID')
  }

  private removePersistedRunIds(runIds: string[]): void {
    for (const runId of runIds) {
      this.logs.delete(runId)
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
