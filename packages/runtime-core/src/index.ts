export type RuntimeRunStatus = 'running' | 'completed' | 'cancelled' | 'failed'

export type RuntimeRunEvent =
  | RuntimeRunStartedEvent
  | RuntimeRunOutputDeltaEvent
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
      type: 'debug_log'
      entries: RuntimeRunDebugLogEntry[]
    }

export type AgentRuntimeAdapter = {
  readonly name: string
  readonly label?: string
  readonly description?: string
  run(input: RuntimeAdapterRunInput): AsyncIterable<RuntimeAdapterEvent>
}

export type StartRuntimeRunInput = {
  adapter: string
  prompt: string
}

export type AgentRuntimeKernelOptions = {
  adapters: AgentRuntimeAdapter[]
  now?: () => Date
}

type RunSubscriber = (event: RuntimeRunEvent) => void

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
  private readonly now: () => Date
  private nextRunNumber = 1

  constructor(options: AgentRuntimeKernelOptions) {
    this.now = options.now ?? (() => new Date())

    for (const adapter of options.adapters) {
      this.adapters.set(adapter.name, adapter)
    }
  }

  listAdapters(): RuntimeAdapterDescriptor[] {
    return [...this.adapters.values()].map((adapter) => ({
      name: adapter.name,
      label: adapter.label ?? adapter.name,
      description: adapter.description,
    }))
  }

  startRun(input: StartRuntimeRunInput): RuntimeRunLog {
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

    this.logs.set(runId, log)
    this.terminalResolvers.set(runId, this.createTerminalResolver())
    this.abortControllers.set(runId, new AbortController())
    this.appendEvent(log, {
      type: 'started',
      prompt: input.prompt,
    })

    void this.runAdapter(adapter, log)

    return cloneLog(log)
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

  cancelRun(runId: string): RuntimeRunLog | undefined {
    const log = this.logs.get(runId)

    if (!log) {
      return undefined
    }

    if (isTerminalRuntimeRunStatus(log.status)) {
      return cloneLog(log)
    }

    const abortController = this.abortControllers.get(runId)
    this.cancelRunLog(log, 'Runtime run cancelled')
    abortController?.abort()
    this.abortControllers.delete(runId)

    return cloneLog(log)
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
        if (isTerminalRuntimeRunStatus(log.status)) {
          return
        }

        if (adapterEvent.type === 'output_delta') {
          log.output += adapterEvent.delta
          this.appendEvent(log, {
            type: 'output_delta',
            delta: adapterEvent.delta,
          })
        }

        if (adapterEvent.type === 'debug_log') {
          this.appendDebugLog(log, adapterEvent.entries)
        }

        if (adapterEvent.type === 'completed') {
          if (adapterEvent.output !== undefined) {
            log.output = adapterEvent.output
          }

          this.completeRun(log)

          return
        }
      }

      if (!isTerminalRuntimeRunStatus(log.status)) {
        this.completeRun(log)
      }
    } catch (error) {
      if (!isTerminalRuntimeRunStatus(log.status)) {
        this.failRun(log, toErrorMessage(error))
      }
    }
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

  private completeRun(log: RuntimeRunLog): void {
    log.status = 'completed'
    log.completedAt = this.timestamp()
    this.appendEvent(log, {
      type: 'completed',
      output: log.output,
    })
    this.resolveTerminal(log)
    this.abortControllers.delete(log.runId)
  }

  private cancelRunLog(log: RuntimeRunLog, reason: string): void {
    log.status = 'cancelled'
    this.appendEvent(log, {
      type: 'cancelled',
      reason,
    })
    this.resolveTerminal(log)
  }

  private failRun(log: RuntimeRunLog, error: string): void {
    log.status = 'failed'
    log.error = error
    this.appendEvent(log, {
      type: 'failed',
      error,
    })
    this.resolveTerminal(log)
    this.abortControllers.delete(log.runId)
  }

  private appendEvent(
    log: RuntimeRunLog,
    event:
      | { type: 'started'; prompt: string }
      | { type: 'output_delta'; delta: string }
      | { type: 'completed'; output: string }
      | { type: 'cancelled'; reason: string }
      | { type: 'failed'; error: string },
  ): void {
    const base = {
      sequence: log.events.length + 1,
      runId: log.runId,
      adapter: log.adapter,
      timestamp: this.timestamp(),
    }
    const runtimeEvent = { ...base, ...event } as RuntimeRunEvent

    log.events.push(runtimeEvent)

    const subscribers = this.subscribers.get(log.runId)

    if (!subscribers) {
      return
    }

    for (const subscriber of subscribers) {
      subscriber(cloneEvent(runtimeEvent))
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

  private createRunId(): string {
    const runId = `run-${String(this.nextRunNumber).padStart(4, '0')}`
    this.nextRunNumber += 1

    return runId
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
  return {
    ...log,
    events: log.events.map(cloneEvent),
    debugLog: log.debugLog?.map(cloneDebugLogEntry),
  }
}

function cloneEvent(event: RuntimeRunEvent): RuntimeRunEvent {
  return { ...event }
}

function cloneDebugLogEntry(
  entry: RuntimeRunDebugLogEntry,
): RuntimeRunDebugLogEntry {
  return {
    ...entry,
    data: entry.data ? { ...entry.data } : undefined,
  }
}

export function isTerminalRuntimeRunStatus(status: RuntimeRunStatus): boolean {
  return status === 'completed' || status === 'cancelled' || status === 'failed'
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
