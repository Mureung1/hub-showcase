import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  BridgeProtocolError,
  NdjsonBridgeFramer,
  type BridgeOutputFrame,
} from './bridge-protocol.js'
import {
  type CodexChatEvent,
  type CodexChatRuntime,
  type CodexChatThread,
  type CodexChatTurn,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartTurnInput,
} from './contract.js'
import {
  BRIDGE_PROTOCOL_FAILED_MESSAGE,
  BRIDGE_RUNTIME_FAILED_MESSAGE,
  BUFFER_OVERFLOW_MESSAGE,
  CodexChatRuntimeError,
  RUNTIME_CLEANUP_FAILED_MESSAGE,
  RUNTIME_CLOSED_MESSAGE,
  RUNTIME_CLOSE_TIMEOUT_MESSAGE,
  RUNTIME_LOST_MESSAGE,
  RUNTIME_RESPONSE_TIMEOUT_MESSAGE,
  RUNTIME_START_FAILED_MESSAGE,
  RUNTIME_START_TIMEOUT_MESSAGE,
  RUNTIME_STREAM_IDLE_TIMEOUT_MESSAGE,
  RUNTIME_STREAM_TOTAL_TIMEOUT_MESSAGE,
} from './errors.js'
import {
  AggregateOperationQueueBudget,
  CodexChatEventStream,
} from './event-stream.js'
import {
  BoundedStderrCapture,
  type BoundedStderrSnapshot,
} from './bounded-stderr.js'
import type { VerifiedProductionBundle } from './production-bundle.js'
import { SerializedBridgeWriter } from './serialized-writer.js'

type ResultFrame = Extract<BridgeOutputFrame, { type: 'result' }>
type RuntimeState = 'starting' | 'ready' | 'closing' | 'closed' | 'failed'
type CommandName =
  | 'start_thread'
  | 'start_turn'
  | 'interrupt'
  | 'release_thread'

const BRIDGE_OPERATION_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  active_turn: 'The thread already has an active turn.',
  active_turn_limit: 'The bridge active-turn limit was reached.',
  live_thread_limit: 'The bridge live-thread limit was reached.',
  operation_limit: 'The bridge pending-operation limit was reached.',
  sdk_request_failed: 'Codex rejected the requested operation.',
  unknown_thread: 'The native thread is not live in this bridge.',
  unknown_turn: 'The native turn is not active in this bridge.',
}

const BRIDGE_GENERIC_FATAL_CODES = new Set([
  'bridge_command_loop_failed',
  'bridge_operation_failed',
  'bridge_runtime_failed',
  'duplicate_bridge_request_id',
  'error_serialization_failed',
  'frame_serialization_failed',
  'frame_too_large',
  'invalid_command',
  'invalid_turn_terminal',
  'invalid_utf8',
  'malformed_frame',
  'malformed_json',
  'result_serialization_failed',
  'sdk_close_failed',
  'sdk_initialization_failed',
  'sdk_operation_failed',
  'sdk_stream_ended',
  'sdk_stream_failed',
  'sdk_transport_failed',
  'unexpected_eof',
  'unknown_command',
])

interface PendingOperation<T> {
  readonly command: CommandName
  readonly mutation: boolean
  dispatched: boolean
  deadline?: NodeJS.Timeout
  reject(error: CodexChatRuntimeError): void
  resolve(frame: ResultFrame): T
  settle(value: T): void
}

interface ActiveTurnRoute {
  readonly stream: CodexChatEventStream
  readonly threadId: string
  readonly turnId: string
  idleDeadline?: NodeJS.Timeout
  totalDeadline?: NodeJS.Timeout
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settled: boolean
  resolve(value: T): void
  reject(error: unknown): void
}

interface ChildCloseStatus {
  readonly exitCode: number | null
  readonly signalCode: NodeJS.Signals | null
}

export interface StartVerifiedCodexChatRuntimeOptions {
  readonly bundle: VerifiedProductionBundle
  readonly workspace: string
  readonly environment: CodexChatRuntimeEnvironment
  /** Package-private operational limits; production callers use defaults. */
  readonly budgets?: Partial<NodeRuntimeBudgets>
  /** Package-private actual-child seam; production callers omit this. */
  readonly bridgeEntrypointOverride?: string
  readonly bridgeArgsOverride?: readonly string[]
  /** Package-private deadline injection; production callers use defaults. */
  readonly deadlines?: Partial<NodeRuntimeDeadlines>
  /** Package-private exact-local test isolation; production honors managed config. */
  readonly disableManagedConfigForTest?: true
  /** Package-private actual-child seam; production callers omit this. */
  readonly launchArgsOverride?: readonly string[]
  readonly journalPath?: string
  readonly nativeChildPidPath?: string
  /** Package-private cleanup fault-injection seam. */
  readonly signalProcessGroupOverride?: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
}

export interface NodeRuntimeBudgets {
  readonly operationMaxFrames: number
  readonly operationMaxBytes: number
  readonly aggregateMaxFrames: number
  readonly aggregateMaxBytes: number
  readonly stderrMaxFrames: number
  readonly stderrMaxBytes: number
}

export const DEFAULT_NODE_RUNTIME_BUDGETS: NodeRuntimeBudgets = {
  operationMaxFrames: 4096,
  operationMaxBytes: 16 * 1024 * 1024,
  aggregateMaxFrames: 8192,
  aggregateMaxBytes: 32 * 1024 * 1024,
  stderrMaxFrames: 4096,
  stderrMaxBytes: 16 * 1024 * 1024,
}

export interface NodeRuntimeDeadlines {
  readonly spawnInitializeMs: number
  readonly responseMs: number
  readonly streamIdleMs: number
  readonly streamTotalMs: number
  readonly gracefulCloseMs: number
  readonly terminateMs: number
  readonly postKillMs: number
}

const DEFAULT_NODE_RUNTIME_DEADLINES: NodeRuntimeDeadlines = {
  spawnInitializeMs: 30_000,
  responseMs: 30_000,
  streamIdleMs: 15 * 60_000,
  streamTotalMs: 60 * 60_000,
  gracefulCloseMs: 2_000,
  terminateMs: 2_000,
  postKillMs: 2_000,
}

export interface CodexChatRuntimeEnvironment {
  readonly home: string
  readonly codexHome: string
  readonly codexSqliteHome: string
  readonly tempDirectory: string
}

export interface SpawnedCodexChatRuntime {
  readonly runtime: CodexChatRuntime
  readonly child: ChildProcessWithoutNullStreams
  readonly closed: Promise<void>
  readonly terminal: Promise<CodexChatRuntimeError>
  readonly journalPath: string
  readonly nativeChildPidPath: string
  writeRawForTest(bytes: Buffer): Promise<void>
  receiveRawForTest(bytes: Buffer): void
  stderrDiagnosticForTest(): BoundedStderrSnapshot
}

export async function startVerifiedCodexChatRuntime(
  options: StartVerifiedCodexChatRuntimeOptions,
): Promise<SpawnedCodexChatRuntime> {
  const budgets = resolveRuntimeBudgets(options.budgets)
  const deadlines = resolveRuntimeDeadlines(options.deadlines)
  const [workspace, environment] = await Promise.all([
    validateWorkspace(options.workspace),
    validateEnvironment(options.environment),
  ])
  const args = [
    '-B',
    options.bridgeEntrypointOverride ?? options.bundle.bridgeEntrypoint,
    '--workspace',
    workspace,
    '--site-packages',
    options.bundle.sitePackages,
  ]
  if (options.launchArgsOverride) {
    for (const value of options.launchArgsOverride) {
      // Keep option-looking child arguments (for example `-B`) opaque to the
      // bridge CLI's argparse layer.
      args.push(`--launch-arg=${value}`)
    }
  } else {
    args.push('--codex-bin', options.bundle.nativeExecutable)
  }
  if (options.bridgeArgsOverride) args.push(...options.bridgeArgsOverride)
  const spawnOptions: SpawnOptionsWithoutStdio = {
    cwd: workspace,
    detached: true,
    env: createChildEnvironment(
      options.bundle,
      environment,
      options.disableManagedConfigForTest,
    ),
  }
  const child = spawn(options.bundle.pythonExecutable, args, {
    ...spawnOptions,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const runtime = new NodeCodexChatRuntime(
    child,
    budgets,
    deadlines,
    options.signalProcessGroupOverride ?? signalDetachedProcessGroup,
  )
  try {
    await runtime.waitUntilReady()
  } catch (error) {
    await runtime.closed.catch(() => undefined)
    throw error
  }
  return {
    runtime,
    child,
    closed: runtime.closed,
    terminal: runtime.terminal,
    journalPath: options.journalPath ?? '',
    nativeChildPidPath: options.nativeChildPidPath ?? '',
    writeRawForTest: (bytes) => runtime.writeRawForTest(bytes),
    receiveRawForTest: (bytes) => runtime.receiveRawForTest(bytes),
    stderrDiagnosticForTest: () => runtime.stderrDiagnosticForTest(),
  }
}

class NodeCodexChatRuntime implements CodexChatRuntime {
  readonly closed: Promise<void>
  readonly terminal: Promise<CodexChatRuntimeError>

  private readonly child: ChildProcessWithoutNullStreams
  private readonly budgets: NodeRuntimeBudgets
  private readonly aggregateQueueBudget: AggregateOperationQueueBudget
  private readonly stderrCapture: BoundedStderrCapture
  private readonly deadlines: NodeRuntimeDeadlines
  private readonly processGroupSignaler: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
  private readonly framer = new NdjsonBridgeFramer()
  private readonly spawned = createDeferred<void>()
  private readonly ready = createDeferred<void>()
  private readonly terminalDeferred = createDeferred<CodexChatRuntimeError>()
  private readonly writer: SerializedBridgeWriter
  private readonly pending = new Map<string, PendingOperation<unknown>>()
  private readonly turns = new Map<string, ActiveTurnRoute>()
  private readonly physicallyClosed: Promise<void>
  private readonly cleanupClosed = createDeferred<void>()
  private physicalCloseSettled = false
  private physicalCloseError: unknown
  private processGroupId: number | undefined
  private cleanupPromise: Promise<{ readonly escalated: boolean }> | undefined
  private cleanupEscalationRequested = false
  private state: RuntimeState = 'starting'
  private terminalError: CodexChatRuntimeError | undefined
  private closePromise: Promise<void> | undefined
  private closeRequestId: string | undefined
  private closeAck: Deferred<void> | undefined
  private closeAcknowledged = false
  private childCloseStatus: ChildCloseStatus | undefined
  private stdoutObservedEnd = false
  private nextRequest = 1

  constructor(
    child: ChildProcessWithoutNullStreams,
    budgets: NodeRuntimeBudgets,
    deadlines: NodeRuntimeDeadlines,
    processGroupSignaler: (
      processGroupId: number,
      signal: NodeJS.Signals,
    ) => void,
  ) {
    this.child = child
    this.budgets = budgets
    this.deadlines = deadlines
    this.processGroupSignaler = processGroupSignaler
    this.aggregateQueueBudget = new AggregateOperationQueueBudget(
      budgets.aggregateMaxFrames,
      budgets.aggregateMaxBytes,
    )
    this.stderrCapture = new BoundedStderrCapture({
      maxFrames: budgets.stderrMaxFrames,
      maxBytes: budgets.stderrMaxBytes,
    })
    this.terminal = this.terminalDeferred.promise
    this.writer = new SerializedBridgeWriter(child.stdin, {
      maxFrames: budgets.operationMaxFrames,
      maxBytes: budgets.operationMaxBytes,
      aggregate: this.aggregateQueueBudget,
      onOverflow: () => this.failBufferOverflow(),
    })

    const stdoutEnded = observeReadableEnd(child.stdout, 'stdout')
    const stderrEnded = observeReadableEnd(child.stderr, 'stderr')
    const childClosed = createDeferred<void>()
    this.physicallyClosed = Promise.all([
      childClosed.promise,
      stdoutEnded,
      stderrEnded,
    ]).then(() => undefined)
    this.closed = this.cleanupClosed.promise
    void this.physicallyClosed.then(
      () => {
        this.physicalCloseSettled = true
      },
      (error: unknown) => {
        this.physicalCloseSettled = true
        this.physicalCloseError = error
      },
    )

    child.once('spawn', () => {
      if (!Number.isSafeInteger(child.pid) || (child.pid ?? 0) <= 1) {
        const error = this.cleanupError()
        this.spawned.reject(error)
        this.failRuntime(error)
        return
      }
      this.processGroupId = child.pid
      this.spawned.resolve()
    })
    child.once('error', () => {
      const error = new CodexChatRuntimeError({
        code: 'runtime_start_failed',
        displayMessage: RUNTIME_START_FAILED_MESSAGE,
        unknownOutcome: false,
      })
      this.spawned.reject(error)
      this.failRuntime(error)
    })
    child.once('close', (exitCode, signalCode) => {
      this.childCloseStatus = { exitCode, signalCode }
      childClosed.resolve()
      if (this.state === 'closing') return
      if (this.state === 'closed' || this.state === 'failed') return
      this.failRuntime(this.runtimeLostError(false))
    })
    child.stdout.on('data', (chunk: Buffer) => this.receiveBytes(chunk))
    child.stdout.once('end', () => {
      this.stdoutObservedEnd = true
      try {
        this.framer.finish()
      } catch {
        this.failProtocol()
        return
      }
      if (this.state === 'closing') return
      if (this.state !== 'closed' && this.state !== 'failed') {
        this.failRuntime(this.runtimeLostError(false))
      }
    })
    child.stdout.once('error', () =>
      this.failRuntime(this.runtimeLostError(false)),
    )
    child.stderr.on('data', (chunk: Buffer) => this.stderrCapture.append(chunk))
    child.stderr.once('error', () =>
      this.failRuntime(this.runtimeLostError(false)),
    )
    child.stdin.once('error', () =>
      this.failRuntime(this.runtimeLostError(false)),
    )
    void this.physicallyClosed.catch(() => {
      this.failRuntime(this.runtimeLostError(false))
    })
  }

  async waitUntilReady(): Promise<void> {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        Promise.all([this.spawned.promise, this.ready.promise]),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            const error = new CodexChatRuntimeError({
              code: 'runtime_start_timeout',
              displayMessage: RUNTIME_START_TIMEOUT_MESSAGE,
              unknownOutcome: false,
            })
            this.failRuntime(error)
            reject(error)
          }, this.deadlines.spawnInitializeMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  startThread(): Promise<CodexChatThread> {
    return this.sendOperation(
      'start_thread',
      true,
      (bridgeRequestId) => ({ bridgeRequestId, command: 'start_thread' }),
      (frame) => {
        if (frame.command !== 'start_thread') throw new BridgeProtocolError('mismatch')
        return { threadId: frame.threadId }
      },
    )
  }

  startTurn(input: StartTurnInput): Promise<CodexChatTurn> {
    const threadId = input.threadId
    const text = input.text
    requireNativeId(threadId)
    if (typeof text !== 'string' || text.length === 0) {
      return Promise.reject(
        new TypeError('Codex turn text must be a nonempty string'),
      )
    }
    const stream = new CodexChatEventStream({
      maxFrames: this.budgets.operationMaxFrames,
      maxBytes: this.budgets.operationMaxBytes,
      aggregate: this.aggregateQueueBudget,
      onOverflow: () => this.failBufferOverflow(),
    })
    return this.sendOperation(
      'start_turn',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'start_turn',
        threadId,
        text,
      }),
      (frame) => {
        if (
          frame.command !== 'start_turn' ||
          frame.threadId !== threadId
        ) {
          throw new BridgeProtocolError('mismatch')
        }
        const route: ActiveTurnRoute = {
          stream,
          threadId: frame.threadId,
          turnId: frame.turnId,
        }
        this.turns.set(frame.bridgeRequestId, route)
        this.armTurnDeadlines(route)
        return {
          threadId: frame.threadId,
          turnId: frame.turnId,
          events: stream,
        }
      },
    )
  }

  interrupt(input: InterruptTurnInput): Promise<void> {
    const threadId = input.threadId
    const turnId = input.turnId
    requireNativeId(threadId)
    requireNativeId(turnId)
    return this.sendOperation(
      'interrupt',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'interrupt',
        threadId,
        turnId,
      }),
      (frame) => {
        if (
          frame.command !== 'interrupt' ||
          frame.threadId !== threadId ||
          frame.turnId !== turnId
        ) {
          throw new BridgeProtocolError('mismatch')
        }
      },
    )
  }

  releaseThread(input: ReleaseThreadInput): Promise<void> {
    const threadId = input.threadId
    requireNativeId(threadId)
    return this.sendOperation(
      'release_thread',
      false,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'release_thread',
        threadId,
      }),
      (frame) => {
        if (
          frame.command !== 'release_thread' ||
          frame.threadId !== threadId
        ) {
          throw new BridgeProtocolError('mismatch')
        }
      },
    )
  }

  close(): Promise<void> {
    this.closePromise ??= this.closeOnce()
    return this.closePromise
  }

  writeRawForTest(bytes: Buffer): Promise<void> {
    return this.writer.write(bytes)
  }

  receiveRawForTest(bytes: Buffer): void {
    this.receiveBytes(bytes)
  }

  stderrDiagnosticForTest(): BoundedStderrSnapshot {
    return this.stderrCapture.snapshot()
  }

  private async closeOnce(): Promise<void> {
    if (this.state === 'closed') return
    if (this.state === 'failed') {
      await (this.cleanupPromise ?? this.startCleanup(false))
      this.cleanupClosed.resolve()
      return
    }
    this.state = 'closing'
    const bridgeRequestId = this.allocateRequestId()
    this.closeRequestId = bridgeRequestId
    this.closeAck = createDeferred<void>()
    const cleanup = this.startCleanup(true)
    try {
      await this.writer.write(
        encodeCommand({ bridgeRequestId, command: 'close' }),
      )
    } catch {
      if (!this.terminalError) {
        this.failRuntime(this.runtimeLostError(false))
      }
    }
    const cleanupOutcome = await cleanup
    if (cleanupOutcome.escalated && !this.terminalError) {
      this.failRuntime(this.closeTimeoutError())
    }
    if (!this.closeAcknowledged && !this.terminalError) {
      this.failRuntime(this.runtimeLostError(false))
    }
    if (this.terminalError) throw this.terminalError
    const closeStatus = this.childCloseStatus
    if (
      !closeStatus ||
      closeStatus.exitCode !== 0 ||
      closeStatus.signalCode !== null
    ) {
      const error = this.closeAcknowledged
        ? this.runtimeLostError(false)
        : this.closeTimeoutError()
      this.failRuntime(error)
      throw error
    }
    this.settleOperationsForClose()
    this.state = 'closed'
    this.cleanupClosed.resolve()
  }

  private sendOperation<T>(
    command: CommandName,
    mutation: boolean,
    createCommand: (bridgeRequestId: string) => Record<string, unknown>,
    resolveFrame: (frame: ResultFrame) => T,
  ): Promise<T> {
    const unavailable = this.unavailableError()
    if (unavailable) return Promise.reject(unavailable)
    const bridgeRequestId = this.allocateRequestId()
    const result = new Promise<T>((settle, reject) => {
      const pending: PendingOperation<T> = {
        command,
        mutation,
        dispatched: false,
        reject,
        resolve: resolveFrame,
        settle,
      }
      this.pending.set(
        bridgeRequestId,
        pending as PendingOperation<unknown>,
      )
      pending.deadline = setTimeout(() => {
        if (this.pending.get(bridgeRequestId) !== pending) return
        this.failRuntime(this.responseTimeoutError())
      }, this.deadlines.responseMs)
      void this.writer
        .write(encodeCommand(createCommand(bridgeRequestId)), () => {
          if (this.pending.get(bridgeRequestId) !== pending) return
          pending.dispatched = true
        })
        .catch(() => this.failRuntime(this.runtimeLostError(false)))
    })
    return result
  }

  private receiveBytes(chunk: Buffer): void {
    if (this.state === 'failed' || this.state === 'closed') return
    try {
      for (const measured of this.framer.pushMeasured(chunk)) {
        this.receiveFrame(measured.frame, measured.byteLength)
        if (isTerminalRuntimeState(this.state)) break
      }
    } catch {
      this.failProtocol()
    }
  }

  private receiveFrame(frame: BridgeOutputFrame, byteLength: number): void {
    if (this.closeAcknowledged) {
      this.failProtocol()
      return
    }
    if (frame.type === 'ready') {
      if (this.state !== 'starting' || this.ready.settled) {
        this.failProtocol()
        return
      }
      this.state = 'ready'
      this.ready.resolve()
      return
    }
    if (!this.ready.settled) {
      if (frame.type === 'fatal') {
        const error = decodeBridgeFatal(frame.code, frame.displayMessage)
        if (error) this.failRuntime(error, 'graceful')
        else this.failProtocol()
      } else {
        this.failProtocol()
      }
      return
    }
    if (frame.type === 'result') {
      this.receiveResult(frame)
      return
    }
    if (frame.type === 'error') {
      const pending = this.pending.get(frame.bridgeRequestId)
      if (!pending) {
        this.failProtocol()
        return
      }
      const safeMessage = BRIDGE_OPERATION_ERROR_MESSAGES[frame.code]
      if (!safeMessage || frame.displayMessage !== safeMessage) {
        this.failProtocol()
        return
      }
      this.pending.delete(frame.bridgeRequestId)
      clearPendingDeadline(pending)
      pending.reject(
        new CodexChatRuntimeError({
          code: frame.code,
          displayMessage: safeMessage,
          unknownOutcome: false,
        }),
      )
      return
    }
    if (frame.type === 'event') {
      this.receiveEvent(frame.bridgeRequestId, frame.event, byteLength)
      return
    }
    if (frame.type === 'fatal') {
      const error = decodeBridgeFatal(frame.code, frame.displayMessage)
      if (error) this.failRuntime(error, 'graceful')
      else this.failProtocol()
      return
    }
    if (
      !this.closeAck ||
      this.closeRequestId !== frame.bridgeRequestId ||
      this.closeAck.settled
    ) {
      this.failProtocol()
      return
    }
    this.closeAcknowledged = true
    this.closeAck.resolve()
  }

  private receiveResult(frame: ResultFrame): void {
    const pending = this.pending.get(frame.bridgeRequestId)
    if (!pending || pending.command !== frame.command) {
      this.failProtocol()
      return
    }
    try {
      const result = pending.resolve(frame)
      this.pending.delete(frame.bridgeRequestId)
      clearPendingDeadline(pending)
      pending.settle(result)
    } catch {
      this.failProtocol()
    }
  }

  private receiveEvent(
    bridgeRequestId: string,
    event: CodexChatEvent,
    byteLength: number,
  ): void {
    if (event.type === 'runtime.failed') {
      this.failProtocol()
      return
    }
    const route = this.turns.get(bridgeRequestId)
    if (
      !route ||
      event.threadId !== route.threadId ||
      event.turnId !== route.turnId
    ) {
      this.failProtocol()
      return
    }
    this.resetTurnIdleDeadline(route)
    route.stream.push(event, byteLength)
    if (event.type === 'turn.completed') {
      this.turns.delete(bridgeRequestId)
      clearTurnDeadlines(route)
      route.stream.finish()
    }
  }

  private failProtocol(): void {
    this.failRuntime(
      new CodexChatRuntimeError({
        code: 'bridge_protocol_failed',
        displayMessage: BRIDGE_PROTOCOL_FAILED_MESSAGE,
        unknownOutcome: false,
      }),
    )
  }

  private failBufferOverflow(): void {
    this.failRuntime(
      new CodexChatRuntimeError({
        code: 'buffer_overflow',
        displayMessage: BUFFER_OVERFLOW_MESSAGE,
        unknownOutcome: false,
      }),
    )
  }

  private failRuntime(
    error: CodexChatRuntimeError,
    cleanup: 'graceful' | 'immediate' = 'immediate',
  ): void {
    if (!this.settleRuntimeFailure(error)) return
    if (cleanup === 'immediate') this.cleanupEscalationRequested = true
    void this.startCleanup(cleanup === 'graceful').then(
      () => this.cleanupClosed.resolve(),
      () => undefined,
    )
  }

  private settleRuntimeFailure(error: CodexChatRuntimeError): boolean {
    if (this.terminalError) return false
    this.terminalError = error
    this.state = 'failed'
    this.writer.cancel(error)
    this.ready.reject(error)
    this.terminalDeferred.resolve(error)
    for (const [bridgeRequestId, pending] of this.pending) {
      this.pending.delete(bridgeRequestId)
      clearPendingDeadline(pending)
      pending.reject(
        new CodexChatRuntimeError({
          code: error.code,
          displayMessage: error.displayMessage,
          unknownOutcome: pending.mutation && pending.dispatched,
        }),
      )
    }
    for (const [bridgeRequestId, route] of this.turns) {
      this.turns.delete(bridgeRequestId)
      clearTurnDeadlines(route)
      route.stream.fail({
        type: 'runtime.failed',
        code: error.code,
        displayMessage: error.displayMessage,
        mutationOutcomeKnown: true,
      })
    }
    this.closeAck?.reject(error)
    return true
  }

  private settleOperationsForClose(): void {
    const error = new CodexChatRuntimeError({
      code: 'runtime_closed',
      displayMessage: RUNTIME_CLOSED_MESSAGE,
      unknownOutcome: false,
    })
    this.writer.cancel(error)
    for (const [bridgeRequestId, pending] of this.pending) {
      this.pending.delete(bridgeRequestId)
      clearPendingDeadline(pending)
      pending.reject(
        new CodexChatRuntimeError({
          code: error.code,
          displayMessage: error.displayMessage,
          unknownOutcome: pending.mutation && pending.dispatched,
        }),
      )
    }
    for (const [bridgeRequestId, route] of this.turns) {
      this.turns.delete(bridgeRequestId)
      clearTurnDeadlines(route)
      route.stream.fail({
        type: 'runtime.failed',
        code: error.code,
        displayMessage: error.displayMessage,
        mutationOutcomeKnown: true,
      })
    }
  }

  private unavailableError(): CodexChatRuntimeError | undefined {
    if (this.state === 'ready') return undefined
    if (this.state === 'failed' && this.terminalError) {
      return new CodexChatRuntimeError({
        code: this.terminalError.code,
        displayMessage: this.terminalError.displayMessage,
        unknownOutcome: false,
      })
    }
    return new CodexChatRuntimeError({
      code: 'runtime_closed',
      displayMessage: RUNTIME_CLOSED_MESSAGE,
      unknownOutcome: false,
    })
  }

  private runtimeLostError(unknownOutcome: boolean): CodexChatRuntimeError {
    return new CodexChatRuntimeError({
      code: 'runtime_lost',
      displayMessage: RUNTIME_LOST_MESSAGE,
      unknownOutcome,
    })
  }

  private responseTimeoutError(): CodexChatRuntimeError {
    return new CodexChatRuntimeError({
      code: 'runtime_response_timeout',
      displayMessage: RUNTIME_RESPONSE_TIMEOUT_MESSAGE,
      unknownOutcome: false,
    })
  }

  private armTurnDeadlines(route: ActiveTurnRoute): void {
    route.totalDeadline = setTimeout(() => {
      this.failRuntime(
        new CodexChatRuntimeError({
          code: 'runtime_stream_total_timeout',
          displayMessage: RUNTIME_STREAM_TOTAL_TIMEOUT_MESSAGE,
          unknownOutcome: false,
        }),
      )
    }, this.deadlines.streamTotalMs)
    this.resetTurnIdleDeadline(route)
  }

  private resetTurnIdleDeadline(route: ActiveTurnRoute): void {
    if (route.idleDeadline) clearTimeout(route.idleDeadline)
    route.idleDeadline = setTimeout(() => {
      this.failRuntime(
        new CodexChatRuntimeError({
          code: 'runtime_stream_idle_timeout',
          displayMessage: RUNTIME_STREAM_IDLE_TIMEOUT_MESSAGE,
          unknownOutcome: false,
        }),
      )
    }, this.deadlines.streamIdleMs)
  }

  private allocateRequestId(): string {
    const requestId = `bridge-${this.nextRequest}`
    this.nextRequest += 1
    return requestId
  }

  private startCleanup(
    graceful: boolean,
  ): Promise<{ readonly escalated: boolean }> {
    if (!graceful) this.cleanupEscalationRequested = true
    if (this.cleanupPromise) return this.cleanupPromise
    this.cleanupPromise = this.cleanupProcessTree(graceful).then(
      (outcome) => outcome,
      () => {
        const error = this.cleanupError()
        this.settleRuntimeFailure(error)
        this.cleanupClosed.reject(error)
        throw error
      },
    )
    void this.cleanupPromise.catch(() => undefined)
    return this.cleanupPromise
  }

  private async cleanupProcessTree(
    graceful: boolean,
  ): Promise<{ readonly escalated: boolean }> {
    let escalated = !graceful
    if (graceful) {
      const gracefulResult = await this.waitForTreeCleanup(
        this.deadlines.gracefulCloseMs,
        true,
      )
      if (gracefulResult === 'complete') return { escalated: false }
      escalated = true
    }

    if (
      !graceful &&
      (this.stdoutObservedEnd || this.childCloseStatus) &&
      (await this.waitForTreeCleanup(this.deadlines.terminateMs, false)) ===
        'complete'
    ) {
      return { escalated }
    }

    this.signalProcessGroup('SIGTERM')
    if (
      (await this.waitForTreeCleanup(this.deadlines.terminateMs, false)) ===
      'complete'
    ) {
      return { escalated }
    }

    this.signalProcessGroup('SIGKILL')
    if (
      (await this.waitForTreeCleanup(this.deadlines.postKillMs, false)) ===
      'complete'
    ) {
      return { escalated }
    }
    throw this.cleanupError()
  }

  private async waitForTreeCleanup(
    timeoutMs: number,
    interruptible: boolean,
  ): Promise<'complete' | 'timeout' | 'interrupted'> {
    const deadline = Date.now() + timeoutMs
    while (true) {
      if (this.treeCleanupComplete()) return 'complete'
      if (interruptible && this.cleanupEscalationRequested) {
        return 'interrupted'
      }
      const remaining = deadline - Date.now()
      if (remaining <= 0) return 'timeout'
      await delay(Math.min(10, remaining))
    }
  }

  private treeCleanupComplete(): boolean {
    if (!this.physicalCloseSettled) return false
    if (!this.processGroupId) return true
    try {
      process.kill(-this.processGroupId, 0)
      return false
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (code === 'ESRCH') {
        if (this.physicalCloseError) throw this.cleanupError()
        return true
      }
      if (code === 'EPERM') return false
      throw this.cleanupError()
    }
  }

  private signalProcessGroup(signal: NodeJS.Signals): void {
    if (!this.processGroupId) {
      if (!this.physicalCloseSettled) throw this.cleanupError()
      return
    }
    try {
      this.processGroupSignaler(this.processGroupId, signal)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
        throw this.cleanupError()
      }
    }
  }

  private closeTimeoutError(): CodexChatRuntimeError {
    return new CodexChatRuntimeError({
      code: 'runtime_close_timeout',
      displayMessage: RUNTIME_CLOSE_TIMEOUT_MESSAGE,
      unknownOutcome: false,
    })
  }

  private cleanupError(): CodexChatRuntimeError {
    return new CodexChatRuntimeError({
      code: 'runtime_cleanup_failed',
      displayMessage: RUNTIME_CLEANUP_FAILED_MESSAGE,
      unknownOutcome: false,
    })
  }
}

function isTerminalRuntimeState(state: RuntimeState): boolean {
  return state === 'failed' || state === 'closed'
}

function encodeCommand(value: Record<string, unknown>): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8')
}

function clearPendingDeadline(pending: PendingOperation<unknown>): void {
  if (!pending.deadline) return
  clearTimeout(pending.deadline)
  pending.deadline = undefined
}

function clearTurnDeadlines(route: ActiveTurnRoute): void {
  if (route.idleDeadline) clearTimeout(route.idleDeadline)
  if (route.totalDeadline) clearTimeout(route.totalDeadline)
  route.idleDeadline = undefined
  route.totalDeadline = undefined
}

function decodeBridgeFatal(
  code: string,
  displayMessage: string,
): CodexChatRuntimeError | undefined {
  if (code === 'buffer_overflow') {
    if (displayMessage !== 'The bridge output buffer overflowed.') return undefined
    return new CodexChatRuntimeError({
      code,
      displayMessage: BUFFER_OVERFLOW_MESSAGE,
      unknownOutcome: false,
    })
  }
  if (code === 'event_serialization_failed') {
    if (
      displayMessage !== 'A Codex event could not be serialized safely.'
    ) {
      return undefined
    }
    return new CodexChatRuntimeError({
      code,
      displayMessage: 'A Codex event could not be serialized safely.',
      unknownOutcome: false,
    })
  }
  if (
    !BRIDGE_GENERIC_FATAL_CODES.has(code) ||
    displayMessage !== BRIDGE_RUNTIME_FAILED_MESSAGE
  ) {
    return undefined
  }
  return new CodexChatRuntimeError({
    code,
    displayMessage: BRIDGE_RUNTIME_FAILED_MESSAGE,
    unknownOutcome: false,
  })
}

function createDeferred<T>(): Deferred<T> {
  let settled = false
  let resolvePromise!: (value: T) => void
  let rejectPromise!: (error: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve
    rejectPromise = reject
  })
  void promise.catch(() => undefined)
  return {
    promise,
    get settled() {
      return settled
    },
    resolve(value) {
      if (settled) return
      settled = true
      resolvePromise(value)
    },
    reject(error) {
      if (settled) return
      settled = true
      rejectPromise(error)
    },
  }
}

function observeReadableEnd(
  stream: NodeJS.ReadableStream,
  label: string,
): Promise<void> {
  if ('readableEnded' in stream && stream.readableEnded) return Promise.resolve()
  return new Promise((resolve, reject) => {
    let ended = false
    stream.once('end', () => {
      ended = true
      resolve()
    })
    stream.once('error', () => reject(new Error(`${label} failed`)))
    stream.once('close', () => {
      if (!ended && !('readableEnded' in stream && stream.readableEnded)) {
        reject(new Error(`${label} closed before end`))
      }
    })
  })
}

async function validateWorkspace(workspace: string): Promise<string> {
  if (!path.isAbsolute(workspace)) {
    throw new TypeError('Codex workspace must be absolute')
  }
  try {
    const stats = await lstat(workspace)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new TypeError('Codex workspace must be a directory')
    }
    await access(workspace, fsConstants.R_OK | fsConstants.X_OK)
    return await realpath(workspace)
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError('Codex workspace could not be validated')
  }
}

async function validateEnvironment(
  environment: CodexChatRuntimeEnvironment,
): Promise<CodexChatRuntimeEnvironment> {
  const [home, codexHome, codexSqliteHome, tempDirectory] = await Promise.all([
    validateControlledDirectory(environment.home, 'runtime home'),
    validateControlledDirectory(environment.codexHome, 'Codex home'),
    validateControlledDirectory(environment.codexSqliteHome, 'Codex SQLite home'),
    validateControlledDirectory(environment.tempDirectory, 'runtime temporary directory'),
  ])
  if (new Set([home, codexHome, codexSqliteHome, tempDirectory]).size !== 4) {
    throw new TypeError('Codex runtime directories must be distinct')
  }
  return { home, codexHome, codexSqliteHome, tempDirectory }
}

async function validateControlledDirectory(
  directory: string,
  label: string,
): Promise<string> {
  if (!path.isAbsolute(directory)) {
    throw new TypeError(`${label} must be absolute`)
  }
  try {
    const stats = await lstat(directory)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new TypeError(`${label} must be a directory`)
    }
    await access(
      directory,
      fsConstants.R_OK | fsConstants.W_OK | fsConstants.X_OK,
    )
    return await realpath(directory)
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError(`${label} could not be validated`)
  }
}

function createChildEnvironment(
  bundle: VerifiedProductionBundle,
  environment: CodexChatRuntimeEnvironment,
  disableManagedConfigForTest: true | undefined,
): NodeJS.ProcessEnv {
  const pathDirectories = [
    bundle.codexPathDirectory,
    path.dirname(bundle.pythonExecutable),
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
  if (
    pathDirectories.some(
      (directory) => directory.length === 0 || directory.includes(path.delimiter),
    )
  ) {
    throw new TypeError('Codex runtime PATH contains an invalid directory')
  }
  return {
    ...(disableManagedConfigForTest
      ? { CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG: '1' }
      : {}),
    CODEX_HOME: environment.codexHome,
    CODEX_SQLITE_HOME: environment.codexSqliteHome,
    HOME: environment.home,
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: [...new Set(pathDirectories)].join(':'),
    PYTHONDONTWRITEBYTECODE: '1',
    PYTHONNOUSERSITE: '1',
    PYTHONUTF8: '1',
    PYTHONUNBUFFERED: '1',
    TMPDIR: environment.tempDirectory,
  }
}

function resolveRuntimeBudgets(
  overrides: Partial<NodeRuntimeBudgets> | undefined,
): NodeRuntimeBudgets {
  const budgets = { ...DEFAULT_NODE_RUNTIME_BUDGETS, ...overrides }
  for (const [name, value] of Object.entries(budgets)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new TypeError(`${name} must be a positive safe integer`)
    }
  }
  if (
    budgets.aggregateMaxFrames < budgets.operationMaxFrames ||
    budgets.aggregateMaxBytes < budgets.operationMaxBytes
  ) {
    throw new TypeError('aggregate queue limits must cover one operation queue')
  }
  return budgets
}

function resolveRuntimeDeadlines(
  overrides: Partial<NodeRuntimeDeadlines> | undefined,
): NodeRuntimeDeadlines {
  const deadlines = { ...DEFAULT_NODE_RUNTIME_DEADLINES, ...overrides }
  for (const [name, value] of Object.entries(deadlines)) {
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value > 2_147_483_647
    ) {
      throw new TypeError(`${name} must be a valid positive timer delay`)
    }
  }
  return deadlines
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

function signalDetachedProcessGroup(
  processGroupId: number,
  signal: NodeJS.Signals,
): void {
  process.kill(-processGroupId, signal)
}

function requireNativeId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Native Codex identity must be a nonempty string')
  }
}
