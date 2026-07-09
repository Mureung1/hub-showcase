import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import type {
  ClientNotification,
  ClientRequest,
  InitializeParams,
  InitializeResponse,
  ServerNotification,
} from './internal/codex-app-server-protocol/generated/index.js'
import type { ThreadStartParams } from './internal/codex-app-server-protocol/generated/v2/ThreadStartParams.js'
import type { ThreadStartResponse } from './internal/codex-app-server-protocol/generated/v2/ThreadStartResponse.js'
import type { ThreadListParams } from './internal/codex-app-server-protocol/generated/v2/ThreadListParams.js'
import type { ThreadListResponse } from './internal/codex-app-server-protocol/generated/v2/ThreadListResponse.js'
import type { ThreadLoadedListParams } from './internal/codex-app-server-protocol/generated/v2/ThreadLoadedListParams.js'
import type { ThreadLoadedListResponse } from './internal/codex-app-server-protocol/generated/v2/ThreadLoadedListResponse.js'
import type { ThreadReadParams } from './internal/codex-app-server-protocol/generated/v2/ThreadReadParams.js'
import type { ThreadReadResponse } from './internal/codex-app-server-protocol/generated/v2/ThreadReadResponse.js'
import type { TurnInterruptParams } from './internal/codex-app-server-protocol/generated/v2/TurnInterruptParams.js'
import type { TurnInterruptResponse } from './internal/codex-app-server-protocol/generated/v2/TurnInterruptResponse.js'
import type { TurnStartParams } from './internal/codex-app-server-protocol/generated/v2/TurnStartParams.js'
import type { TurnStartResponse } from './internal/codex-app-server-protocol/generated/v2/TurnStartResponse.js'
import type { TurnSteerParams } from './internal/codex-app-server-protocol/generated/v2/TurnSteerParams.js'
import type { TurnSteerResponse } from './internal/codex-app-server-protocol/generated/v2/TurnSteerResponse.js'
import type { UserInput } from './internal/codex-app-server-protocol/generated/v2/UserInput.js'

export type CodexRuntimeHome = {
  codexHome: string
  codexSqliteHome: string
}

export type CodexRawClientInfo = {
  name: string
  title: string | null
  version: string
}

export type CodexRawClientOptions = {
  codexBinPath?: string
  cwd?: string
  codexHome?: string
  codexSqliteHome?: string
  timeoutMs?: number
  clientInfo?: CodexRawClientInfo
  env?: Record<string, string | undefined>
  codexArgs?: string[]
}

export type CodexRawDebugLogEntry = {
  timestamp: string
  source: 'client' | 'server' | 'process'
  kind:
    | 'spawn'
    | 'stdin'
    | 'stdout'
    | 'stderr'
    | 'message'
    | 'response'
    | 'notification'
    | 'parse_error'
    | 'exit'
    | 'error'
    | 'timeout'
  raw?: string
  message?: string
  data?: Record<string, unknown>
}

export type CodexRawTextInput = {
  type: 'text'
  text: string
  text_elements: []
}

export type CodexRawTurnInput = CodexRawTextInput

export type CodexThreadStartInput = {
  cwd?: string | null
  ephemeral?: boolean | null
}

export type CodexThreadStartResult = {
  threadId: string
}

export type CodexThreadSortKey = 'created_at' | 'updated_at' | 'recency_at'

export type CodexThreadSortDirection = 'asc' | 'desc'

export type CodexThreadSourceKind =
  | 'cli'
  | 'vscode'
  | 'exec'
  | 'appServer'
  | 'subAgent'
  | 'subAgentReview'
  | 'subAgentCompact'
  | 'subAgentThreadSpawn'
  | 'subAgentOther'
  | 'unknown'

export type CodexThreadListInput = {
  cursor?: string | null
  limit?: number | null
  sortKey?: CodexThreadSortKey | null
  sortDirection?: CodexThreadSortDirection | null
  modelProviders?: string[] | null
  sourceKinds?: CodexThreadSourceKind[] | null
  archived?: boolean | null
  cwd?: string | string[] | null
  useStateDbOnly?: boolean
  searchTerm?: string | null
}

export type CodexThreadListResult = {
  data: unknown[]
  nextCursor: string | null
  backwardsCursor: string | null
}

export type CodexThreadLoadedListInput = {
  cursor?: string | null
  limit?: number | null
}

export type CodexThreadLoadedListResult = {
  data: string[]
  nextCursor: string | null
}

export type CodexThreadReadInput = {
  threadId: string
  includeTurns?: boolean
}

export type CodexThreadReadResult = {
  thread: Record<string, unknown>
}

export type CodexTurnStartInput = {
  threadId: string
  input: CodexRawTurnInput[]
  cwd?: string | null
}

export type CodexTurnStartResult = {
  turnId: string
}

export type CodexTurnInterruptInput = {
  threadId: string
  turnId: string
}

export type CodexTurnInterruptResult = Record<string, never>

export type CodexTurnSteerInput = {
  threadId: string
  expectedTurnId: string
  input: CodexRawTurnInput[]
  clientUserMessageId?: string | null
}

export type CodexTurnSteerResult = {
  turnId: string
}

export type CodexRawServerNotification = {
  timestamp: string
  method: string
  params?: unknown
  raw: Record<string, unknown>
}

export type CodexInitializeResponse = {
  userAgent: string
  codexHome: string
  platformFamily: string
  platformOs: string
}

export type CodexInitializeResult = {
  response: CodexInitializeResponse
  debugLog: CodexRawDebugLogEntry[]
  codexBinPath: string
  cwd: string
  runtimeHome: CodexRuntimeHome
}

export type CodexInitializeSmokeResult =
  | ({
      ok: true
    } & CodexInitializeResult)
  | {
      ok: false
      error: string
      debugLog: CodexRawDebugLogEntry[]
      codexBinPath: string
      cwd: string
      runtimeHome: CodexRuntimeHome
    }

type PendingResponse = {
  method: string
  timeout: NodeJS.Timeout
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

type CodexClientRequestMethod = ClientRequest['method']

type CodexClientRequestFor<Method extends CodexClientRequestMethod> = Extract<
  ClientRequest,
  { method: Method }
>

type CodexClientRequestParams<Method extends CodexClientRequestMethod> =
  CodexClientRequestFor<Method> extends { params: infer Params }
    ? Params
    : never

type CodexResponseMessage = {
  id?: string | number
  method?: string
  params?: unknown
  result?: unknown
  error?: {
    message?: string
    code?: number
    data?: unknown
  }
}

type NotificationResolver = (
  notification: CodexRawServerNotification | undefined,
) => void

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const defaultTimeoutMs = 15000
const defaultCodexArgs = ['app-server', '--listen', 'stdio://']
const tokenLikeEnvKeyPattern =
  /(^|_)(ACCESS_TOKEN|API_KEY|AUTH_TOKEN|ID_TOKEN|PRIVATE_KEY|REFRESH_TOKEN|SECRET|TOKEN|PASSWORD)($|_)/

export class CodexRawClient {
  private readonly codexBinPath: string
  private readonly cwd: string
  private readonly runtimeHome: CodexRuntimeHome
  private readonly timeoutMs: number
  private readonly clientInfo: CodexRawClientInfo
  private readonly env?: Record<string, string | undefined>
  private readonly codexArgs: string[]
  private readonly debugLog: CodexRawDebugLogEntry[] = []
  private readonly pendingResponses = new Map<string, PendingResponse>()
  private readonly notificationQueue: CodexRawServerNotification[] = []
  private readonly notificationResolvers: NotificationResolver[] = []
  private child: ChildProcessWithoutNullStreams | undefined
  private stdoutReader: readline.Interface | undefined
  private stderrReader: readline.Interface | undefined
  private notificationStreamClosed = false
  private nextRequestId = 1

  constructor(options: CodexRawClientOptions = {}) {
    this.codexBinPath = options.codexBinPath ?? resolvePackageCodexBinPath()
    this.cwd = resolve(options.cwd ?? process.cwd())
    this.runtimeHome = resolveCodexRuntimeHome(options)
    this.timeoutMs = options.timeoutMs ?? defaultTimeoutMs
    this.clientInfo =
      options.clientInfo ?? {
        name: 'ay_ple_runtime_codex_raw_client',
        title: 'AY-PLE Runtime Codex Raw Client',
        version: '0.0.0',
      }
    this.env = options.env
    this.codexArgs = options.codexArgs ?? defaultCodexArgs
  }

  getDebugLog(): CodexRawDebugLogEntry[] {
    return this.debugLog.map((entry) => ({ ...entry }))
  }

  getRuntimeHome(): CodexRuntimeHome {
    return { ...this.runtimeHome }
  }

  getCodexBinPath(): string {
    return this.codexBinPath
  }

  getCwd(): string {
    return this.cwd
  }

  async initialize(): Promise<CodexInitializeResult> {
    const params: InitializeParams = {
      clientInfo: this.clientInfo,
      capabilities: null,
    }
    const response = await this.sendGeneratedRequest(
      'initialize',
      params,
      toInitializeResponse,
    )
    const initialized: ClientNotification = { method: 'initialized' }

    this.sendJson(initialized)

    return {
      response,
      debugLog: this.getDebugLog(),
      codexBinPath: this.codexBinPath,
      cwd: this.cwd,
      runtimeHome: this.getRuntimeHome(),
    }
  }

  async startThread(
    input: CodexThreadStartInput = {},
  ): Promise<CodexThreadStartResult> {
    const params: ThreadStartParams = {
      cwd: input.cwd ?? this.cwd,
    }

    if (input.ephemeral !== undefined) {
      params.ephemeral = input.ephemeral
    }

    const response = await this.sendGeneratedRequest(
      'thread/start',
      params,
      toThreadStartResponse,
    )

    return {
      threadId: response.thread.id,
    }
  }

  async listThreads(
    input: CodexThreadListInput = {},
  ): Promise<CodexThreadListResult> {
    const params: ThreadListParams = { ...input }
    const response = await this.sendGeneratedRequest(
      'thread/list',
      params,
      toThreadListResponse,
    )

    return {
      data: response.data,
      nextCursor: response.nextCursor,
      backwardsCursor: response.backwardsCursor,
    }
  }

  async listLoadedThreads(
    input: CodexThreadLoadedListInput = {},
  ): Promise<CodexThreadLoadedListResult> {
    const params: ThreadLoadedListParams = { ...input }
    const response = await this.sendGeneratedRequest(
      'thread/loaded/list',
      params,
      toThreadLoadedListResponse,
    )

    return {
      data: response.data,
      nextCursor: response.nextCursor,
    }
  }

  async readThread(input: CodexThreadReadInput): Promise<CodexThreadReadResult> {
    const params: ThreadReadParams = {
      threadId: input.threadId,
      includeTurns: input.includeTurns,
    }
    const response = await this.sendGeneratedRequest(
      'thread/read',
      params,
      toThreadReadResponse,
    )

    return {
      thread: response.thread as unknown as Record<string, unknown>,
    }
  }

  async startTurn(input: CodexTurnStartInput): Promise<CodexTurnStartResult> {
    const params: TurnStartParams = {
      threadId: input.threadId,
      input: input.input.map(toUserInput),
      cwd: input.cwd,
    }
    const response = await this.sendGeneratedRequest(
      'turn/start',
      params,
      toTurnStartResponse,
    )

    return {
      turnId: response.turn.id,
    }
  }

  async steerTurn(input: CodexTurnSteerInput): Promise<CodexTurnSteerResult> {
    const params: TurnSteerParams = {
      threadId: input.threadId,
      expectedTurnId: input.expectedTurnId,
      input: input.input.map(toUserInput),
    }

    if (input.clientUserMessageId !== undefined) {
      params.clientUserMessageId = input.clientUserMessageId
    }

    const response = await this.sendGeneratedRequest(
      'turn/steer',
      params,
      toTurnSteerResponse,
    )

    return {
      turnId: response.turnId,
    }
  }

  async interruptTurn(
    input: CodexTurnInterruptInput,
  ): Promise<CodexTurnInterruptResult> {
    const params: TurnInterruptParams = {
      threadId: input.threadId,
      turnId: input.turnId,
    }

    return this.sendGeneratedRequest(
      'turn/interrupt',
      params,
      toTurnInterruptResponse,
    )
  }

  async *notifications(): AsyncIterable<CodexRawServerNotification> {
    while (true) {
      const notification = await this.nextNotification()

      if (!notification) {
        return
      }

      yield notification
    }
  }

  start(): void {
    if (this.child) {
      return
    }

    ensureCodexRuntimeHome(this.runtimeHome)
    this.notificationStreamClosed = false

    const childEnv = buildChildEnv(this.runtimeHome, this.env)
    const child = spawn(this.codexBinPath, this.codexArgs, {
      cwd: this.cwd,
      env: childEnv,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    this.child = child
    this.log({
      source: 'process',
      kind: 'spawn',
      message: 'spawned Codex app-server process',
      data: {
        command: this.codexBinPath,
        args: this.codexArgs,
        cwd: this.cwd,
        codexHome: this.runtimeHome.codexHome,
        codexSqliteHome: this.runtimeHome.codexSqliteHome,
      },
    })

    this.stdoutReader = readline.createInterface({ input: child.stdout })
    this.stderrReader = readline.createInterface({ input: child.stderr })

    this.stdoutReader.on('line', (line) => {
      this.handleStdoutLine(line)
    })
    this.stderrReader.on('line', (line) => {
      this.log({
        source: 'server',
        kind: 'stderr',
        raw: line,
      })
    })

    child.once('error', (error) => {
      this.log({
        source: 'process',
        kind: 'error',
        message: error.message,
      })
      this.rejectPendingResponses(error)
      this.closeNotificationStream()
    })

    child.once('exit', (code, signal) => {
      this.log({
        source: 'process',
        kind: 'exit',
        data: {
          code,
          signal,
        },
      })
      this.rejectPendingResponses(
        new Error(
          `Codex app-server exited before completing pending requests${code === null ? '' : ` with code ${code}`}${signal ? ` and signal ${signal}` : ''}`,
        ),
      )
      this.closeNotificationStream()
    })
  }

  async close(signal: NodeJS.Signals = 'SIGTERM'): Promise<void> {
    const child = this.child

    this.stdoutReader?.close()
    this.stderrReader?.close()
    this.stdoutReader = undefined
    this.stderrReader = undefined
    this.child = undefined
    this.closeNotificationStream()

    if (!child) {
      return
    }

    if (child.exitCode !== null || child.signalCode !== null) {
      return
    }

    const exitPromise = new Promise<void>((resolvePromise) => {
      child.once('exit', () => {
        resolvePromise()
      })
    })

    child.kill(signal)

    await Promise.race([exitPromise, delay(1000)])

    if (child.exitCode !== null || child.signalCode !== null) {
      return
    }

    child.kill('SIGKILL')
    await Promise.race([exitPromise, delay(1000)])
  }

  private sendRequest(
    id: string | number,
    request: ClientRequest,
  ): Promise<unknown> {
    const requestId = String(id)
    const responsePromise = new Promise<unknown>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(requestId)
        const error = new Error(
          `${request.method} timed out after ${this.timeoutMs}ms`,
        )
        this.log({
          source: 'process',
          kind: 'timeout',
          message: error.message,
          data: {
            method: request.method,
            id,
          },
        })
        reject(error)
      }, this.timeoutMs)

      this.pendingResponses.set(requestId, {
        method: request.method,
        timeout,
        resolve: resolvePromise,
        reject,
      })
    })

    this.sendJson(request)

    return responsePromise
  }

  private async sendGeneratedRequest<
    Method extends CodexClientRequestMethod,
    Response,
  >(
    method: Method,
    params: CodexClientRequestParams<Method>,
    readResponse: (value: unknown) => Response,
  ): Promise<Response> {
    this.start()

    const requestId = this.createRequestId()
    const request = {
      method,
      id: requestId,
      params,
    } as unknown as CodexClientRequestFor<Method>

    return readResponse(await this.sendRequest(requestId, request))
  }

  private nextNotification(): Promise<CodexRawServerNotification | undefined> {
    const notification = this.notificationQueue.shift()

    if (notification) {
      return Promise.resolve(notification)
    }

    if (this.notificationStreamClosed) {
      return Promise.resolve(undefined)
    }

    return new Promise((resolvePromise) => {
      this.notificationResolvers.push(resolvePromise)
    })
  }

  private sendJson(message: ClientRequest | ClientNotification): void {
    if (!this.child) {
      throw new Error('Codex app-server process has not been started')
    }

    const raw = JSON.stringify(message)

    this.log({
      source: 'client',
      kind: 'stdin',
      raw,
    })
    this.child.stdin.write(`${raw}\n`)
  }

  private handleStdoutLine(line: string): void {
    this.log({
      source: 'server',
      kind: 'stdout',
      raw: line,
    })

    let message: CodexResponseMessage

    try {
      message = JSON.parse(line) as CodexResponseMessage
    } catch {
      this.log({
        source: 'server',
        kind: 'parse_error',
        raw: line,
        message: 'failed to parse Codex app-server stdout line as JSON',
      })
      return
    }

    this.log({
      source: 'server',
      kind: 'message',
      data: {
        id: message.id,
        method: message.method,
        hasResult: message.result !== undefined,
        hasError: message.error !== undefined,
      },
    })

    if (message.id === undefined) {
      if (typeof message.method === 'string') {
        this.handleServerNotification(message, message.method)
      }

      return
    }

    const requestId = String(message.id)
    const pendingResponse = this.pendingResponses.get(requestId)

    if (!pendingResponse) {
      return
    }

    clearTimeout(pendingResponse.timeout)
    this.pendingResponses.delete(requestId)

    if (message.error) {
      this.log({
        source: 'server',
        kind: 'response',
        data: {
          id: message.id,
          method: pendingResponse.method,
          hasError: true,
        },
      })
      pendingResponse.reject(
        new Error(
          `${pendingResponse.method} returned error: ${message.error.message ?? 'unknown Codex app-server error'}`,
        ),
      )
      return
    }

    this.log({
      source: 'server',
      kind: 'response',
      data: {
        id: message.id,
        method: pendingResponse.method,
        hasError: false,
      },
    })
    pendingResponse.resolve(message.result)
  }

  private handleServerNotification(
    message: CodexResponseMessage,
    method: string,
  ): void {
    const serverNotification = {
      ...message,
      method,
    } as ServerNotification
    const timestamp = new Date().toISOString()
    const notification: CodexRawServerNotification = {
      timestamp,
      method: serverNotification.method,
      params: serverNotification.params,
      raw: message as unknown as Record<string, unknown>,
    }

    this.log({
      source: 'server',
      kind: 'notification',
      message: 'received Codex app-server notification',
      data: {
        method: notification.method,
        params: notification.params,
      },
    })
    this.pushNotification(notification)
  }

  private pushNotification(notification: CodexRawServerNotification): void {
    const resolver = this.notificationResolvers.shift()

    if (resolver) {
      resolver(notification)
      return
    }

    this.notificationQueue.push(notification)
  }

  private closeNotificationStream(): void {
    if (this.notificationStreamClosed) {
      return
    }

    this.notificationStreamClosed = true

    for (const resolver of this.notificationResolvers.splice(0)) {
      resolver(undefined)
    }
  }

  private rejectPendingResponses(error: Error): void {
    for (const [requestId, pendingResponse] of this.pendingResponses) {
      clearTimeout(pendingResponse.timeout)
      pendingResponse.reject(error)
      this.pendingResponses.delete(requestId)
    }
  }

  private log(entry: Omit<CodexRawDebugLogEntry, 'timestamp'>): void {
    this.debugLog.push({
      timestamp: new Date().toISOString(),
      ...entry,
    })
  }

  private createRequestId(): number {
    const requestId = this.nextRequestId
    this.nextRequestId += 1

    return requestId
  }
}

export async function runCodexInitializeSmoke(
  options: CodexRawClientOptions = {},
): Promise<CodexInitializeSmokeResult> {
  const client = new CodexRawClient(options)

  try {
    const result = await client.initialize()
    await client.close()

    return {
      ok: true,
      ...result,
      debugLog: client.getDebugLog(),
    }
  } catch (error) {
    await client.close()

    return {
      ok: false,
      error: toErrorMessage(error),
      debugLog: client.getDebugLog(),
      codexBinPath: client.getCodexBinPath(),
      cwd: client.getCwd(),
      runtimeHome: client.getRuntimeHome(),
    }
  }
}

export function resolvePackageCodexBinPath(startDir = packageRoot): string {
  const binName = process.platform === 'win32' ? 'codex.cmd' : 'codex'
  let currentDir = startDir

  while (true) {
    const candidate = join(currentDir, 'node_modules', '.bin', binName)

    if (existsSync(candidate)) {
      return candidate
    }

    const parentDir = dirname(currentDir)

    if (parentDir === currentDir) {
      break
    }

    currentDir = parentDir
  }

  throw new Error(
    'Unable to resolve package-owned Codex binary. Run `npm install` from the workspace root.',
  )
}

export function resolveDefaultCodexRuntimeHome(
  baseDir = join(homedir(), '.ay-ple', 'runtime-codex'),
): CodexRuntimeHome {
  return {
    codexHome: join(baseDir, 'codex-home'),
    codexSqliteHome: join(baseDir, 'sqlite'),
  }
}

export function ensureCodexRuntimeHome(runtimeHome: CodexRuntimeHome): void {
  mkdirSync(runtimeHome.codexHome, { recursive: true })
  mkdirSync(runtimeHome.codexSqliteHome, { recursive: true })
}

function resolveCodexRuntimeHome(
  options: Pick<CodexRawClientOptions, 'codexHome' | 'codexSqliteHome'>,
): CodexRuntimeHome {
  const defaultRuntimeHome = resolveDefaultCodexRuntimeHome()

  return {
    codexHome: resolve(options.codexHome ?? defaultRuntimeHome.codexHome),
    codexSqliteHome: resolve(
      options.codexSqliteHome ?? defaultRuntimeHome.codexSqliteHome,
    ),
  }
}

function buildChildEnv(
  runtimeHome: CodexRuntimeHome,
  explicitEnv: Record<string, string | undefined> | undefined,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {}

  for (const [key, value] of Object.entries(process.env)) {
    if (value === undefined || isTokenLikeEnvKey(key)) {
      continue
    }

    env[key] = value
  }

  if (explicitEnv) {
    for (const [key, value] of Object.entries(explicitEnv)) {
      if (value === undefined) {
        delete env[key]
        continue
      }

      env[key] = value
    }
  }

  env.CODEX_HOME = runtimeHome.codexHome
  env.CODEX_SQLITE_HOME = runtimeHome.codexSqliteHome

  return env
}

function isTokenLikeEnvKey(key: string): boolean {
  return tokenLikeEnvKeyPattern.test(key.toUpperCase())
}

function toInitializeResponse(value: unknown): CodexInitializeResponse {
  if (!isRecord(value)) {
    throw new Error('initialize returned a non-object result')
  }

  return {
    userAgent: readString(value, 'userAgent'),
    codexHome: readString(value, 'codexHome'),
    platformFamily: readString(value, 'platformFamily'),
    platformOs: readString(value, 'platformOs'),
  } satisfies InitializeResponse
}

function toThreadStartResponse(value: unknown): ThreadStartResponse {
  readResponseObjectWithId(value, 'thread/start', 'thread')

  return value as ThreadStartResponse
}

function toThreadListResponse(value: unknown): ThreadListResponse {
  if (!isRecord(value)) {
    throw new Error('thread/list returned a non-object result')
  }

  readArray(value, 'data')
  readStringOrNull(value, 'nextCursor')
  readStringOrNull(value, 'backwardsCursor')

  return value as ThreadListResponse
}

function toThreadLoadedListResponse(value: unknown): ThreadLoadedListResponse {
  if (!isRecord(value)) {
    throw new Error('thread/loaded/list returned a non-object result')
  }

  const data = readArray(value, 'data')

  if (!data.every((threadId) => typeof threadId === 'string')) {
    throw new Error('thread/loaded/list result data must contain thread ids')
  }

  readStringOrNull(value, 'nextCursor')

  return value as ThreadLoadedListResponse
}

function toThreadReadResponse(value: unknown): ThreadReadResponse {
  if (!isRecord(value)) {
    throw new Error('thread/read returned a non-object result')
  }

  if (!isRecord(value.thread)) {
    throw new Error('thread/read result is missing thread object')
  }

  return value as ThreadReadResponse
}

function toTurnStartResponse(value: unknown): TurnStartResponse {
  readResponseObjectWithId(value, 'turn/start', 'turn')

  return value as TurnStartResponse
}

function toTurnSteerResponse(value: unknown): TurnSteerResponse {
  if (!isRecord(value)) {
    throw new Error('turn/steer returned a non-object result')
  }

  readString(value, 'turnId')

  return value as TurnSteerResponse
}

function toTurnInterruptResponse(value: unknown): TurnInterruptResponse {
  if (!isRecord(value)) {
    throw new Error('turn/interrupt returned a non-object result')
  }

  return value as TurnInterruptResponse
}

function readResponseObjectWithId(
  value: unknown,
  method: string,
  objectKey: string,
): void {
  if (!isRecord(value)) {
    throw new Error(`${method} returned a non-object result`)
  }

  const object = value[objectKey]

  if (!isRecord(object)) {
    throw new Error(`${method} result is missing ${objectKey} object`)
  }

  readString(object, 'id')
}

function toUserInput(input: CodexRawTurnInput): UserInput {
  return {
    type: 'text',
    text: input.text,
    text_elements: [],
  } satisfies Extract<UserInput, { type: 'text' }>
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key]

  if (typeof field !== 'string') {
    throw new Error(`result is missing string field: ${key}`)
  }

  return field
}

function readStringOrNull(
  value: Record<string, unknown>,
  key: string,
): string | null {
  const field = value[key]

  if (field !== null && typeof field !== 'string') {
    throw new Error(`result is missing nullable string field: ${key}`)
  }

  return field
}

function readArray(value: Record<string, unknown>, key: string): unknown[] {
  const field = value[key]

  if (!Array.isArray(field)) {
    throw new Error(`result is missing array field: ${key}`)
  }

  return field
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms)
  })
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return 'Codex initialize smoke failed'
}
