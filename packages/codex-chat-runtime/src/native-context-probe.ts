/// <reference types="node" />

import {
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process'
import { lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import type {
  CodexEffectiveConfig,
  CodexEffectiveSkill,
} from './account-contract.js'
import {
  BoundedStderrCapture,
  type BoundedStderrSnapshot,
} from './bounded-stderr.js'
import {
  reverifyProductionBundle,
  type VerifiedProductionBundle,
} from './production-bundle.js'
import {
  decodeNativeContextConfig,
  decodeNativeContextInitialize,
  decodeNativeContextSkills,
  parseNativeContextJsonLine,
} from './native-context-probe-protocol.js'

type JsonObject = Record<string, unknown>
type ProbeState =
  | 'starting'
  | 'running'
  | 'closing'
  | 'closed'
  | 'failed'

const APP_SERVER_ARGS = [
  '--config',
  'project_root_markers=[]',
  'app-server',
  '--listen',
  'stdio://',
] as const
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u
const ACTIVE_PROBE_SESSIONS = new Set<symbol>()
const ACTIVE_PENDING_RESPONSES = new Set<PendingResponse>()
const ACTIVE_PROCESS_GROUPS = new Set<number>()

export interface NativeContextProbeApplication {
  readonly name: 'ay-ple'
  readonly title: 'AY-PLE'
  readonly version: string
}

export interface NativeContextProbeEnvironment {
  readonly home: string
  readonly codexHome: string
  readonly codexSqliteHome: string
  readonly tempDirectory: string
}

export interface NativeContextProbeBudgets {
  readonly stdoutMaxFrames: number
  readonly stdoutMaxBytes: number
  readonly stdoutMaxLineBytes: number
  readonly stderrMaxFrames: number
  readonly stderrMaxBytes: number
}

export interface NativeContextProbeDeadlines {
  readonly startupMs: number
  readonly responseMs: number
  readonly gracefulCloseMs: number
  readonly terminateMs: number
  readonly postKillMs: number
}

export interface NativeContextProbeSnapshot {
  readonly config: CodexEffectiveConfig
  readonly skills: readonly CodexEffectiveSkill[]
}

export type NativeContextProbeErrorCode =
  | 'aborted'
  | 'cleanup_failed'
  | 'protocol_failed'
  | 'request_failed'
  | 'response_timeout'
  | 'shutdown_failed'
  | 'start_failed'
  | 'start_timeout'

export class NativeContextProbeError extends Error {
  readonly code: NativeContextProbeErrorCode
  readonly diagnostic: BoundedStderrSnapshot
  readonly unknownOutcome = false

  constructor(input: {
    readonly code: NativeContextProbeErrorCode
    readonly diagnostic?: BoundedStderrSnapshot
    readonly cause?: unknown
  }) {
    super(PROBE_ERROR_MESSAGES[input.code], { cause: input.cause })
    this.name = 'NativeContextProbeError'
    this.code = input.code
    this.diagnostic = input.diagnostic ?? EMPTY_STDERR
  }
}

export interface RunNativeContextProbeOptions {
  readonly bundle: VerifiedProductionBundle
  readonly workspace: string
  readonly environment: NativeContextProbeEnvironment
  readonly application: NativeContextProbeApplication
  readonly signal: AbortSignal
  /** Package-private operational limits; production callers use defaults. */
  readonly budgets?: Partial<NativeContextProbeBudgets>
  /** Package-private deadline injection; production callers use defaults. */
  readonly deadlines?: Partial<NativeContextProbeDeadlines>
  /** Package-private actual-child seam; production callers omit this. */
  readonly testCommandOverride?: readonly [string, ...string[]]
  /** Package-private actual-child journal seam; production callers omit this. */
  readonly testJournalPath?: string
  /** Package-private launch-attestation seam; production callers omit this. */
  readonly testBundleReattestationOverride?: (
    bundle: VerifiedProductionBundle,
  ) => Promise<VerifiedProductionBundle>
  /** Package-private exact-local test isolation; production honors managed config. */
  readonly disableManagedConfigForTest?: true
  /** Package-private cleanup observation/fault-injection seam. */
  readonly signalProcessGroupOverride?: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
}

const DEFAULT_BUDGETS: NativeContextProbeBudgets = {
  stdoutMaxFrames: 16,
  stdoutMaxBytes: 2 * 1024 * 1024,
  stdoutMaxLineBytes: 1024 * 1024,
  stderrMaxFrames: 256,
  stderrMaxBytes: 256 * 1024,
}

const DEFAULT_DEADLINES: NativeContextProbeDeadlines = {
  startupMs: 30_000,
  responseMs: 30_000,
  gracefulCloseMs: 2_000,
  terminateMs: 2_000,
  postKillMs: 2_000,
}

const EMPTY_STDERR = Object.freeze({
  bytes: 0,
  frames: 0,
  text: '',
  truncated: false,
})

const PROBE_ERROR_MESSAGES: Readonly<
  Record<NativeContextProbeErrorCode, string>
> = {
  aborted: 'The Codex native context query was cancelled.',
  cleanup_failed: 'The Codex native context process could not be reaped.',
  protocol_failed: 'The Codex native context response was invalid.',
  request_failed: 'Codex rejected the native context query.',
  response_timeout: 'The Codex native context query timed out.',
  shutdown_failed: 'The Codex native context process did not close cleanly.',
  start_failed: 'The Codex native context process could not be started.',
  start_timeout: 'The Codex native context process did not start in time.',
}

export async function runNativeContextProbe(
  options: RunNativeContextProbeOptions,
): Promise<NativeContextProbeSnapshot> {
  const validated = await validateOptions(options)
  if (validated.signal.aborted) {
    throw new NativeContextProbeError({ code: 'aborted' })
  }

  let freshBundle: VerifiedProductionBundle
  try {
    freshBundle = await (
      validated.testBundleReattestationOverride ??
      reverifyProductionBundle
    )(validated.bundle)
  } catch (cause) {
    throw new NativeContextProbeError({ code: 'start_failed', cause })
  }
  if (validated.signal.aborted) {
    throw new NativeContextProbeError({ code: 'aborted' })
  }
  const launchOptions = {
    ...validated,
    bundle: freshBundle,
  }
  const command = resolveCommand(
    launchOptions.bundle,
    launchOptions.testCommandOverride,
  )
  const spawnOptions: SpawnOptionsWithoutStdio = {
    cwd: launchOptions.workspace,
    detached: true,
    env: createChildEnvironment(launchOptions),
  }
  let child: ChildProcessWithoutNullStreams
  try {
    child = spawn(command[0], command.slice(1), {
      ...spawnOptions,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
  } catch (cause) {
    throw new NativeContextProbeError({ code: 'start_failed', cause })
  }

  const session = new NativeContextProbeSession(child, launchOptions)
  return session.run()
}

class NativeContextProbeSession {
  private readonly child: ChildProcessWithoutNullStreams
  private readonly options: ValidatedOptions
  private readonly stderr: BoundedStderrCapture
  private readonly childClosed = createDeferred<ChildCloseStatus>()
  private readonly spawned = createDeferred<void>()
  private readonly terminal = createDeferred<NativeContextProbeError>()
  private readonly processGroupSignaler: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
  private pending: PendingResponse | undefined
  private state: ProbeState = 'starting'
  private terminalError: NativeContextProbeError | undefined
  private processGroupId: number | undefined
  private stdoutBuffer = Buffer.alloc(0)
  private stdoutBytes = 0
  private stdoutFrames = 0
  private readonly resourceToken = Symbol('native-context-probe')

  constructor(
    child: ChildProcessWithoutNullStreams,
    options: ValidatedOptions,
  ) {
    this.child = child
    this.options = options
    this.stderr = new BoundedStderrCapture({
      maxFrames: options.budgets.stderrMaxFrames,
      maxBytes: options.budgets.stderrMaxBytes,
    })
    this.processGroupSignaler =
      options.signalProcessGroupOverride ?? signalDetachedProcessGroup
    ACTIVE_PROBE_SESSIONS.add(this.resourceToken)

    child.once('spawn', () => {
      if (!Number.isSafeInteger(child.pid) || (child.pid ?? 0) <= 1) {
        this.fail('start_failed')
        return
      }
      const processGroupId = child.pid as number
      this.processGroupId = processGroupId
      ACTIVE_PROCESS_GROUPS.add(processGroupId)
      if (this.terminalError) {
        this.state = 'failed'
        return
      }
      this.state = 'running'
      this.spawned.resolve()
    })
    child.once('error', (cause) => {
      if (!this.processGroupId) {
        this.childClosed.resolve({ exitCode: null, signalCode: null })
      }
      this.fail('start_failed', cause)
    })
    child.once('close', (exitCode, signalCode) => {
      this.childClosed.resolve({ exitCode, signalCode })
      if (
        this.state !== 'closing' &&
        this.state !== 'closed' &&
        this.state !== 'failed'
      ) {
        this.fail('protocol_failed')
      }
    })
    child.stdout.on('data', (chunk: Buffer) => this.receiveBytes(chunk))
    child.stdout.once('end', () => this.finishStdout())
    child.stdout.once('error', (cause) =>
      this.fail('protocol_failed', cause),
    )
    child.stderr.on('data', (chunk: Buffer) => this.stderr.append(chunk))
    child.stderr.once('error', (cause) =>
      this.fail('protocol_failed', cause),
    )
    child.stdin.once('error', (cause) => {
      if (this.state !== 'closing' && this.state !== 'closed') {
        this.fail('protocol_failed', cause)
      }
    })

    const onAbort = () => this.fail('aborted')
    options.signal.addEventListener('abort', onAbort, { once: true })
    if (options.signal.aborted) onAbort()
    this.childClosed.promise.finally(() => {
      options.signal.removeEventListener('abort', onAbort)
    })
  }

  async run(): Promise<NativeContextProbeSnapshot> {
    let operationError: NativeContextProbeError | undefined
    try {
      await this.awaitSpawn()
      const initialize = await this.request(
        1,
        'initialize',
        {
          clientInfo: this.options.application,
          capabilities: { experimentalApi: true },
        },
        this.options.deadlines.startupMs,
        'start_timeout',
      )
      decodeNativeContextInitialize(
        initialize,
        this.options.environment.codexHome,
      )
      await this.writeFrameOrTerminal({ method: 'initialized' })

      const config = decodeNativeContextConfig(
        await this.request(
          2,
          'config/read',
          {
            cwd: this.options.workspace,
            includeLayers: true,
          },
          this.options.deadlines.responseMs,
          'response_timeout',
        ),
      )
      const skills = decodeNativeContextSkills(
        await this.request(
          3,
          'skills/list',
          {
            cwds: [this.options.workspace],
            forceReload: true,
          },
          this.options.deadlines.responseMs,
          'response_timeout',
        ),
        this.options.workspace,
      )
      const snapshot = Object.freeze({
        config,
        skills,
      })

      this.state = 'closing'
      this.endStdin()
      const escalated = await this.cleanup(false)
      if (escalated) {
        throw this.error('shutdown_failed')
      }
      const closeStatus = await this.childClosed.promise
      if (
        closeStatus.exitCode !== 0 ||
        closeStatus.signalCode !== null ||
        this.terminalError
      ) {
        throw this.terminalError ?? this.error('protocol_failed')
      }
      this.state = 'closed'
      return snapshot
    } catch (cause) {
      operationError = this.normalizeError(cause)
      this.state = 'failed'
      try {
        await this.cleanup(true)
      } catch (cleanupCause) {
        throw this.error('cleanup_failed', cleanupCause)
      }
      throw operationError
    } finally {
      ACTIVE_PROBE_SESSIONS.delete(this.resourceToken)
    }
  }

  private async awaitSpawn(): Promise<void> {
    let timer: NodeJS.Timeout | undefined
    try {
      await Promise.race([
        this.spawned.promise,
        this.terminal.promise.then((error) => Promise.reject(error)),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            const error = this.error('start_timeout')
            this.failError(error)
            reject(error)
          }, this.options.deadlines.startupMs)
        }),
      ])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  private async request(
    id: number,
    method: string,
    params: JsonObject,
    timeoutMs: number,
    timeoutCode: 'start_timeout' | 'response_timeout',
  ): Promise<unknown> {
    if (this.pending || this.terminalError || this.state !== 'running') {
      throw this.terminalError ?? this.error('protocol_failed')
    }
    const deferred = createDeferred<unknown>()
    const pending: PendingResponse = {
      id,
      deferred,
      timeout: setTimeout(() => this.fail(timeoutCode), timeoutMs),
    }
    this.pending = pending
    ACTIVE_PENDING_RESPONSES.add(pending)
    try {
      await this.writeFrameOrTerminal({ id, method, params })
    } catch (cause) {
      this.fail('protocol_failed', cause)
    }
    try {
      return await Promise.race([
        deferred.promise,
        this.terminal.promise.then((error) => Promise.reject(error)),
      ])
    } finally {
      clearTimeout(pending.timeout)
      ACTIVE_PENDING_RESPONSES.delete(pending)
    }
  }

  private writeFrame(frame: JsonObject): Promise<void> {
    const encoded = Buffer.from(`${JSON.stringify(frame)}\n`, 'utf8')
    return new Promise((resolve, reject) => {
      this.child.stdin.write(encoded, (error) => {
        if (error) reject(error)
        else resolve()
      })
    })
  }

  private writeFrameOrTerminal(frame: JsonObject): Promise<void> {
    return Promise.race([
      this.writeFrame(frame),
      this.terminal.promise.then((error) => Promise.reject(error)),
    ])
  }

  private receiveBytes(chunk: Buffer): void {
    if (this.terminalError || this.state === 'closed') return
    this.stdoutBytes += chunk.byteLength
    if (this.stdoutBytes > this.options.budgets.stdoutMaxBytes) {
      this.fail('protocol_failed')
      return
    }
    this.stdoutBuffer = Buffer.concat(
      [this.stdoutBuffer, chunk],
      this.stdoutBuffer.byteLength + chunk.byteLength,
    )
    while (true) {
      const newline = this.stdoutBuffer.indexOf(0x0a)
      if (newline < 0) {
        if (
          this.stdoutBuffer.byteLength >
          this.options.budgets.stdoutMaxLineBytes
        ) {
          this.fail('protocol_failed')
        }
        return
      }
      if (newline > this.options.budgets.stdoutMaxLineBytes) {
        this.fail('protocol_failed')
        return
      }
      const line = this.stdoutBuffer.subarray(0, newline)
      this.stdoutBuffer = this.stdoutBuffer.subarray(newline + 1)
      this.stdoutFrames += 1
      if (
        this.stdoutFrames > this.options.budgets.stdoutMaxFrames ||
        line.byteLength === 0 ||
        line[line.byteLength - 1] === 0x0d
      ) {
        this.fail('protocol_failed')
        return
      }
      try {
        this.receiveFrame(parseNativeContextJsonLine(line))
      } catch (cause) {
        this.fail('protocol_failed', cause)
        return
      }
      if (this.terminalError) return
    }
  }

  private receiveFrame(frame: JsonObject): void {
    if (!Object.hasOwn(frame, 'id')) {
      if (
        !hasExactKeys(frame, ['method', 'params']) ||
        typeof frame.method !== 'string' ||
        frame.method.length === 0 ||
        Buffer.byteLength(frame.method, 'utf8') > 256 ||
        /[\u0000-\u001f\u007f]/u.test(frame.method) ||
        !isJsonObject(frame.params)
      ) {
        throw new Error('invalid native context notification')
      }
      return
    }
    const pending = this.pending
    if (!pending || frame.id !== pending.id) {
      throw new Error('unexpected native context response')
    }
    if (Object.hasOwn(frame, 'error')) {
      if (
        !hasExactKeys(frame, ['id', 'error']) ||
        !isJsonObject(frame.error)
      ) {
        throw new Error('invalid native context error response')
      }
      const error = frame.error
      if (
        !hasAllowedKeys(error, ['code', 'message', 'data']) ||
        !Object.hasOwn(error, 'code') ||
        !(
          Number.isSafeInteger(error.code) ||
          (typeof error.code === 'string' &&
            error.code.length > 0 &&
            Buffer.byteLength(error.code, 'utf8') <= 128)
        ) ||
        typeof error.message !== 'string' ||
        Buffer.byteLength(error.message, 'utf8') > 16 * 1024
      ) {
        throw new Error('invalid native context error response')
      }
      this.pending = undefined
      clearTimeout(pending.timeout)
      const requestError = this.error('request_failed')
      pending.deferred.reject(requestError)
      this.failError(requestError)
      return
    }
    if (!hasExactKeys(frame, ['id', 'result'])) {
      throw new Error('invalid native context result response')
    }
    this.pending = undefined
    clearTimeout(pending.timeout)
    pending.deferred.resolve(frame.result)
  }

  private finishStdout(): void {
    if (this.stdoutBuffer.byteLength !== 0) {
      this.fail('protocol_failed')
      return
    }
    if (
      this.state !== 'closing' &&
      this.state !== 'closed' &&
      !this.terminalError
    ) {
      this.fail('protocol_failed')
    }
  }

  private fail(
    code: NativeContextProbeErrorCode,
    cause?: unknown,
  ): void {
    this.failError(this.error(code, cause))
  }

  private failError(error: NativeContextProbeError): void {
    if (this.terminalError) return
    this.terminalError = error
    this.state = 'failed'
    const pending = this.pending
    this.pending = undefined
    if (pending) {
      clearTimeout(pending.timeout)
      pending.deferred.reject(error)
    }
    this.spawned.reject(error)
    this.terminal.resolve(error)
  }

  private error(
    code: NativeContextProbeErrorCode,
    cause?: unknown,
  ): NativeContextProbeError {
    return new NativeContextProbeError({
      code,
      diagnostic: this.stderr.snapshot(),
      cause,
    })
  }

  private normalizeError(cause: unknown): NativeContextProbeError {
    if (cause instanceof NativeContextProbeError) return cause
    return this.error('protocol_failed', cause)
  }

  private endStdin(): void {
    if (this.child.stdin.destroyed || this.child.stdin.writableEnded) return
    this.child.stdin.end()
  }

  private async cleanup(force: boolean): Promise<boolean> {
    this.endStdin()
    if (!this.processGroupId) {
      const deadline = Date.now() + this.options.deadlines.postKillMs
      while (
        !this.processGroupId &&
        !this.childClosed.settled &&
        Date.now() < deadline
      ) {
        await delay(Math.min(10, Math.max(1, deadline - Date.now())))
      }
      if (this.childClosed.settled) return false
      if (!this.processGroupId) throw this.error('cleanup_failed')
    }
    if (
      !force &&
      (await this.waitForTreeGone(this.options.deadlines.gracefulCloseMs))
    ) {
      ACTIVE_PROCESS_GROUPS.delete(this.processGroupId)
      return false
    }

    this.signalProcessGroup('SIGTERM')
    if (await this.waitForTreeGone(this.options.deadlines.terminateMs)) {
      ACTIVE_PROCESS_GROUPS.delete(this.processGroupId)
      return true
    }
    this.signalProcessGroup('SIGKILL')
    if (await this.waitForTreeGone(this.options.deadlines.postKillMs)) {
      ACTIVE_PROCESS_GROUPS.delete(this.processGroupId)
      return true
    }
    throw this.error('cleanup_failed')
  }

  private async waitForTreeGone(timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (
        this.childClosed.settled &&
        !processGroupExists(this.processGroupId as number)
      ) {
        return true
      }
      await delay(Math.min(10, Math.max(1, deadline - Date.now())))
    }
    return (
      this.childClosed.settled &&
      !processGroupExists(this.processGroupId as number)
    )
  }

  private signalProcessGroup(signal: NodeJS.Signals): void {
    if (!this.processGroupId) return
    try {
      this.processGroupSignaler(this.processGroupId, signal)
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code !== 'ESRCH') throw cause
    }
  }
}

interface ChildCloseStatus {
  readonly exitCode: number | null
  readonly signalCode: NodeJS.Signals | null
}

interface PendingResponse {
  readonly id: number
  readonly deferred: Deferred<unknown>
  readonly timeout: NodeJS.Timeout
}

interface Deferred<T> {
  readonly promise: Promise<T>
  readonly settled: boolean
  resolve(value: T): void
  reject(error: unknown): void
}

interface ValidatedOptions
  extends Omit<
    RunNativeContextProbeOptions,
    'budgets' | 'deadlines' | 'environment' | 'application'
  > {
  readonly budgets: NativeContextProbeBudgets
  readonly deadlines: NativeContextProbeDeadlines
  readonly environment: NativeContextProbeEnvironment
  readonly application: NativeContextProbeApplication
}

async function validateOptions(
  options: RunNativeContextProbeOptions,
): Promise<ValidatedOptions> {
  requireAbortSignal(options.signal)
  const workspace = await requireCanonicalDirectory(
    options.workspace,
    'workspace',
  )
  requireExactKeys(
    options.environment,
    ['home', 'codexHome', 'codexSqliteHome', 'tempDirectory'],
    'native context environment',
  )
  const environment = Object.freeze({
    home: await requireCanonicalDirectory(
      options.environment.home,
      'controlled HOME',
    ),
    codexHome: await requireCanonicalDirectory(
      options.environment.codexHome,
      'controlled CODEX_HOME',
    ),
    codexSqliteHome: await requireCanonicalDirectory(
      options.environment.codexSqliteHome,
      'controlled CODEX_SQLITE_HOME',
    ),
    tempDirectory: await requireCanonicalDirectory(
      options.environment.tempDirectory,
      'controlled TMPDIR',
    ),
  })
  const roots = [workspace, ...Object.values(environment)]
  if (new Set(roots).size !== roots.length) {
    throw new TypeError('Native context roots must be distinct')
  }
  for (let left = 0; left < roots.length; left += 1) {
    for (let right = left + 1; right < roots.length; right += 1) {
      if (pathsOverlap(roots[left]!, roots[right]!)) {
        throw new TypeError('Native context roots must not overlap')
      }
    }
  }

  requireExactKeys(
    options.application,
    ['name', 'title', 'version'],
    'native context application identity',
  )
  if (
    options.application.name !== 'ay-ple' ||
    options.application.title !== 'AY-PLE' ||
    !SEMVER.test(options.application.version) ||
    Buffer.byteLength(options.application.version, 'utf8') > 128
  ) {
    throw new TypeError('Native context application identity is invalid')
  }
  const application = Object.freeze({ ...options.application })
  const budgets = resolvePositiveLimits(DEFAULT_BUDGETS, options.budgets)
  if (budgets.stdoutMaxBytes < budgets.stdoutMaxLineBytes) {
    throw new TypeError(
      'Native context stdout aggregate limit must cover one line',
    )
  }
  const deadlines = resolvePositiveLimits(
    DEFAULT_DEADLINES,
    options.deadlines,
  )
  if (
    options.testJournalPath !== undefined &&
    options.testCommandOverride === undefined
  ) {
    throw new TypeError(
      'Native context test journal requires a test command override',
    )
  }
  if (
    options.testBundleReattestationOverride !== undefined &&
    options.testCommandOverride === undefined
  ) {
    throw new TypeError(
      'Native context test attestation requires a test command override',
    )
  }
  if (
    options.testJournalPath !== undefined &&
    (!path.isAbsolute(options.testJournalPath) ||
      options.testJournalPath.includes('\0'))
  ) {
    throw new TypeError('Native context test journal path is invalid')
  }
  if (options.testCommandOverride) {
    validateCommand(options.testCommandOverride)
  }
  return {
    ...options,
    workspace,
    environment,
    application,
    budgets,
    deadlines,
  }
}

function resolvePositiveLimits<T extends object>(
  defaults: T,
  overrides: Partial<T> | undefined,
): T {
  const values = { ...defaults, ...overrides }
  for (const [name, value] of Object.entries(values)) {
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      value > 2_147_483_647
    ) {
      throw new TypeError(`${name} must be a positive safe integer`)
    }
  }
  return Object.freeze(values) as T
}

function resolveCommand(
  bundle: VerifiedProductionBundle,
  override: readonly [string, ...string[]] | undefined,
): readonly [string, ...string[]] {
  const command = override
    ? [...override]
    : [bundle.nativeExecutable, ...APP_SERVER_ARGS]
  validateCommand(command)
  return Object.freeze(command) as readonly [string, ...string[]]
}

function validateCommand(
  command: readonly string[],
): asserts command is readonly [string, ...string[]] {
  if (
    command.length === 0 ||
    command.some(
      (part) =>
        typeof part !== 'string' ||
        part.length === 0 ||
        part.includes('\0'),
    )
  ) {
    throw new TypeError('Native context child command is invalid')
  }
  if (!path.isAbsolute(command[0]!)) {
    throw new TypeError('Native context child executable must be absolute')
  }
}

function createChildEnvironment(
  options: ValidatedOptions,
): NodeJS.ProcessEnv {
  const pathDirectories = [
    options.bundle.codexPathDirectory,
    path.dirname(options.bundle.pythonExecutable),
    '/usr/bin',
    '/bin',
    '/usr/sbin',
    '/sbin',
  ]
  if (
    pathDirectories.some(
      (directory) =>
        directory.length === 0 ||
        directory.includes(path.delimiter),
    )
  ) {
    throw new TypeError('Native context PATH contains an invalid directory')
  }
  return {
    ...(options.disableManagedConfigForTest
      ? { CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG: '1' }
      : {}),
    ...(options.testJournalPath
      ? { AY_PLE_NATIVE_CONTEXT_PROBE_JOURNAL: options.testJournalPath }
      : {}),
    CODEX_HOME: options.environment.codexHome,
    CODEX_SQLITE_HOME: options.environment.codexSqliteHome,
    HOME: options.environment.home,
    LANG: 'en_US.UTF-8',
    LC_ALL: 'en_US.UTF-8',
    PATH: [...new Set(pathDirectories)].join(path.delimiter),
    TMPDIR: options.environment.tempDirectory,
  }
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: JsonObject,
  expected: readonly string[],
): boolean {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return (
    actual.length === wanted.length &&
    actual.every((key, index) => key === wanted[index])
  )
}

function hasAllowedKeys(
  value: JsonObject,
  allowed: readonly string[],
): boolean {
  const accepted = new Set(allowed)
  return Object.keys(value).every((key) => accepted.has(key))
}

function requireExactKeys(
  value: unknown,
  expected: readonly string[],
  label: string,
): void {
  if (!isJsonObject(value) || !hasExactKeys(value, expected)) {
    throw new TypeError(`${label} is invalid`)
  }
}

async function requireCanonicalDirectory(
  value: unknown,
  label: string,
): Promise<string> {
  if (
    typeof value !== 'string' ||
    !path.isAbsolute(value) ||
    path.normalize(value) !== value
  ) {
    throw new TypeError(`${label} must be an absolute normalized directory`)
  }
  const stats = await lstat(value).catch(() => undefined)
  if (!stats?.isDirectory() || stats.isSymbolicLink()) {
    throw new TypeError(`${label} must be a canonical directory`)
  }
  const canonical = await realpath(value)
  if (canonical !== value) {
    throw new TypeError(`${label} must be a canonical directory`)
  }
  return canonical
}

function pathsOverlap(left: string, right: string): boolean {
  return isSameOrDescendant(left, right) || isSameOrDescendant(right, left)
}

function isSameOrDescendant(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate)
  return (
    relative === '' ||
    (!path.isAbsolute(relative) &&
      relative !== '..' &&
      !relative.startsWith(`..${path.sep}`))
  )
}

function requireAbortSignal(value: unknown): asserts value is AbortSignal {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AbortSignal).aborted !== 'boolean' ||
    typeof (value as AbortSignal).addEventListener !== 'function' ||
    typeof (value as AbortSignal).removeEventListener !== 'function'
  ) {
    throw new TypeError('Native context signal is invalid')
  }
}

function createDeferred<T>(): Deferred<T> {
  let settled = false
  let settle!: (value: T) => void
  let rejectPromise!: (error: unknown) => void
  const promise = new Promise<T>((resolve, reject) => {
    settle = resolve
    rejectPromise = reject
  })
  void promise.catch(() => undefined)
  return {
    promise,
    get settled() {
      return settled
    },
    resolve(value: T) {
      if (settled) return
      settled = true
      settle(value)
    },
    reject(error: unknown) {
      if (settled) return
      settled = true
      rejectPromise(error)
    },
  }
}

function processGroupExists(processGroupId: number): boolean {
  try {
    process.kill(-processGroupId, 0)
    return true
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === 'ESRCH') return false
    throw cause
  }
}

function signalDetachedProcessGroup(
  processGroupId: number,
  signal: NodeJS.Signals,
): void {
  process.kill(-processGroupId, signal)
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

export const nativeContextProbeTesting = Object.freeze({
  decodeConfigResult: decodeNativeContextConfig,
  decodeSkillsResult: decodeNativeContextSkills,
  readRetainedResources: () =>
    Object.freeze({
      pendingResponses: ACTIVE_PENDING_RESPONSES.size,
      processGroups: ACTIVE_PROCESS_GROUPS.size,
      sessions: ACTIVE_PROBE_SESSIONS.size,
    }),
  resolveCommand,
})
