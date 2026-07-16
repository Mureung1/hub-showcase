import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process'
import { lstat } from 'node:fs/promises'
import path from 'node:path'
import type { Writable } from 'node:stream'

import {
  BridgeProtocolError,
  NdjsonBridgeFramer,
  type BridgeOutputFrame,
} from './bridge-protocol.js'
import type {
  CodexChatEvent,
  CodexChatRuntime,
  CodexChatThread,
  CodexChatTurn,
  InterruptTurnInput,
  ReleaseThreadInput,
  StartTurnInput,
} from './contract.js'
import {
  BRIDGE_PROTOCOL_FAILED_MESSAGE,
  CodexChatRuntimeError,
  RUNTIME_CLOSED_MESSAGE,
  RUNTIME_LOST_MESSAGE,
  RUNTIME_START_FAILED_MESSAGE,
} from './errors.js'
import { CodexChatEventStream } from './event-stream.js'
import type { VerifiedProductionBundle } from './production-bundle.js'

type ResultFrame = Extract<BridgeOutputFrame, { type: 'result' }>
type RuntimeState = 'starting' | 'ready' | 'closing' | 'closed' | 'failed'
type CommandName =
  | 'start_thread'
  | 'start_turn'
  | 'interrupt'
  | 'release_thread'

interface PendingOperation<T> {
  readonly command: CommandName
  readonly mutation: boolean
  dispatched: boolean
  reject(error: CodexChatRuntimeError): void
  resolve(frame: ResultFrame): T
  settle(value: T): void
}

interface ActiveTurnRoute {
  readonly stream: CodexChatEventStream
  readonly threadId: string
  readonly turnId: string
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
  /** Package-private actual-child seam; production callers omit this. */
  readonly launchArgsOverride?: readonly string[]
  readonly journalPath?: string
  readonly nativeChildPidPath?: string
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
}

export async function startVerifiedCodexChatRuntime(
  options: StartVerifiedCodexChatRuntimeOptions,
): Promise<SpawnedCodexChatRuntime> {
  await validateWorkspace(options.workspace)
  const args = [
    '-B',
    options.bundle.bridgeEntrypoint,
    '--workspace',
    options.workspace,
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
  const spawnOptions: SpawnOptionsWithoutStdio = {
    cwd: options.workspace,
    detached: process.platform === 'darwin',
    env: process.env,
  }
  const child = spawn(options.bundle.pythonExecutable, args, {
    ...spawnOptions,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const runtime = new NodeCodexChatRuntime(child)
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
  }
}

class NodeCodexChatRuntime implements CodexChatRuntime {
  readonly closed: Promise<void>
  readonly terminal: Promise<CodexChatRuntimeError>

  private readonly child: ChildProcessWithoutNullStreams
  private readonly framer = new NdjsonBridgeFramer()
  private readonly spawned = createDeferred<void>()
  private readonly ready = createDeferred<void>()
  private readonly terminalDeferred = createDeferred<CodexChatRuntimeError>()
  private readonly writer: SerializedBridgeWriter
  private readonly pending = new Map<string, PendingOperation<unknown>>()
  private readonly turns = new Map<string, ActiveTurnRoute>()
  private readonly physicallyClosed: Promise<void>
  private state: RuntimeState = 'starting'
  private terminalError: CodexChatRuntimeError | undefined
  private closePromise: Promise<void> | undefined
  private closeRequestId: string | undefined
  private closeAck: Deferred<void> | undefined
  private childCloseStatus: ChildCloseStatus | undefined
  private nextRequest = 1

  constructor(child: ChildProcessWithoutNullStreams) {
    this.child = child
    this.terminal = this.terminalDeferred.promise
    this.writer = new SerializedBridgeWriter(child.stdin)

    const stdoutEnded = observeReadableEnd(child.stdout, 'stdout')
    const stderrEnded = observeReadableEnd(child.stderr, 'stderr')
    const childClosed = createDeferred<void>()
    this.physicallyClosed = Promise.all([
      childClosed.promise,
      stdoutEnded,
      stderrEnded,
    ]).then(() => undefined)
    this.closed = this.physicallyClosed

    child.once('spawn', () => this.spawned.resolve())
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
      if (this.state === 'closing' && this.closeAck?.settled) {
        if (exitCode !== 0 || signalCode !== null) {
          this.failRuntime(this.runtimeLostError(false))
        }
        return
      }
      if (this.state === 'closed' || this.state === 'failed') return
      this.failRuntime(this.runtimeLostError(false))
    })
    child.stdout.on('data', (chunk: Buffer) => this.receiveBytes(chunk))
    child.stdout.once('end', () => {
      try {
        this.framer.finish()
      } catch {
        this.failProtocol()
        return
      }
      if (this.state === 'closing' && this.closeAck?.settled) return
      if (this.state !== 'closed' && this.state !== 'failed') {
        this.failRuntime(this.runtimeLostError(false))
      }
    })
    child.stdout.once('error', () =>
      this.failRuntime(this.runtimeLostError(false)),
    )
    child.stderr.resume()
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
    await this.spawned.promise
    await this.ready.promise
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
    const stream = new CodexChatEventStream()
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
        this.turns.set(frame.bridgeRequestId, {
          stream,
          threadId: frame.threadId,
          turnId: frame.turnId,
        })
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

  private async closeOnce(): Promise<void> {
    if (this.state === 'closed') return
    if (this.state === 'failed') {
      await this.physicallyClosed
      this.state = 'closed'
      return
    }
    this.state = 'closing'
    const bridgeRequestId = this.allocateRequestId()
    this.closeRequestId = bridgeRequestId
    this.closeAck = createDeferred<void>()
    try {
      await this.writer.write(
        encodeCommand({ bridgeRequestId, command: 'close' }),
      )
      await this.closeAck.promise
    } catch {
      if (!this.terminalError) {
        this.failRuntime(this.runtimeLostError(false))
      }
    }
    await this.physicallyClosed
    if (this.terminalError) throw this.terminalError
    const closeStatus = this.childCloseStatus
    if (
      !closeStatus ||
      closeStatus.exitCode !== 0 ||
      closeStatus.signalCode !== null
    ) {
      const error = this.runtimeLostError(false)
      this.failRuntime(error)
      throw error
    }
    this.state = 'closed'
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
      pending.dispatched = true
      void this.writer
        .write(encodeCommand(createCommand(bridgeRequestId)))
        .catch(() => this.failRuntime(this.runtimeLostError(false)))
    })
    return result
  }

  private receiveBytes(chunk: Buffer): void {
    if (this.state === 'failed' || this.state === 'closed') return
    try {
      for (const frame of this.framer.push(chunk)) this.receiveFrame(frame)
    } catch {
      this.failProtocol()
    }
  }

  private receiveFrame(frame: BridgeOutputFrame): void {
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
        this.failRuntime(
          new CodexChatRuntimeError({
            code: frame.code,
            displayMessage: frame.displayMessage,
            unknownOutcome: false,
          }),
        )
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
      this.pending.delete(frame.bridgeRequestId)
      pending.reject(
        new CodexChatRuntimeError({
          code: frame.code,
          displayMessage: frame.displayMessage,
          unknownOutcome: false,
        }),
      )
      return
    }
    if (frame.type === 'event') {
      this.receiveEvent(frame.bridgeRequestId, frame.event)
      return
    }
    if (frame.type === 'fatal') {
      this.failRuntime(
        new CodexChatRuntimeError({
          code: frame.code,
          displayMessage: frame.displayMessage,
          unknownOutcome: false,
        }),
      )
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
      pending.settle(result)
    } catch {
      this.failProtocol()
    }
  }

  private receiveEvent(bridgeRequestId: string, event: CodexChatEvent): void {
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
    route.stream.push(event)
    if (event.type === 'turn.completed') {
      this.turns.delete(bridgeRequestId)
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

  private failRuntime(error: CodexChatRuntimeError): void {
    if (this.terminalError) return
    this.terminalError = error
    this.state = 'failed'
    this.ready.reject(error)
    this.terminalDeferred.resolve(error)
    for (const [bridgeRequestId, pending] of this.pending) {
      this.pending.delete(bridgeRequestId)
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
      route.stream.push({
        type: 'runtime.failed',
        code: error.code,
        displayMessage: error.displayMessage,
        mutationOutcomeKnown: true,
      })
      route.stream.finish()
    }
    this.closeAck?.reject(error)
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

  private allocateRequestId(): string {
    const requestId = `bridge-${this.nextRequest}`
    this.nextRequest += 1
    return requestId
  }
}

class SerializedBridgeWriter {
  private readonly stream: Writable
  private tail = Promise.resolve()

  constructor(stream: Writable) {
    this.stream = stream
  }

  write(bytes: Buffer): Promise<void> {
    const operation = this.tail.then(
      () =>
        new Promise<void>((resolve, reject) => {
          if (this.stream.destroyed || this.stream.writableEnded) {
            reject(new Error('bridge stdin is closed'))
            return
          }
          this.stream.write(bytes, (error) => {
            if (error) reject(error)
            else resolve()
          })
        }),
    )
    this.tail = operation.catch(() => undefined)
    return operation
  }
}

function encodeCommand(value: Record<string, unknown>): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, 'utf8')
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

async function validateWorkspace(workspace: string): Promise<void> {
  if (!path.isAbsolute(workspace)) {
    throw new TypeError('Codex workspace must be absolute')
  }
  const stats = await lstat(workspace)
  if (!stats.isDirectory()) throw new TypeError('Codex workspace must be a directory')
}

function requireNativeId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError('Native Codex identity must be a nonempty string')
  }
}
