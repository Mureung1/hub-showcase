import { constants as fsConstants } from 'node:fs'
import { access, lstat, realpath } from 'node:fs/promises'
import path from 'node:path'

import {
  CODEX_CHAT_APPROVAL_MODE,
  CODEX_CHAT_SANDBOX,
  CodexChatRuntimeError,
  createCodexChatRuntime,
  verifyCodexChatRuntimeBundle,
  type CodexChatEvent,
  type CodexChatRuntime,
  type CodexChatRuntimeEnvironment,
  type CodexChatRuntimeEvidence,
  type CodexChatStatus,
  type CodexChatStreamFrame,
  type CodexChatTurn,
} from '@ay-ple/codex-chat-runtime'
import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

const CHAT_JSON_ENVELOPE_LIMIT = 1024 * 1024
const CHAT_TEXT_MAX_BYTES = 131_072
const DEFAULT_DISCONNECT_DRAIN_MS = 5_000
const SAFE_UNAVAILABLE_MESSAGE = 'Codex Chat is unavailable.'
const SAFE_INVALID_REQUEST_MESSAGE = 'The Codex Chat request is invalid.'
const SAFE_FORBIDDEN_MESSAGE = 'The Codex Chat request is not allowed.'
const SAFE_ACTIVE_TURN_MESSAGE = 'A Codex turn is already active.'
const SAFE_UNKNOWN_THREAD_MESSAGE = 'The Codex thread is not active.'
const SAFE_UNKNOWN_TURN_MESSAGE = 'The Codex turn is not active.'
const SAFE_OPERATION_FAILED_MESSAGE = 'The Codex Chat operation failed.'
const SAFE_STREAM_FAILED_MESSAGE = 'The Codex Chat stream failed.'

const CONFIG_KEYS = [
  'CODEX_CHAT_RUNTIME_ROOT',
  'CODEX_CHAT_WORKSPACE',
  'CODEX_CHAT_RUNTIME_HOME',
  'CODEX_CHAT_CODEX_HOME',
  'CODEX_CHAT_SQLITE_HOME',
  'CODEX_CHAT_TEMP_DIR',
] as const

type UnavailableReason = Extract<
  CodexChatStatus,
  { state: 'unavailable' }
>['reason']

type PreparedRuntime = CodexChatRuntimeEvidence & {
  readonly createRuntime: () => Promise<CodexChatRuntime>
}

type RuntimeSource =
  | {
      readonly kind: 'unavailable'
      readonly reason: UnavailableReason
      readonly origin?: string
    }
  | {
      readonly kind: 'prepared'
      readonly prepared: PreparedRuntime
      readonly origin?: string
    }
  | {
      readonly kind: 'candidate'
      readonly origin?: string
      readonly prepare: () => Promise<
        | { readonly kind: 'prepared'; readonly prepared: PreparedRuntime }
        | { readonly kind: 'unavailable'; readonly reason: UnavailableReason }
      >
    }

type ActiveTurn = {
  readonly threadId: string
  phase: 'starting' | 'streaming'
  turn?: CodexChatTurn
  disconnected: boolean
  interruptRequested: boolean
  drainDeadline?: NodeJS.Timeout
}

export interface CodexChatBootstrap extends CodexChatRuntimeEvidence {
  readonly origin?: string
  readonly createRuntime: () => Promise<CodexChatRuntime>
  /** Test-only operational override. Production uses the five-second bound. */
  readonly disconnectDrainMs?: number
}

export interface CreateCodexChatCompositionOptions {
  readonly bootstrap?: CodexChatBootstrap
  readonly environment?: NodeJS.ProcessEnv
}

export interface CodexChatComposition {
  readonly router: Router
  beginShutdown(): void
  close(): Promise<void>
}

export function createCodexChatComposition(
  options: CreateCodexChatCompositionOptions = {},
): CodexChatComposition {
  const source = options.bootstrap
    ? sourceFromBootstrap(options.bootstrap)
    : sourceFromEnvironment(options.environment ?? process.env)
  const service = new CodexChatService(
    source,
    options.bootstrap?.disconnectDrainMs ?? DEFAULT_DISCONNECT_DRAIN_MS,
  )
  return {
    router: createRouter(service),
    beginShutdown: () => service.beginShutdown(),
    close: () => service.close(),
  }
}

export function isLoopbackAddress(address: string | undefined): boolean {
  if (address === '::1') return true
  const ipv4 = address?.startsWith('::ffff:')
    ? address.slice('::ffff:'.length)
    : address
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(
    ipv4 ?? '',
  )
  if (!match) return false
  return (
    Number(match[1]) === 127 &&
    match.slice(2).every((part) => Number(part) >= 0 && Number(part) <= 255)
  )
}

function sourceFromBootstrap(bootstrap: CodexChatBootstrap): RuntimeSource {
  const origin = canonicalLocalOrigin(bootstrap.origin)
  if (bootstrap.origin !== undefined && origin === undefined) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }
  return {
    kind: 'prepared',
    origin,
    prepared: {
      sourceCommit: bootstrap.sourceCommit,
      runtimeVersion: bootstrap.runtimeVersion,
      createRuntime: bootstrap.createRuntime,
    },
  }
}

function sourceFromEnvironment(environment: NodeJS.ProcessEnv): RuntimeSource {
  const configuredValues = CONFIG_KEYS.map((key) => environment[key])
  const configuredOrigin = environment.CODEX_CHAT_ORIGIN
  const noneConfigured =
    configuredValues.every((value) => value === undefined) &&
    configuredOrigin === undefined
  if (noneConfigured) {
    return { kind: 'unavailable', reason: 'not_configured' }
  }
  if (
    configuredValues.some(
      (value) => value === undefined || value.length === 0 || !path.isAbsolute(value),
    )
  ) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }
  const origin = canonicalLocalOrigin(configuredOrigin)
  if (configuredOrigin !== undefined && origin === undefined) {
    return { kind: 'unavailable', reason: 'invalid_configuration' }
  }

  const [runtimeRoot, workspace, home, codexHome, codexSqliteHome, tempDirectory] =
    configuredValues as [string, string, string, string, string, string]
  const runtimeEnvironment = {
    home,
    codexHome,
    codexSqliteHome,
    tempDirectory,
  } satisfies CodexChatRuntimeEnvironment

  return {
    kind: 'candidate',
    origin,
    prepare: async () => {
      if (!(await validateRuntimePaths(workspace, runtimeEnvironment))) {
        return { kind: 'unavailable', reason: 'invalid_configuration' }
      }
      let evidence: CodexChatRuntimeEvidence
      try {
        evidence = await verifyCodexChatRuntimeBundle(runtimeRoot)
      } catch {
        return { kind: 'unavailable', reason: 'runtime_missing' }
      }
      return {
        kind: 'prepared',
        prepared: {
          ...evidence,
          createRuntime: () =>
            createCodexChatRuntime({
              runtimeRoot,
              workspace,
              environment: runtimeEnvironment,
            }),
        },
      }
    },
  }
}

async function validateRuntimePaths(
  workspace: string,
  environment: CodexChatRuntimeEnvironment,
): Promise<boolean> {
  try {
    const canonicalWorkspace = await validateDirectory(workspace, false)
    const controlled = await Promise.all([
      validateDirectory(environment.home, true),
      validateDirectory(environment.codexHome, true),
      validateDirectory(environment.codexSqliteHome, true),
      validateDirectory(environment.tempDirectory, true),
    ])
    return (
      canonicalWorkspace.length > 0 && new Set(controlled).size === controlled.length
    )
  } catch {
    return false
  }
}

async function validateDirectory(
  directory: string,
  writable: boolean,
): Promise<string> {
  const stats = await lstat(directory)
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new TypeError('Configured path is not a directory')
  }
  await access(
    directory,
    fsConstants.R_OK |
      fsConstants.X_OK |
      (writable ? fsConstants.W_OK : 0),
  )
  return realpath(directory)
}

function canonicalLocalOrigin(origin: string | undefined): string | undefined {
  if (origin === undefined) return undefined
  let parsed: URL
  try {
    parsed = new URL(origin)
  } catch {
    return undefined
  }
  if (
    (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
    parsed.username.length > 0 ||
    parsed.password.length > 0 ||
    parsed.pathname !== '/' ||
    parsed.search.length > 0 ||
    parsed.hash.length > 0 ||
    parsed.origin !== origin ||
    !isLoopbackHostname(parsed.hostname)
  ) {
    return undefined
  }
  return parsed.origin
}

function isLoopbackHostname(hostname: string): boolean {
  if (hostname === 'localhost' || hostname === '[::1]') return true
  return isLoopbackAddress(hostname)
}

function createRouter(service: CodexChatService): Router {
  const router = express.Router()

  router.use((request, response, next) => {
    applyScopedCors(request, response, service.origin)
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      next()
      return
    }
    if (!isAllowedMutation(request, service.origin)) {
      sendHttpError(
        response,
        new CodexChatHttpError(403, 'forbidden', SAFE_FORBIDDEN_MESSAGE),
      )
      return
    }
    if (request.method === 'OPTIONS') {
      response
        .status(204)
        .setHeader('access-control-allow-methods', 'GET, POST, OPTIONS')
        .setHeader('access-control-allow-headers', 'content-type')
        .end()
      return
    }
    next()
  })

  router.get('/status', async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    response.json(await service.status())
  })

  router.use(
    express.json({
      limit: CHAT_JSON_ENVELOPE_LIMIT,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/threads', async (request, response) => {
    if (!isExactObject(request.body, [])) {
      sendHttpError(response, invalidRequest())
      return
    }
    let disconnected = request.aborted || response.destroyed
    const onAborted = () => {
      disconnected = true
    }
    request.once('aborted', onAborted)
    request.socket.once('close', onAborted)
    const onResponseClose = () => {
      if (!response.writableEnded) {
        disconnected = true
      }
    }
    response.once('close', onResponseClose)
    const isDisconnected = () =>
      disconnected ||
      request.aborted ||
      request.socket.destroyed ||
      response.destroyed
    try {
      const thread = await service.startThread(isDisconnected)
      if (!thread) return
      if (isDisconnected()) {
        await service.abandonThread(thread.threadId)
        return
      }
      response.status(201).json(thread)
    } catch (error) {
      if (!disconnected && !response.destroyed) {
        sendHttpError(response, toHttpError(error))
      }
    } finally {
      request.off('aborted', onAborted)
      request.socket.off('close', onAborted)
      response.off('close', onResponseClose)
    }
  })

  router.post('/threads/:threadId/turns', async (request, response) => {
    const text = parseTurnText(request.body)
    if (text === undefined || !isNativeId(request.params.threadId)) {
      sendHttpError(response, invalidRequest())
      return
    }
    let disconnected = request.aborted || response.destroyed
    const onClose = () => {
      if (!response.writableEnded) {
        disconnected = true
        service.disconnectTurn(request.params.threadId)
      }
    }
    const onAborted = () => {
      disconnected = true
      service.disconnectTurn(request.params.threadId)
    }
    request.once('aborted', onAborted)
    request.socket.once('close', onAborted)
    response.once('close', onClose)
    const isDisconnected = () =>
      disconnected ||
      request.aborted ||
      request.socket.destroyed ||
      response.destroyed
    try {
      const turn = await service.startTurn(
        request.params.threadId,
        text,
        isDisconnected,
      )
      if (!turn) return
      await service.streamTurn(
        turn,
        isDisconnected() ? undefined : response,
        isDisconnected,
      )
    } catch (error) {
      if (!disconnected && !response.destroyed && !response.headersSent) {
        sendHttpError(response, toHttpError(error))
      }
    } finally {
      request.off('aborted', onAborted)
      request.socket.off('close', onAborted)
      response.off('close', onClose)
    }
  })

  router.post(
    '/threads/:threadId/turns/:turnId/interrupt',
    async (request, response) => {
      if (
        !isExactObject(request.body, []) ||
        !isNativeId(request.params.threadId) ||
        !isNativeId(request.params.turnId)
      ) {
        sendHttpError(response, invalidRequest())
        return
      }
      try {
        await service.interrupt(request.params.threadId, request.params.turnId)
        response.status(202).end()
      } catch (error) {
        sendHttpError(response, toHttpError(error))
      }
    },
  )

  router.use(
    (
      _error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      if (!response.headersSent) sendHttpError(response, invalidRequest())
    },
  )

  return router
}

class CodexChatService {
  readonly origin?: string

  private source: RuntimeSource
  private readonly disconnectDrainMs: number
  private preparation?: Promise<void>
  private prepared?: PreparedRuntime
  private unavailableReason?: UnavailableReason
  private runtime?: CodexChatRuntime
  private runtimePromise?: Promise<CodexChatRuntime>
  private runtimeClosePromise?: Promise<void>
  private runtimeFailureCode?: string
  private currentThreadId?: string
  private threadStarting = false
  private activeTurn?: ActiveTurn
  private shuttingDown = false
  private closePromise?: Promise<void>

  constructor(source: RuntimeSource, disconnectDrainMs: number) {
    this.source = source
    this.origin = source.origin
    this.disconnectDrainMs = disconnectDrainMs
    if (source.kind === 'prepared') this.prepared = source.prepared
    if (source.kind === 'unavailable') this.unavailableReason = source.reason
  }

  async status(): Promise<CodexChatStatus> {
    await this.ensurePrepared()
    if (this.unavailableReason) return unavailableStatus(this.unavailableReason)
    const evidence = this.evidence()
    if (this.runtimeFailureCode) {
      return policyStatus({
        state: 'failed',
        ...evidence,
        failureCode: this.runtimeFailureCode,
      })
    }
    return policyStatus({
      state: this.runtime ? 'ready' : this.runtimePromise ? 'starting' : 'configured',
      ...evidence,
    })
  }

  beginShutdown(): void {
    this.shuttingDown = true
  }

  close(): Promise<void> {
    this.beginShutdown()
    this.closePromise ??= this.closeOnce()
    return this.closePromise
  }

  async startThread(
    disconnected: () => boolean,
  ): Promise<{ readonly threadId: string } | undefined> {
    this.requireAvailable()
    if (this.threadStarting || this.activeTurn) throw activeTurnError()
    this.threadStarting = true
    try {
      const runtime = await this.getRuntime()
      if (disconnected()) return undefined
      if (this.currentThreadId) {
        await runtime.releaseThread({ threadId: this.currentThreadId })
        this.currentThreadId = undefined
      }
      if (disconnected()) return undefined
      let thread
      try {
        thread = await runtime.startThread()
      } catch (error) {
        await this.handleUnknownOutcome(error)
        throw error
      }
      if (disconnected()) {
        try {
          await runtime.releaseThread({ threadId: thread.threadId })
        } catch {
          await this.failAndClose('thread_release_failed')
        }
        return undefined
      }
      this.currentThreadId = thread.threadId
      return thread
    } finally {
      this.threadStarting = false
    }
  }

  async abandonThread(threadId: string): Promise<void> {
    if (this.currentThreadId !== threadId || this.activeTurn) return
    this.currentThreadId = undefined
    try {
      await this.runtime?.releaseThread({ threadId })
    } catch {
      await this.failAndClose('thread_release_failed')
    }
  }

  async startTurn(
    threadId: string,
    text: string,
    disconnected: () => boolean,
  ): Promise<CodexChatTurn | undefined> {
    this.requireAvailable()
    if (this.currentThreadId !== threadId) throw unknownThreadError()
    if (this.threadStarting || this.activeTurn) throw activeTurnError()
    const reservation: ActiveTurn = {
      threadId,
      phase: 'starting',
      disconnected: disconnected(),
      interruptRequested: false,
    }
    this.activeTurn = reservation
    let runtime: CodexChatRuntime
    try {
      runtime = await this.getRuntime()
      const turn = await runtime.startTurn({ threadId, text })
      reservation.phase = 'streaming'
      reservation.turn = turn
      if (reservation.disconnected || disconnected()) {
        reservation.disconnected = true
        this.beginDisconnectCleanup(reservation)
      }
      return turn
    } catch (error) {
      if (this.activeTurn === reservation) this.activeTurn = undefined
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  async streamTurn(
    turn: CodexChatTurn,
    response: Response | undefined,
    disconnected: () => boolean,
  ): Promise<void> {
    const active = this.activeTurn
    if (!active || active.turn !== turn) throw unknownTurnError()
    let terminalSeen = false
    let runtimeFailed = false
    try {
      if (response && !disconnected()) {
        response.status(200)
        response.setHeader('content-type', 'application/x-ndjson')
        response.setHeader('cache-control', 'no-store')
        const accepted = await writeNdjsonLine(response, {
          type: 'turn.accepted',
          threadId: turn.threadId,
          turnId: turn.turnId,
        })
        if (!accepted) {
          active.disconnected = true
          this.beginDisconnectCleanup(active)
          response = undefined
        }
      }
      for await (const event of turn.events) {
        if (isTerminalEvent(event)) terminalSeen = true
        if (event.type === 'runtime.failed') {
          runtimeFailed = true
          this.runtimeFailureCode = safeFailureCode(event.code)
        }
        if (response && !disconnected()) {
          const written = await writeNdjsonLine(response, event)
          if (!written) {
            active.disconnected = true
            this.beginDisconnectCleanup(active)
            response = undefined
          }
        }
        if (terminalSeen) break
      }
      if (!terminalSeen) {
        await this.emitPostAcceptanceFailure(response, 'runtime_stream_ended')
      }
    } catch (error) {
      const code =
        error instanceof CodexChatRuntimeError
          ? safeFailureCode(error.code)
          : 'runtime_stream_failed'
      await this.emitPostAcceptanceFailure(response, code)
    } finally {
      this.finishTurn(active)
      if (runtimeFailed) await this.closeRuntime().catch(() => undefined)
      if (response && !response.writableEnded && !response.destroyed) response.end()
    }
  }

  disconnectTurn(threadId: string): void {
    const active = this.activeTurn
    if (!active || active.threadId !== threadId) return
    active.disconnected = true
    if (active.phase === 'streaming') this.beginDisconnectCleanup(active)
  }

  async interrupt(threadId: string, turnId: string): Promise<void> {
    this.requireAvailable()
    const active = this.activeTurn
    if (
      !active ||
      active.phase !== 'streaming' ||
      active.threadId !== threadId ||
      active.turn?.turnId !== turnId
    ) {
      throw unknownTurnError()
    }
    active.interruptRequested = true
    try {
      await this.runtime?.interrupt({ threadId, turnId })
    } catch (error) {
      await this.handleUnknownOutcome(error)
      throw error
    }
  }

  private async ensurePrepared(): Promise<void> {
    if (this.prepared || this.unavailableReason || this.source.kind !== 'candidate') {
      return
    }
    this.preparation ??= this.prepareCandidate(this.source)
    await this.preparation
  }

  private async prepareCandidate(
    source: Extract<RuntimeSource, { kind: 'candidate' }>,
  ): Promise<void> {
    const result = await source.prepare()
    if (result.kind === 'prepared') {
      this.prepared = result.prepared
      return
    }
    this.unavailableReason = result.reason
  }

  private async getRuntime(): Promise<CodexChatRuntime> {
    this.requireAvailable()
    await this.ensurePrepared()
    this.requireAvailable()
    if (this.runtime) return this.runtime
    if (this.runtimeFailureCode) throw unavailableError()
    const prepared = this.prepared
    if (!prepared) throw unavailableError()
    this.runtimePromise ??= prepared.createRuntime()
    try {
      this.runtime = await this.runtimePromise
      if (this.shuttingDown) {
        await this.closeRuntime()
        throw unavailableError()
      }
      return this.runtime
    } catch (error) {
      if (!(error instanceof CodexChatHttpError)) {
        this.runtimeFailureCode = safeFailureCode(
          error instanceof CodexChatRuntimeError
            ? error.code
            : 'runtime_start_failed',
        )
      }
      throw error
    }
  }

  private requireAvailable(): void {
    if (this.shuttingDown || this.unavailableReason || this.runtimeFailureCode) {
      throw unavailableError()
    }
  }

  private evidence(): CodexChatRuntimeEvidence {
    if (!this.prepared) throw new TypeError('Codex Chat evidence is unavailable')
    return {
      sourceCommit: this.prepared.sourceCommit,
      runtimeVersion: this.prepared.runtimeVersion,
    }
  }

  private beginDisconnectCleanup(active: ActiveTurn): void {
    if (!active.turn || this.activeTurn !== active) return
    if (!active.interruptRequested) {
      active.interruptRequested = true
      void this.runtime
        ?.interrupt({
          threadId: active.threadId,
          turnId: active.turn.turnId,
        })
        .catch((error: unknown) => this.handleUnknownOutcome(error))
    }
    if (!active.drainDeadline) {
      active.drainDeadline = setTimeout(() => {
        if (this.activeTurn === active) {
          void this.failAndClose('disconnect_drain_timeout')
        }
      }, this.disconnectDrainMs)
    }
  }

  private finishTurn(active: ActiveTurn): void {
    if (active.drainDeadline) clearTimeout(active.drainDeadline)
    if (this.activeTurn === active) this.activeTurn = undefined
  }

  private async emitPostAcceptanceFailure(
    response: Response | undefined,
    failureCode: string,
  ): Promise<void> {
    this.runtimeFailureCode = safeFailureCode(failureCode)
    if (response && !response.destroyed && !response.writableEnded) {
      await writeNdjsonLine(response, {
        type: 'runtime.failed',
        code: this.runtimeFailureCode,
        displayMessage: SAFE_STREAM_FAILED_MESSAGE,
        mutationOutcomeKnown: true,
      })
    }
    await this.closeRuntime().catch(() => undefined)
  }

  private async handleUnknownOutcome(error: unknown): Promise<void> {
    if (error instanceof CodexChatRuntimeError && error.unknownOutcome) {
      await this.failAndClose(error.code)
    }
  }

  private async failAndClose(code: string): Promise<void> {
    this.runtimeFailureCode = safeFailureCode(code)
    await this.closeRuntime().catch(() => undefined)
  }

  private closeRuntime(): Promise<void> {
    this.runtimeClosePromise ??= this.closeRuntimeOnce()
    return this.runtimeClosePromise
  }

  private async closeRuntimeOnce(): Promise<void> {
    let runtime = this.runtime
    if (!runtime && this.runtimePromise) {
      runtime = await this.runtimePromise.catch(() => undefined)
    }
    if (runtime) await runtime.close()
  }

  private async closeOnce(): Promise<void> {
    if (this.activeTurn) this.disconnectTurn(this.activeTurn.threadId)
    await this.closeRuntime()
  }
}

class CodexChatHttpError extends Error {
  readonly status: number
  readonly code: string
  readonly displayMessage: string
  readonly unknownOutcome?: boolean

  constructor(
    status: number,
    code: string,
    displayMessage: string,
    unknownOutcome?: boolean,
  ) {
    super(displayMessage)
    this.status = status
    this.code = code
    this.displayMessage = displayMessage
    this.unknownOutcome = unknownOutcome
  }
}

function toHttpError(error: unknown): CodexChatHttpError {
  if (error instanceof CodexChatHttpError) return error
  if (error instanceof CodexChatRuntimeError) {
    return new CodexChatHttpError(
      error.code.includes('timeout') ? 504 : 502,
      safeFailureCode(error.code),
      error.displayMessage,
      error.unknownOutcome,
    )
  }
  return new CodexChatHttpError(
    502,
    'codex_chat_failed',
    SAFE_OPERATION_FAILED_MESSAGE,
    false,
  )
}

function invalidRequest(): CodexChatHttpError {
  return new CodexChatHttpError(
    400,
    'invalid_request',
    SAFE_INVALID_REQUEST_MESSAGE,
  )
}

function activeTurnError(): CodexChatHttpError {
  return new CodexChatHttpError(409, 'active_turn', SAFE_ACTIVE_TURN_MESSAGE)
}

function unknownThreadError(): CodexChatHttpError {
  return new CodexChatHttpError(
    404,
    'unknown_thread',
    SAFE_UNKNOWN_THREAD_MESSAGE,
  )
}

function unknownTurnError(): CodexChatHttpError {
  return new CodexChatHttpError(
    404,
    'unknown_turn',
    SAFE_UNKNOWN_TURN_MESSAGE,
  )
}

function unavailableError(): CodexChatHttpError {
  return new CodexChatHttpError(
    503,
    'codex_chat_unavailable',
    SAFE_UNAVAILABLE_MESSAGE,
  )
}

function sendHttpError(response: Response, error: CodexChatHttpError): void {
  const body =
    error.unknownOutcome === undefined
      ? { code: error.code, displayMessage: error.displayMessage }
      : {
          code: error.code,
          displayMessage: error.displayMessage,
          unknownOutcome: error.unknownOutcome,
        }
  response.status(error.status).json(body)
}

function unavailableStatus(reason: UnavailableReason): CodexChatStatus {
  return policyStatus({ state: 'unavailable', reason })
}

function policyStatus<T extends object>(status: T): T & {
  readonly approvalMode: typeof CODEX_CHAT_APPROVAL_MODE
  readonly sandbox: typeof CODEX_CHAT_SANDBOX
} {
  return {
    ...status,
    approvalMode: CODEX_CHAT_APPROVAL_MODE,
    sandbox: CODEX_CHAT_SANDBOX,
  }
}

function safeFailureCode(code: string): string {
  return /^[a-z][a-z0-9_]{0,63}$/.test(code) ? code : 'runtime_failed'
}

function isExactObject(
  value: unknown,
  expectedKeys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const keys = Object.keys(value).sort()
  const expected = [...expectedKeys].sort()
  return (
    keys.length === expected.length &&
    keys.every((key, index) => key === expected[index])
  )
}

function parseTurnText(body: unknown): string | undefined {
  if (!isExactObject(body, ['text']) || typeof body.text !== 'string') {
    return undefined
  }
  if (
    body.text.trim().length === 0 ||
    Buffer.byteLength(body.text, 'utf8') > CHAT_TEXT_MAX_BYTES
  ) {
    return undefined
  }
  return body.text
}

function isNativeId(value: string): boolean {
  return value.length > 0
}

function isTerminalEvent(event: CodexChatEvent): boolean {
  return event.type === 'turn.completed' || event.type === 'runtime.failed'
}

function isAllowedMutation(request: Request, configuredOrigin?: string): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const origin = request.get('origin')
  return origin === undefined || origin === configuredOrigin
}

function applyScopedCors(
  request: Request,
  response: Response,
  configuredOrigin?: string,
): void {
  const origin = request.get('origin')
  if (origin && origin === configuredOrigin) {
    response.setHeader('access-control-allow-origin', origin)
    response.setHeader('vary', 'Origin')
  }
}

export interface NdjsonWritable {
  readonly destroyed: boolean
  readonly writableEnded: boolean
  write(chunk: string): boolean
  once(event: 'close' | 'drain', listener: () => void): unknown
  off(event: 'close' | 'drain', listener: () => void): unknown
}

export async function writeNdjsonLine(
  response: NdjsonWritable,
  frame: CodexChatStreamFrame,
): Promise<boolean> {
  if (response.destroyed || response.writableEnded) return false
  if (response.write(`${JSON.stringify(frame)}\n`)) return true
  if (response.destroyed || response.writableEnded) return false
  return new Promise((resolve) => {
    const onDrain = () => finish(true)
    const onClose = () => finish(false)
    const finish = (written: boolean) => {
      response.off('drain', onDrain)
      response.off('close', onClose)
      resolve(written)
    }
    response.once('drain', onDrain)
    response.once('close', onClose)
  })
}
