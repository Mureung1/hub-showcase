import {
  execFile,
  spawn,
  type ChildProcessWithoutNullStreams,
  type SpawnOptionsWithoutStdio,
} from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access, lstat, open, realpath } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import {
  BridgeProtocolError,
  NdjsonBridgeFramer,
  type BridgeOutputFrame,
} from './bridge-protocol.js'
import {
  type CodexAccountReadiness,
  type CodexChatEvent,
  type CodexChatThread,
  type CodexChatTurn,
  type CodexProductActivity,
  type InterruptTurnInput,
  type ReleaseThreadInput,
  type StartTurnInput,
} from './contract.js'
import {
  type CodexEffectiveConfig,
  type CodexEffectiveSkill,
} from './native-context-contract.js'
import type {
  AnswerUserInput,
  CancelUserInput,
  CodexChildEnvironment,
  CodexModelCatalog,
  CodexProductTurn,
  CodexWorkspaceRuntime,
  StartProductTurnInput,
} from './runtime-contract.js'
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
import {
  NativeContextGenerationCoordinator,
  type NativeContextProbeRunner,
} from './native-context-coordinator.js'
import type { VerifiedProductionBundle } from './production-bundle.js'
import { SerializedBridgeWriter } from './serialized-writer.js'

type ResultFrame = Extract<BridgeOutputFrame, { type: 'result' }>
type RuntimeState = 'starting' | 'ready' | 'closing' | 'closed' | 'failed'
type ProductSkillPathIdentity = {
  readonly path: string
  readonly kind: 'directory' | 'file'
  readonly device: number
  readonly inode: number
}
type ValidatedWorkspace = {
  readonly path: string
  readonly identity: ProductSkillPathIdentity
}
type ProductSkillValidationTestHook = (input: {
  readonly phase: 'before_open'
  readonly skillPath: string
}) => void | Promise<void>
type CommandName =
  | 'read_account'
  | 'read_model_catalog'
  | 'start_thread'
  | 'start_turn'
  | 'start_product_turn'
  | 'answer_user_input'
  | 'cancel_user_input'
  | 'interrupt'
  | 'release_thread'

const execFileAsync = promisify(execFile)
const GIT_EXECUTABLE = '/usr/bin/git'
const GIT_ROOT_PROBE_TIMEOUT_MS = 5_000
const GIT_ROOT_PROBE_MAX_BYTES = 4 * 1024
const CHILD_ENVIRONMENT_MAX_ENTRIES = 16
const CHILD_ENVIRONMENT_MAX_VALUE_BYTES = 8 * 1024
const CHILD_ENVIRONMENT_MAX_AGGREGATE_BYTES = 64 * 1024
const PRODUCT_SKILL_NAME_MAX_BYTES = 256
const PRODUCT_SKILL_PATH_MAX_BYTES = 16 * 1024
const CHILD_ENVIRONMENT_KEY_PATTERN = /^[A-Z_][A-Z0-9_]*$/u
const PROTECTED_CHILD_ENVIRONMENT_KEYS = new Set([
  'CODEX_APP_SERVER_DISABLE_MANAGED_CONFIG',
  'CODEX_HOME',
  'CODEX_SQLITE_HOME',
  'HOME',
  'LANG',
  'LC_ALL',
  'LIBPATH',
  'PATH',
  'SHLIB_PATH',
  'TMPDIR',
  '__CF_USER_TEXT_ENCODING',
])

const BRIDGE_OPERATION_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  account_read_failed: 'The Codex account could not be read.',
  active_turn: 'The thread already has an active turn.',
  active_turn_limit: 'The bridge active-turn limit was reached.',
  interaction_not_pending: 'The user-input interaction is not pending.',
  invalid_user_input_answer: 'The user-input answer is invalid.',
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
  'sdk_operation_timeout',
  'sdk_stream_ended',
  'sdk_stream_failed',
  'sdk_transport_failed',
  'unexpected_eof',
  'unknown_command',
])

const RUNTIME_CLOSING_MESSAGE = 'The Codex runtime is closing.'

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
  readonly kind: 'chat' | 'product'
  readonly stream: CodexChatEventStream<CodexProductActivity>
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

interface StartVerifiedCodexChatRuntimeCommonOptions {
  readonly bundle: VerifiedProductionBundle
  readonly environment: CodexChatRuntimeEnvironment
  readonly childEnvironment?: CodexChildEnvironment
  /** Package-private operational limits; production callers use defaults. */
  readonly budgets?: Partial<NodeRuntimeBudgets>
  /** Package-private actual-child seam; production callers omit this. */
  readonly bridgeEntrypointOverride?: string
  readonly bridgeArgsOverride?: readonly string[]
  /** Package-private deadline injection; production callers use defaults. */
  readonly deadlines?: Partial<NodeRuntimeDeadlines>
  /** Package-private exact-local test isolation; production honors managed config. */
  readonly disableManagedConfigForTest?: true
  /** Package-private native-context generation seam; production callers omit this. */
  readonly nativeContextProbeRunnerOverride?: NativeContextProbeRunner
  /** Package-private actual-child seam; production callers omit this. */
  readonly launchArgsOverride?: readonly string[]
  readonly journalPath?: string
  readonly nativeChildPidPath?: string
  /** Package-private cleanup fault-injection seam. */
  readonly signalProcessGroupOverride?: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
  /** Package-private filesystem race injection; production callers omit this. */
  readonly productSkillValidationTestHook?: ProductSkillValidationTestHook
}

export type CodexRuntimeApplicationIdentity = {
  readonly name: 'ay-ple'
  readonly title: 'AY-PLE'
  readonly version: string
}

export type StartVerifiedCodexChatRuntimeOptions =
  StartVerifiedCodexChatRuntimeCommonOptions & {
    readonly workspace: string
    readonly application?: CodexRuntimeApplicationIdentity
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
  readonly runtime: CodexWorkspaceRuntime
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
  const childEnvironment = normalizeChildEnvironment(
    options.childEnvironment,
  )
  const validatedWorkspace = await validateWorkspace(options.workspace)
  const workspace = validatedWorkspace.path
  const environment = await validateEnvironment(options.environment)
  requireDisjointRuntimeRoots(workspace, environment)
  const application = validateApplicationIdentity(
    options.application ?? {
      name: 'ay-ple',
      title: 'AY-PLE',
      version: '0.0.0',
    },
  )
  const args = [
    '-B',
    options.bridgeEntrypointOverride ?? options.bundle.bridgeEntrypoint,
    '--workspace',
    workspace,
    '--site-packages',
    options.bundle.sitePackages,
    `--client-name=${application.name}`,
    `--client-title=${application.title}`,
    `--client-version=${application.version}`,
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
      childEnvironment,
      options.disableManagedConfigForTest,
    ),
  }
  const child = spawn(options.bundle.pythonExecutable, args, {
    ...spawnOptions,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const nativeContext = new NativeContextGenerationCoordinator({
    bundle: options.bundle,
    workspace,
    environment,
    application,
    disableManagedConfigForTest: options.disableManagedConfigForTest,
    runProbe: options.nativeContextProbeRunnerOverride,
    signalProcessGroupOverride: options.signalProcessGroupOverride,
  })
  const runtime = new NodeCodexChatRuntime(
    child,
    workspace,
    validatedWorkspace.identity,
    budgets,
    deadlines,
    options.signalProcessGroupOverride ?? signalDetachedProcessGroup,
    nativeContext,
    options.productSkillValidationTestHook,
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

class NodeCodexChatRuntime implements CodexWorkspaceRuntime {
  readonly closed: Promise<void>
  readonly terminal: Promise<CodexChatRuntimeError>

  private readonly child: ChildProcessWithoutNullStreams
  private readonly workspace: string
  private readonly workspaceIdentity: ProductSkillPathIdentity
  private readonly budgets: NodeRuntimeBudgets
  private readonly aggregateQueueBudget: AggregateOperationQueueBudget
  private readonly stderrCapture: BoundedStderrCapture
  private readonly deadlines: NodeRuntimeDeadlines
  private readonly processGroupSignaler: (
    processGroupId: number,
    signal: NodeJS.Signals,
  ) => void
  private readonly nativeContext: NativeContextGenerationCoordinator
  private readonly productSkillValidationTestHook:
    | ProductSkillValidationTestHook
    | undefined
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
    workspace: string,
    workspaceIdentity: ProductSkillPathIdentity,
    budgets: NodeRuntimeBudgets,
    deadlines: NodeRuntimeDeadlines,
    processGroupSignaler: (
      processGroupId: number,
      signal: NodeJS.Signals,
    ) => void,
    nativeContext: NativeContextGenerationCoordinator,
    productSkillValidationTestHook: ProductSkillValidationTestHook | undefined,
  ) {
    this.child = child
    this.workspace = workspace
    this.workspaceIdentity = workspaceIdentity
    this.budgets = budgets
    this.deadlines = deadlines
    this.processGroupSignaler = processGroupSignaler
    this.nativeContext = nativeContext
    this.productSkillValidationTestHook = productSkillValidationTestHook
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

  async readAccountReadiness(): Promise<CodexAccountReadiness> {
    const account = await this.sendOperation(
      'read_account',
      false,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'read_account',
      }),
      (frame) => {
        if (frame.command !== 'read_account') {
          throw new BridgeProtocolError('mismatch')
        }
        return frame.account
      },
    )
    return account.state === 'chatgpt'
      ? { state: 'ready' }
      : { state: 'not_ready', reason: 'authentication_required' }
  }

  readModelCatalog(): Promise<CodexModelCatalog> {
    return this.sendOperation(
      'read_model_catalog',
      false,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'read_model_catalog',
      }),
      (frame) => {
        if (frame.command !== 'read_model_catalog') {
          throw new BridgeProtocolError('mismatch')
        }
        return frame.catalog
      },
    )
  }

  readEffectiveConfig(input: {
    readonly signal: AbortSignal
  }): Promise<CodexEffectiveConfig> {
    requireExactInputKeys(input, ['signal'], 'Native config read input')
    requireAbortSignal(input.signal)
    const unavailable = this.unavailableError()
    if (unavailable) return Promise.reject(unavailable)
    return this.observeNativeContext(
      this.nativeContext.readEffectiveConfig(input),
    )
  }

  listEffectiveSkills(input: {
    readonly signal: AbortSignal
  }): Promise<readonly CodexEffectiveSkill[]> {
    requireExactInputKeys(input, ['signal'], 'Native Skill list input')
    requireAbortSignal(input.signal)
    const unavailable = this.unavailableError()
    if (unavailable) return Promise.reject(unavailable)
    return this.observeNativeContext(
      this.nativeContext.listEffectiveSkills(input),
    )
  }

  startThread(): Promise<CodexChatThread> {
    return this.sendOperation(
      'start_thread',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'start_thread',
      }),
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
    const stream = new CodexChatEventStream<CodexProductActivity>({
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
          kind: 'chat',
          stream,
          threadId: frame.threadId,
          turnId: frame.turnId,
        }
        this.turns.set(frame.bridgeRequestId, route)
        this.armTurnDeadlines(route)
        return {
          threadId: frame.threadId,
          turnId: frame.turnId,
          events: stream as AsyncIterable<CodexChatEvent>,
        }
      },
    )
  }

  startProductTurn(input: StartProductTurnInput): Promise<CodexProductTurn> {
    const snapshot = snapshotProductTurnInput(input)
    return this.startValidatedProductTurn(snapshot)
  }

  private async startValidatedProductTurn(
    input: StartProductTurnInput,
  ): Promise<CodexProductTurn> {
    await validateProductWorkspaceRoot(
      this.workspace,
      this.workspaceIdentity,
    )
    if (input.skill !== undefined) {
      await validateProductSkillFile(
        input.skill.path,
        this.workspace,
        this.workspaceIdentity,
        this.productSkillValidationTestHook,
      )
    }
    const { threadId, text } = input
    const stream = new CodexChatEventStream<CodexProductActivity>({
      maxFrames: this.budgets.operationMaxFrames,
      maxBytes: this.budgets.operationMaxBytes,
      aggregate: this.aggregateQueueBudget,
      onOverflow: () => this.failBufferOverflow(),
    })
    return this.sendOperation(
      'start_product_turn',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'start_product_turn',
        threadId,
        permissionProfile: input.permissionProfile,
        ...(input.settings === undefined
          ? {}
          : {
              model: input.settings.model,
              reasoningEffort: input.settings.reasoningEffort,
              serviceTier: input.settings.serviceTier,
            }),
        ...(input.skill === undefined
          ? {}
          : {
              skillName: input.skill.name,
              skillPath: input.skill.path,
            }),
        text,
      }),
      (frame) => {
        if (
          frame.command !== 'start_product_turn' ||
          frame.threadId !== threadId
        ) {
          throw new BridgeProtocolError('mismatch')
        }
        const route: ActiveTurnRoute = {
          kind: 'product',
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

  answerUserInput(input: AnswerUserInput): Promise<void> {
    requireInteractionId(input.interactionId)
    const answers = normalizeUserInputAnswers(input.answers)
    return this.sendOperation(
      'answer_user_input',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'answer_user_input',
        interactionId: input.interactionId,
        answers,
      }),
      (frame) => {
        if (
          frame.command !== 'answer_user_input' ||
          frame.interactionId !== input.interactionId
        ) {
          throw new BridgeProtocolError('mismatch')
        }
      },
    )
  }

  cancelUserInput(input: CancelUserInput): Promise<void> {
    requireInteractionId(input.interactionId)
    return this.sendOperation(
      'cancel_user_input',
      true,
      (bridgeRequestId) => ({
        bridgeRequestId,
        command: 'cancel_user_input',
        interactionId: input.interactionId,
      }),
      (frame) => {
        if (
          frame.command !== 'cancel_user_input' ||
          frame.interactionId !== input.interactionId
        ) {
          throw new BridgeProtocolError('mismatch')
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

  private async observeNativeContext<T>(operation: Promise<T>): Promise<T> {
    try {
      return await operation
    } catch (error) {
      if (
        error instanceof CodexChatRuntimeError &&
        error.code === 'runtime_cleanup_failed'
      ) {
        this.failRuntime(error)
      }
      if (
        error instanceof CodexChatRuntimeError &&
        error.code === 'native_context_aborted' &&
        this.state === 'closing'
      ) {
        throw new CodexChatRuntimeError({
          code: 'runtime_closing',
          displayMessage: RUNTIME_CLOSING_MESSAGE,
          unknownOutcome: false,
        })
      }
      throw error
    }
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
    event: CodexProductActivity,
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
    if (route.kind === 'chat' && !isCodexChatEvent(event)) {
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
    this.cleanupPromise = this.finishCleanup(graceful)
    void this.cleanupPromise.catch(() => undefined)
    return this.cleanupPromise
  }

  private async finishCleanup(
    graceful: boolean,
  ): Promise<{ readonly escalated: boolean }> {
    const [processOutcome, nativeContextOutcome] =
      await Promise.allSettled([
        this.cleanupProcessTree(graceful),
        this.nativeContext?.close() ?? Promise.resolve(),
      ])
    if (
      processOutcome.status === 'rejected' ||
      nativeContextOutcome.status === 'rejected'
    ) {
      const error = this.cleanupError()
      this.settleRuntimeFailure(error)
      this.cleanupClosed.reject(error)
      throw error
    }
    return processOutcome.value
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

async function validateWorkspace(
  workspace: string,
): Promise<ValidatedWorkspace> {
  if (!path.isAbsolute(workspace)) {
    throw new TypeError('Codex workspace must be absolute')
  }
  let canonicalWorkspace: string
  let identity: ProductSkillPathIdentity
  try {
    const stats = await lstat(workspace)
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new TypeError('Codex workspace must be a directory')
    }
    await access(workspace, fsConstants.R_OK | fsConstants.X_OK)
    canonicalWorkspace = await realpath(workspace)
    identity = {
      path: canonicalWorkspace,
      kind: 'directory',
      device: stats.dev,
      inode: stats.ino,
    }
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError('Codex workspace could not be validated')
  }
  if (workspace !== canonicalWorkspace) {
    throw new TypeError('Codex workspace must be canonical')
  }
  await validateExactGitRoot(canonicalWorkspace)
  try {
    const current = await lstat(canonicalWorkspace)
    if (
      current.isSymbolicLink() ||
      !current.isDirectory() ||
      !sameProductSkillPathIdentity(identity, {
        path: canonicalWorkspace,
        kind: 'directory',
        device: current.dev,
        inode: current.ino,
      }) ||
      (await realpath(canonicalWorkspace)) !== canonicalWorkspace
    ) {
      throw new TypeError('Codex workspace changed during validation')
    }
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError('Codex workspace could not be validated')
  }
  return {
    path: canonicalWorkspace,
    identity,
  }
}

async function validateExactGitRoot(workspace: string): Promise<void> {
  const marker = path.join(workspace, '.git')
  try {
    const markerStats = await lstat(marker)
    if (!markerStats.isDirectory() || markerStats.isSymbolicLink()) {
      throw new TypeError('Codex workspace must be an exact Git root')
    }
    await access(marker, fsConstants.R_OK | fsConstants.X_OK)
    const { stdout } = await execFileAsync(
      GIT_EXECUTABLE,
      ['-C', workspace, 'rev-parse', '--show-toplevel', '--absolute-git-dir'],
      {
        encoding: 'utf8',
        maxBuffer: GIT_ROOT_PROBE_MAX_BYTES,
        timeout: GIT_ROOT_PROBE_TIMEOUT_MS,
        windowsHide: true,
      },
    )
    const paths = stdout.trimEnd().split(/\r?\n/u)
    if (paths.length !== 2) {
      throw new TypeError('Codex workspace must be an exact Git root')
    }
    const [topLevel, gitDirectory] = await Promise.all(
      paths.map((candidate) => realpath(candidate)),
    )
    if (topLevel !== workspace || gitDirectory !== marker) {
      throw new TypeError('Codex workspace must be an exact Git root')
    }
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError('Codex workspace must be an exact Git root')
  }
}

async function validateEnvironment(
  environment: CodexChatRuntimeEnvironment,
): Promise<CodexChatRuntimeEnvironment> {
  const [home, codexHome, codexSqliteHome, tempDirectory] = await Promise.all([
    validateControlledDirectory(environment.home, 'runtime home'),
    validateControlledDirectory(environment.codexHome, 'Codex home'),
    validateControlledDirectory(
      environment.codexSqliteHome,
      'Codex SQLite home',
    ),
    validateControlledDirectory(
      environment.tempDirectory,
      'runtime temporary directory',
    ),
  ])
  if (
    new Set([home, codexHome, tempDirectory]).size !== 3 ||
    (codexSqliteHome !== codexHome &&
      new Set([home, codexHome, codexSqliteHome, tempDirectory]).size !== 4)
  ) {
    throw new TypeError(
      'Codex runtime directories must be distinct except for the global Codex home',
    )
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

function requireDisjointRuntimeRoots(
  runtimeCwd: string,
  environment: CodexChatRuntimeEnvironment,
): void {
  const roots = [
    runtimeCwd,
    environment.home,
    environment.codexHome,
    environment.tempDirectory,
    ...(environment.codexSqliteHome === environment.codexHome
      ? []
      : [environment.codexSqliteHome]),
  ]
  for (let leftIndex = 0; leftIndex < roots.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < roots.length;
      rightIndex += 1
    ) {
      if (pathsOverlap(roots[leftIndex], roots[rightIndex])) {
        throw new TypeError('Codex Runtime roots must be disjoint')
      }
    }
  }
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

function validateApplicationIdentity(
  identity: CodexRuntimeApplicationIdentity,
): CodexRuntimeApplicationIdentity {
  requireExactInputKeys(
    identity,
    ['name', 'title', 'version'],
    'Codex Runtime application identity',
  )
  if (identity.name !== 'ay-ple' || identity.title !== 'AY-PLE') {
    throw new TypeError('Codex Runtime application identity is invalid')
  }
  requireBoundedString(identity.version, 'Application version', 128)
  if (
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u.test(
      identity.version,
    )
  ) {
    throw new TypeError('Application version must be an exact SemVer')
  }
  return Object.freeze({ ...identity })
}

function createChildEnvironment(
  bundle: VerifiedProductionBundle,
  environment: CodexChatRuntimeEnvironment,
  childEnvironment: CodexChildEnvironment,
  disableManagedConfigForTest: true | undefined,
): NodeJS.ProcessEnv {
  const pathDirectories = [
    bundle.codexPathDirectory,
    path.dirname(bundle.pythonExecutable),
    path.dirname(process.execPath),
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
    ...childEnvironment,
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

function normalizeChildEnvironment(
  value: CodexChildEnvironment | undefined,
): CodexChildEnvironment {
  if (value === undefined) return Object.freeze({})
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Codex child environment must be an object')
  }
  const entries = Object.entries(value)
  if (entries.length > CHILD_ENVIRONMENT_MAX_ENTRIES) {
    throw new TypeError('Codex child environment has too many entries')
  }
  let aggregateBytes = 0
  for (const [key, entryValue] of entries) {
    if (!CHILD_ENVIRONMENT_KEY_PATTERN.test(key)) {
      throw new TypeError('Codex child environment key is invalid')
    }
    if (isProtectedChildEnvironmentKey(key)) {
      throw new TypeError('Codex child environment key is protected')
    }
    if (typeof entryValue !== 'string' || entryValue.includes('\0')) {
      throw new TypeError('Codex child environment value is invalid')
    }
    const valueBytes = Buffer.byteLength(entryValue, 'utf8')
    if (valueBytes > CHILD_ENVIRONMENT_MAX_VALUE_BYTES) {
      throw new TypeError('Codex child environment value is too large')
    }
    aggregateBytes += Buffer.byteLength(key, 'utf8') + valueBytes
    if (aggregateBytes > CHILD_ENVIRONMENT_MAX_AGGREGATE_BYTES) {
      throw new TypeError('Codex child environment is too large')
    }
  }
  return Object.freeze(Object.fromEntries(entries))
}

function isProtectedChildEnvironmentKey(key: string): boolean {
  return (
    PROTECTED_CHILD_ENVIRONMENT_KEYS.has(key) ||
    key.startsWith('PYTHON') ||
    key.startsWith('DYLD_') ||
    key.startsWith('LD_') ||
    key.startsWith('_RLD_')
  )
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

function requireAbortSignal(value: unknown): asserts value is AbortSignal {
  if (
    typeof value !== 'object' ||
    value === null ||
    typeof (value as AbortSignal).aborted !== 'boolean' ||
    typeof (value as AbortSignal).addEventListener !== 'function' ||
    typeof (value as AbortSignal).removeEventListener !== 'function'
  ) {
    throw new TypeError('Abort signal is invalid')
  }
}

function snapshotProductTurnInput(
  input: StartProductTurnInput,
): StartProductTurnInput {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).some(
      (key) =>
        key !== 'threadId' &&
        key !== 'permissionProfile' &&
        key !== 'settings' &&
        key !== 'skill' &&
        key !== 'text',
    )
  ) {
    throw new TypeError('Product Turn input fields are invalid')
  }
  const threadId = input.threadId
  const permissionProfile = input.permissionProfile
  const candidateSettings = input.settings
  const candidateSkill = input.skill
  const text = input.text

  requireNativeId(threadId)
  if (
    permissionProfile !== 'read_only' &&
    permissionProfile !== 'workspace_write'
  ) {
    throw new TypeError('Product permission profile is invalid')
  }
  let settings: StartProductTurnInput['settings']
  if (candidateSettings !== undefined) {
    requireExactInputKeys(
      candidateSettings,
      ['model', 'reasoningEffort', 'serviceTier'],
      'Product Turn settings',
    )
    const model = candidateSettings.model
    const reasoningEffort = candidateSettings.reasoningEffort
    const serviceTier = candidateSettings.serviceTier
    requireBoundedString(model, 'Product model', 256)
    requireBoundedString(
      reasoningEffort,
      'Product reasoning effort',
      64,
    )
    if (
      serviceTier !== 'default' &&
      serviceTier !== 'fast'
    ) {
      throw new TypeError('Product service tier is invalid')
    }
    settings = { model, reasoningEffort, serviceTier }
  }
  let skill: StartProductTurnInput['skill']
  if (candidateSkill !== undefined) {
    requireExactInputKeys(
      candidateSkill,
      ['name', 'path'],
      'Product Skill input',
    )
    const name = candidateSkill.name
    const skillPath = candidateSkill.path
    requireSafeBoundedString(
      name,
      'Product Skill name',
      PRODUCT_SKILL_NAME_MAX_BYTES,
    )
    requireSafeBoundedString(
      skillPath,
      'Product Skill path',
      PRODUCT_SKILL_PATH_MAX_BYTES,
    )
    if (
      !path.isAbsolute(skillPath) ||
      path.normalize(skillPath) !== skillPath ||
      path.basename(skillPath) !== 'SKILL.md'
    ) {
      throw new TypeError('Product Skill path is invalid')
    }
    skill = { name, path: skillPath }
  }
  requireBoundedString(text, 'Product turn text', 512 * 1024)
  return {
    threadId,
    permissionProfile,
    ...(settings === undefined ? {} : { settings }),
    ...(skill === undefined ? {} : { skill }),
    text,
  }
}

function requireExactInputKeys(
  value: unknown,
  expected: readonly string[],
  label: string,
): asserts value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`)
  }
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new TypeError(`${label} fields are invalid`)
  }
}

async function validateProductWorkspaceRoot(
  workspace: string,
  expected: ProductSkillPathIdentity,
): Promise<void> {
  try {
    const stats = await lstat(workspace)
    const actual: ProductSkillPathIdentity = {
      path: workspace,
      kind: 'directory',
      device: stats.dev,
      inode: stats.ino,
    }
    if (
      stats.isSymbolicLink() ||
      !stats.isDirectory() ||
      (await realpath(workspace)) !== workspace ||
      !sameProductSkillPathIdentity(expected, actual)
    ) {
      throw new TypeError(
        'Product workspace changed after Runtime startup',
      )
    }
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError(
      'Product workspace changed after Runtime startup',
    )
  }
}

async function validateProductSkillFile(
  skillPath: string,
  workspace: string,
  workspaceIdentity: ProductSkillPathIdentity,
  testHook: ProductSkillValidationTestHook | undefined,
): Promise<void> {
  const relative = path.relative(workspace, skillPath)
  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative)
  ) {
    throw new TypeError('Product Skill path must be inside the Codex workspace')
  }
  try {
    const before = await readProductSkillPathIdentities(
      skillPath,
      workspace,
    )
    const beforeRoot = before.at(0)
    const beforeLeaf = before.at(-1)
    if (
      !beforeRoot ||
      !sameProductSkillPathIdentity(workspaceIdentity, beforeRoot)
    ) {
      throw new TypeError(
        'Product Skill workspace changed after Runtime startup',
      )
    }
    if (!beforeLeaf || beforeLeaf.kind !== 'file') {
      throw new TypeError(
        'Product Skill path must reference a regular non-symlink file',
      )
    }
    await testHook?.({ phase: 'before_open', skillPath })
    const handle = await open(
      skillPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW,
    )
    try {
      const opened = await handle.stat()
      if (
        !opened.isFile() ||
        opened.dev !== beforeLeaf.device ||
        opened.ino !== beforeLeaf.inode
      ) {
        throw new TypeError(
          'Product Skill path changed during validation',
        )
      }
      const after = await readProductSkillPathIdentities(
        skillPath,
        workspace,
      )
      const afterRoot = after.at(0)
      const afterLeaf = after.at(-1)
      if (
        !sameProductSkillPathIdentities(before, after) ||
        !afterRoot ||
        !sameProductSkillPathIdentity(workspaceIdentity, afterRoot) ||
        !afterLeaf ||
        afterLeaf.kind !== 'file' ||
        opened.dev !== afterLeaf.device ||
        opened.ino !== afterLeaf.inode
      ) {
        throw new TypeError(
          'Product Skill path ancestry changed during validation',
        )
      }
    } finally {
      await handle.close()
    }
  } catch (error) {
    if (error instanceof TypeError) throw error
    throw new TypeError('Product Skill path could not be validated')
  }
}

async function readProductSkillPathIdentities(
  skillPath: string,
  workspace: string,
): Promise<readonly ProductSkillPathIdentity[]> {
  const relative = path.relative(workspace, skillPath)
  const components = relative.split(path.sep)
  const candidates = [
    workspace,
    ...components.map((_component, index) =>
      path.join(workspace, ...components.slice(0, index + 1)),
    ),
  ]
  const identities: ProductSkillPathIdentity[] = []
  for (const [index, candidate] of candidates.entries()) {
    const expectedKind = index === candidates.length - 1 ? 'file' : 'directory'
    const before = await lstat(candidate)
    if (
      before.isSymbolicLink() ||
      (expectedKind === 'file' ? !before.isFile() : !before.isDirectory())
    ) {
      throw new TypeError(
        expectedKind === 'file'
          ? 'Product Skill path must reference a regular non-symlink file'
          : 'Product Skill path ancestors must be canonical directories',
      )
    }
    const canonical = await realpath(candidate)
    const after = await lstat(candidate)
    if (
      canonical !== candidate ||
      (candidate !== workspace &&
        !isPathWithinCanonicalRoot(canonical, workspace))
    ) {
      throw new TypeError('Product Skill path must be canonical')
    }
    if (
      after.isSymbolicLink() ||
      (expectedKind === 'file' ? !after.isFile() : !after.isDirectory()) ||
      before.dev !== after.dev ||
      before.ino !== after.ino
    ) {
      throw new TypeError(
        'Product Skill path ancestry changed during validation',
      )
    }
    identities.push({
      path: candidate,
      kind: expectedKind,
      device: after.dev,
      inode: after.ino,
    })
  }
  return identities
}

function sameProductSkillPathIdentity(
  expected: ProductSkillPathIdentity,
  actual: ProductSkillPathIdentity,
): boolean {
  return (
    actual.path === expected.path &&
    actual.kind === expected.kind &&
    actual.device === expected.device &&
    actual.inode === expected.inode
  )
}

function sameProductSkillPathIdentities(
  before: readonly ProductSkillPathIdentity[],
  after: readonly ProductSkillPathIdentity[],
): boolean {
  return (
    before.length === after.length &&
    before.every((identity, index) => {
      const current = after[index]
      return (
        current !== undefined &&
        sameProductSkillPathIdentity(identity, current)
      )
    })
  )
}

function isPathWithinCanonicalRoot(
  candidate: string,
  root: string,
): boolean {
  const relative = path.relative(root, candidate)
  return (
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative)
  )
}

function requireInteractionId(value: unknown): asserts value is string {
  requireBoundedString(value, 'Interaction identity', 256)
}

function normalizeUserInputAnswers(
  answers: AnswerUserInput['answers'],
): Record<string, readonly string[]> {
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) {
    throw new TypeError('User-input answers must be an object')
  }
  const entries = Object.entries(answers)
  if (entries.length > 3) {
    throw new TypeError('User-input answers exceed the question limit')
  }
  const normalized = Object.create(null) as Record<string, readonly string[]>
  for (const [questionId, values] of entries) {
    requireBoundedString(questionId, 'Question identity', 256)
    if (!Array.isArray(values) || values.length > 16) {
      throw new TypeError('User-input answer values are invalid')
    }
    normalized[questionId] = values.map((value) => {
      requireBoundedString(value, 'User-input answer', 64 * 1024, true)
      return value
    })
  }
  if (Buffer.byteLength(JSON.stringify(normalized), 'utf8') > 512 * 1024) {
    throw new TypeError('User-input answers exceed the byte limit')
  }
  return normalized
}

function requireBoundedString(
  value: unknown,
  label: string,
  maxBytes: number,
  allowEmpty = false,
): asserts value is string {
  if (
    typeof value !== 'string' ||
    (!allowEmpty && value.length === 0) ||
    Buffer.byteLength(value, 'utf8') > maxBytes
  ) {
    throw new TypeError(`${label} is invalid`)
  }
}

function requireSafeBoundedString(
  value: unknown,
  label: string,
  maxBytes: number,
): asserts value is string {
  requireBoundedString(value, label, maxBytes)
  for (const character of value) {
    const point = character.codePointAt(0) as number
    if (point < 0x20 || point === 0x7f) {
      throw new TypeError(`${label} is invalid`)
    }
  }
}

function isCodexChatEvent(
  event: CodexProductActivity,
): event is CodexChatEvent {
  return (
    event.type === 'agent_message.delta' ||
    event.type === 'agent_message.completed' ||
    event.type === 'turn.error' ||
    event.type === 'turn.completed' ||
    event.type === 'runtime.failed'
  )
}
