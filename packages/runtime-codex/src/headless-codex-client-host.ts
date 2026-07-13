import type {
  ClientNotification,
  ClientRequest,
} from './internal/codex-app-server-protocol/generated/index.js'
import {
  prepareProductRuntimeLayout,
  ProductRuntimeLayoutError,
  type ProductRuntimeLayout,
  type ProductRuntimeLayoutFailureCode,
  type ProductRuntimeLayoutInput,
} from './product-runtime-layout.js'
import {
  CodexStdioProtocolError,
  CodexStdioRequestError,
  CodexStdioTransport,
  CodexStdioTransportError,
  type CodexStdioObservation,
} from './stdio-transport.js'

export type HeadlessCodexClientHostStatus =
  | 'stopped'
  | 'starting'
  | 'ready'
  | 'restarting'
  | 'stopping'
  | 'failed'

export type HeadlessCodexClientHostFailureCode =
  | ProductRuntimeLayoutFailureCode
  | 'spawn_error'
  | 'initialize_timeout'
  | 'initialize_error'
  | 'transport_lost'
  | 'protocol_error'
  | 'close_timeout'

export type HeadlessCodexClientHostFailure = Readonly<{
  code: HeadlessCodexClientHostFailureCode
  message: string
}>

export type HeadlessCodexClientHostSnapshot = Readonly<{
  status: HeadlessCodexClientHostStatus
  generation: number
  failure: HeadlessCodexClientHostFailure | null
  recoverable: boolean
}>

export type HeadlessCodexClientHostEvent = Readonly<{
  kind: 'host_state_changed'
  sequence: number
  generation: number
  timestamp: string
  snapshot: HeadlessCodexClientHostSnapshot
}>

export type HeadlessCodexClientHostSubscription = {
  snapshot: HeadlessCodexClientHostSnapshot
  cursor: number
  events: AsyncIterable<HeadlessCodexClientHostEvent>
  unsubscribe: () => void
}

export type HeadlessCodexClientHostOptions = {
  initializeTimeoutMs?: number
  closeTimeoutMs?: number
  maxQueuedObservations?: number
  subscriptionBufferLimit?: number
}

export type HeadlessCodexClientHostTestOptions = {
  forceKill?: (pid: number) => void
  now?: () => string
  onObservationConsumerReady?: () => void
  startSettlementBarrier?: Promise<void>
}

export class HeadlessCodexClientHostError extends Error {
  readonly code: HeadlessCodexClientHostFailureCode | 'operation_conflict'
  readonly recoverable: boolean

  constructor(
    code: HeadlessCodexClientHostFailureCode | 'operation_conflict' =
      'operation_conflict',
    recoverable = false,
    message =
      'Headless Codex Client Host lifecycle operation conflicts with its current state',
  ) {
    super(message)
    this.name = 'HeadlessCodexClientHostError'
    this.code = code
    this.recoverable = recoverable
  }
}

export class HeadlessCodexClientHostSubscriptionError extends Error {
  readonly code = 'subscription_overflow' as const

  constructor() {
    super('Headless Codex Client Host subscription buffer reached its limit')
    this.name = 'HeadlessCodexClientHostSubscriptionError'
  }
}

type ResolvedHostOptions = Required<HeadlessCodexClientHostOptions>

type LifecycleFailure = {
  code: HeadlessCodexClientHostFailureCode
  message: string
  recoverable: boolean
}

type ObservationIterator = AsyncIterator<CodexStdioObservation>

const testOptionsKey = Symbol('headless-codex-client-host-test-options')

type OptionsWithTestSeams = HeadlessCodexClientHostOptions & {
  [testOptionsKey]?: HeadlessCodexClientHostTestOptions
}

const defaultInitializeTimeoutMs = 15000
const defaultCloseTimeoutMs = 1000
const defaultMaxQueuedObservations = 1024
const defaultSubscriptionBufferLimit = 1024
const appServerArgs = ['app-server', '--listen', 'stdio://']
const inheritedEnvironmentAllowlist = new Set([
  'COLORTERM',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'LOGNAME',
  'NO_COLOR',
  'PATH',
  'SHELL',
  'TEMP',
  'TERM',
  'TMP',
  'TMPDIR',
  'USER',
])

export class HeadlessCodexClientHost {
  private readonly layoutInput: Readonly<ProductRuntimeLayoutInput>
  private readonly options: ResolvedHostOptions
  private readonly testOptions: HeadlessCodexClientHostTestOptions
  private readonly subscribers = new Set<LifecycleSubscriber>()
  private layout: ProductRuntimeLayout | undefined
  private transport: CodexStdioTransport | undefined
  private observationPump: Promise<void> | undefined
  private snapshot: HeadlessCodexClientHostSnapshot = freezeSnapshot({
    status: 'stopped',
    generation: 0,
    failure: null,
    recoverable: false,
  })
  private sequence = 0
  private generation = 0
  private lifecycleEpoch = 0
  private startPromise: Promise<void> | undefined
  private stopPromise: Promise<void> | undefined
  private permanentlyFailed = false

  constructor(
    input: ProductRuntimeLayoutInput,
    options: HeadlessCodexClientHostOptions = {},
  ) {
    this.layoutInput = Object.freeze({ ...input })
    this.testOptions = (options as OptionsWithTestSeams)[testOptionsKey] ?? {}
    this.options = {
      initializeTimeoutMs: readPositiveSafeInteger(
        'initializeTimeoutMs',
        options.initializeTimeoutMs ?? defaultInitializeTimeoutMs,
      ),
      closeTimeoutMs: readPositiveSafeInteger(
        'closeTimeoutMs',
        options.closeTimeoutMs ?? defaultCloseTimeoutMs,
      ),
      maxQueuedObservations: readPositiveSafeInteger(
        'maxQueuedObservations',
        options.maxQueuedObservations ?? defaultMaxQueuedObservations,
      ),
      subscriptionBufferLimit: readPositiveSafeInteger(
        'subscriptionBufferLimit',
        options.subscriptionBufferLimit ?? defaultSubscriptionBufferLimit,
      ),
    }
  }

  getSnapshot(): HeadlessCodexClientHostSnapshot {
    return this.snapshot
  }

  subscribe(): HeadlessCodexClientHostSubscription {
    const subscriber = new LifecycleSubscriber(
      this.options.subscriptionBufferLimit,
      () => this.subscribers.delete(subscriber),
    )
    this.subscribers.add(subscriber)

    return {
      snapshot: this.snapshot,
      cursor: this.sequence,
      events: subscriber,
      unsubscribe: () => subscriber.unsubscribe(),
    }
  }

  start(): Promise<void> {
    if (this.snapshot.status === 'ready') {
      return Promise.resolve()
    }

    if (this.snapshot.status === 'starting' && this.startPromise) {
      return this.startPromise
    }

    if (
      this.snapshot.status !== 'stopped' ||
      this.permanentlyFailed ||
      this.stopPromise
    ) {
      return Promise.reject(new HeadlessCodexClientHostError())
    }

    const epoch = ++this.lifecycleEpoch
    this.publishSnapshot({
      status: 'starting',
      generation: this.generation,
      failure: null,
      recoverable: false,
    })

    let trackedPromise: Promise<void>
    trackedPromise = this.startConnection(epoch).finally(() => {
      if (this.startPromise === trackedPromise) {
        this.startPromise = undefined
      }
    })
    this.startPromise = trackedPromise

    return trackedPromise
  }

  stop(): Promise<void> {
    if (this.snapshot.status === 'stopping' && this.stopPromise) {
      return this.stopPromise
    }

    if (this.snapshot.status === 'stopped') {
      this.finishSubscribersAfterDrain()
      return Promise.resolve()
    }

    const epoch = ++this.lifecycleEpoch
    this.publishSnapshot({
      status: 'stopping',
      generation: this.generation,
      failure: this.snapshot.failure,
      recoverable: false,
    })

    let trackedPromise: Promise<void>
    trackedPromise = this.stopConnection(epoch).finally(() => {
      if (this.stopPromise === trackedPromise) {
        this.stopPromise = undefined
      }
    })
    this.stopPromise = trackedPromise

    return trackedPromise
  }

  private async startConnection(epoch: number): Promise<void> {
    let transport: CodexStdioTransport | undefined

    try {
      const layout =
        this.layout ?? (await prepareProductRuntimeLayout(this.layoutInput))
      this.assertCurrentStartingEpoch(epoch)
      this.layout = layout
      transport = new CodexStdioTransport({
        command: layout.codexBinPath,
        args: appServerArgs,
        cwd: layout.cwd,
        env: buildProductChildEnvironment(layout),
        requestTimeoutMs: this.options.initializeTimeoutMs,
        closeTimeoutMs: this.options.closeTimeoutMs,
        maxQueuedObservations: this.options.maxQueuedObservations,
        forceKill: this.testOptions.forceKill,
        startSettlementBarrier: this.testOptions.startSettlementBarrier,
      })
      this.transport = transport

      const iterator = transport.observations()[Symbol.asyncIterator]()
      const firstObservation = iterator.next()
      this.testOptions.onObservationConsumerReady?.()
      this.observationPump = this.pumpObservations(
        epoch,
        transport,
        iterator,
        firstObservation,
      )

      await transport.start()
      this.assertCurrentStartingEpoch(epoch)
      this.generation += 1

      const initializeRequest: Extract<
        ClientRequest,
        { method: 'initialize' }
      > = {
        id: 1,
        method: 'initialize',
        params: {
          clientInfo: {
            name: 'ay_ple_headless_codex_client_host',
            title: 'AY-PLE Headless Codex Client Host',
            version: '0.0.0',
          },
          capabilities: null,
        },
      }
      await transport.sendRequest(initializeRequest)
      this.assertCurrentStartingEpoch(epoch)

      const initialized: ClientNotification = { method: 'initialized' }
      await transport.sendNotification(initialized)
      this.assertCurrentStartingEpoch(epoch)

      this.publishSnapshot({
        status: 'ready',
        generation: this.generation,
        failure: null,
        recoverable: false,
      })
    } catch (error) {
      if (!this.isCurrentEpoch(epoch) || this.snapshot.status === 'stopping') {
        throw new HeadlessCodexClientHostError()
      }

      if (this.snapshot.status !== 'failed') {
        this.publishFailure(mapStartupFailure(error))
      }

      if (transport) {
        try {
          await transport.close()
        } catch (closeError) {
          this.publishFailure(mapCleanupFailure(closeError))
        }
      }

      throw this.currentFailureError()
    }
  }

  private async stopConnection(epoch: number): Promise<void> {
    const transport = this.transport

    try {
      await transport?.close()
      await this.observationPump
    } catch (error) {
      if (this.isCurrentEpoch(epoch)) {
        this.publishFailure(mapCleanupFailure(error))
      }

      throw this.currentFailureError()
    }

    if (this.transport === transport) {
      this.transport = undefined
      this.observationPump = undefined
    }

    if (!this.isCurrentEpoch(epoch)) {
      throw new HeadlessCodexClientHostError()
    }

    this.publishSnapshot({
      status: 'stopped',
      generation: this.generation,
      failure: null,
      recoverable: false,
    })
    this.finishSubscribersAfterDrain()
  }

  private async pumpObservations(
    epoch: number,
    transport: CodexStdioTransport,
    iterator: ObservationIterator,
    firstObservation: Promise<IteratorResult<CodexStdioObservation>>,
  ): Promise<void> {
    try {
      let result = await firstObservation

      while (!result.done) {
        const observation = result.value

        if (
          observation.kind === 'protocol_error' ||
          observation.kind === 'transport_lost'
        ) {
          if (this.isCurrentEpoch(epoch)) {
            this.publishFailure(mapObservationFailure(observation))
          }

          return
        }

        if (
          observation.kind === 'server_request' ||
          observation.kind === 'unknown_server_request'
        ) {
          observation.request.dismiss()
        }

        result = await iterator.next()
      }
    } finally {
      try {
        await transport.close()
      } catch (error) {
        if (this.isCurrentEpoch(epoch)) {
          this.publishFailure(mapCleanupFailure(error))
        }
      }
    }
  }

  private assertCurrentStartingEpoch(epoch: number): void {
    if (!this.isCurrentEpoch(epoch) || this.snapshot.status !== 'starting') {
      throw new HeadlessCodexClientHostError()
    }
  }

  private isCurrentEpoch(epoch: number): boolean {
    return epoch === this.lifecycleEpoch
  }

  private publishFailure(failure: LifecycleFailure): void {
    if (this.snapshot.status === 'stopped') {
      return
    }

    if (
      this.snapshot.status === 'failed' &&
      this.snapshot.failure?.code === failure.code
    ) {
      return
    }

    if (!failure.recoverable) {
      this.permanentlyFailed = true
    }

    this.publishSnapshot({
      status: 'failed',
      generation: this.generation,
      failure: {
        code: failure.code,
        message: failure.message,
      },
      recoverable: failure.recoverable,
    })
  }

  private currentFailureError(): HeadlessCodexClientHostError {
    const failure = this.snapshot.failure

    if (!failure) {
      return new HeadlessCodexClientHostError()
    }

    return new HeadlessCodexClientHostError(
      failure.code,
      this.snapshot.recoverable,
      failure.message,
    )
  }

  private publishSnapshot(
    snapshot: HeadlessCodexClientHostSnapshot,
  ): void {
    this.snapshot = freezeSnapshot(snapshot)
    this.sequence += 1
    const event = Object.freeze({
      kind: 'host_state_changed' as const,
      sequence: this.sequence,
      generation: this.snapshot.generation,
      timestamp: this.testOptions.now?.() ?? new Date().toISOString(),
      snapshot: this.snapshot,
    })

    for (const subscriber of [...this.subscribers]) {
      subscriber.publish(event)
    }
  }

  private finishSubscribersAfterDrain(): void {
    for (const subscriber of [...this.subscribers]) {
      subscriber.finishAfterDrain()
    }
  }
}

export function createHeadlessCodexClientHostForTesting(
  input: ProductRuntimeLayoutInput,
  options: HeadlessCodexClientHostOptions = {},
  testOptions: HeadlessCodexClientHostTestOptions = {},
): HeadlessCodexClientHost {
  const optionsWithTestSeams = { ...options } as OptionsWithTestSeams
  optionsWithTestSeams[testOptionsKey] = testOptions

  return new HeadlessCodexClientHost(input, optionsWithTestSeams)
}

class LifecycleSubscriber
  implements
    AsyncIterable<HeadlessCodexClientHostEvent>,
    AsyncIterator<HeadlessCodexClientHostEvent>
{
  private readonly queue: HeadlessCodexClientHostEvent[] = []
  private readonly pending: Array<
    (result: IteratorResult<HeadlessCodexClientHostEvent>) => void
  > = []
  private terminalError: HeadlessCodexClientHostSubscriptionError | undefined
  private finished = false
  private finishWhenDrained = false

  constructor(
    private readonly bufferLimit: number,
    private readonly onFinish: () => void,
  ) {}

  [Symbol.asyncIterator](): AsyncIterator<HeadlessCodexClientHostEvent> {
    return this
  }

  next(): Promise<IteratorResult<HeadlessCodexClientHostEvent>> {
    const event = this.queue.shift()

    if (event) {
      return Promise.resolve({ done: false, value: event })
    }

    if (this.terminalError) {
      const error = this.terminalError
      this.terminalError = undefined
      return Promise.reject(error)
    }

    if (this.finished || this.finishWhenDrained) {
      this.finished = true
      return Promise.resolve({ done: true, value: undefined })
    }

    return new Promise((resolvePromise) => {
      this.pending.push(resolvePromise)
    })
  }

  return(): Promise<IteratorResult<HeadlessCodexClientHostEvent>> {
    this.unsubscribe()
    return Promise.resolve({ done: true, value: undefined })
  }

  publish(event: HeadlessCodexClientHostEvent): void {
    if (this.finished || this.finishWhenDrained || this.terminalError) {
      return
    }

    const pending = this.pending.shift()

    if (pending) {
      pending({ done: false, value: event })
      return
    }

    if (this.queue.length >= this.bufferLimit) {
      this.queue.length = 0
      this.finished = true
      this.terminalError = new HeadlessCodexClientHostSubscriptionError()
      this.onFinish()
      return
    }

    this.queue.push(event)
  }

  finishAfterDrain(): void {
    if (this.finished || this.terminalError) {
      return
    }

    this.finishWhenDrained = true
    this.onFinish()

    if (this.queue.length === 0) {
      this.finishPending()
    }
  }

  unsubscribe(): void {
    if (this.finished) {
      return
    }

    this.finished = true
    this.queue.length = 0
    this.terminalError = undefined
    this.onFinish()
    this.finishPending()
  }

  private finishPending(): void {
    for (const pending of this.pending.splice(0)) {
      pending({ done: true, value: undefined })
    }
  }
}

function buildProductChildEnvironment(
  layout: ProductRuntimeLayout,
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || !inheritedEnvironmentAllowlist.has(key)) {
      continue
    }

    environment[key] = value
  }

  environment.CODEX_HOME = layout.codexHome
  environment.CODEX_SQLITE_HOME = layout.codexSqliteHome

  return environment
}

function mapStartupFailure(error: unknown): LifecycleFailure {
  if (error instanceof ProductRuntimeLayoutError) {
    return {
      code: error.code,
      message: 'Product runtime layout validation failed',
      recoverable: false,
    }
  }

  if (error instanceof CodexStdioProtocolError) {
    return protocolFailure()
  }

  if (error instanceof CodexStdioRequestError) {
    return {
      code: 'initialize_timeout',
      message: 'Codex app-server initialize timed out',
      recoverable: true,
    }
  }

  if (error instanceof CodexStdioTransportError) {
    if (error.code === 'spawn_error') {
      return spawnFailure()
    }

    if (error.code === 'observation_queue_limit') {
      return protocolFailure()
    }

    if (error.code === 'close_timeout') {
      return cleanupFailure()
    }

    return transportFailure()
  }

  if (error instanceof HeadlessCodexClientHostError) {
    return transportFailure()
  }

  return {
    code: 'initialize_error',
    message: 'Codex app-server initialize failed',
    recoverable: true,
  }
}

function mapObservationFailure(
  observation: Extract<
    CodexStdioObservation,
    { kind: 'protocol_error' | 'transport_lost' }
  >,
): LifecycleFailure {
  if (
    observation.kind === 'protocol_error' ||
    observation.code === 'observation_queue_limit'
  ) {
    return protocolFailure()
  }

  if (observation.code === 'spawn_error') {
    return spawnFailure()
  }

  return transportFailure()
}

function mapCleanupFailure(error: unknown): LifecycleFailure {
  if (
    error instanceof CodexStdioTransportError &&
    error.code === 'close_timeout'
  ) {
    return cleanupFailure()
  }

  return transportFailure()
}

function protocolFailure(): LifecycleFailure {
  return {
    code: 'protocol_error',
    message: 'Codex app-server protocol validation failed',
    recoverable: false,
  }
}

function spawnFailure(): LifecycleFailure {
  return {
    code: 'spawn_error',
    message: 'Codex app-server process could not start',
    recoverable: true,
  }
}

function transportFailure(): LifecycleFailure {
  return {
    code: 'transport_lost',
    message: 'Codex app-server transport was lost',
    recoverable: true,
  }
}

function cleanupFailure(): LifecycleFailure {
  return {
    code: 'close_timeout',
    message: 'Codex app-server cleanup could not confirm child termination',
    recoverable: false,
  }
}

function freezeSnapshot(
  snapshot: HeadlessCodexClientHostSnapshot,
): HeadlessCodexClientHostSnapshot {
  const failure = snapshot.failure
    ? Object.freeze({ ...snapshot.failure })
    : null

  return Object.freeze({ ...snapshot, failure })
}

function readPositiveSafeInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive safe integer`)
  }

  return value
}
