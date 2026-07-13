import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import readline from 'node:readline'
import { Ajv, type ValidateFunction } from 'ajv'
import clientRequestResponseSchemas from './internal/codex-app-server-protocol/generated/ClientRequestResponses.schema.json' with { type: 'json' }
import serverRequestSchema from './internal/codex-app-server-protocol/generated/ServerRequest.schema.json' with { type: 'json' }
import serverRequestResponseSchemas from './internal/codex-app-server-protocol/generated/ServerRequestResponses.schema.json' with { type: 'json' }
import type {
  ClientNotification,
  ClientRequest,
  RequestId,
  ServerRequest,
} from './internal/codex-app-server-protocol/generated/index.js'
import type { ServerRequestResponseByMethod } from './internal/codex-app-server-protocol/server-request-response-contract.js'

export type CodexStdioTransportOptions = {
  command: string
  args?: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  requestTimeoutMs?: number
  closeTimeoutMs?: number
  maxClientRequestIdentities?: number
  maxQueuedObservations?: number
  startSettlementBarrier?: Promise<void>
  forceKill?: (pid: number) => void
}

export type CodexProtocolErrorResponse = {
  code: number
  message: string
  data?: unknown
}

export type CodexStdioProtocolFailureCode =
  | 'malformed_json'
  | 'invalid_message'
  | 'ambiguous_message'
  | 'unknown_response'
  | 'duplicate_response'
  | 'duplicate_server_request'

export type CodexStdioTransportFailureCode =
  | 'spawn_error'
  | 'child_exit'
  | 'stdout_eof'
  | 'stdout_error'
  | 'stdin_error'
  | 'request_identity_limit'
  | 'observation_queue_limit'
  | 'observation_consumer_conflict'
  | 'close_timeout'
  | 'transport_closed'

export class CodexStdioProtocolError extends Error {
  readonly code: CodexStdioProtocolFailureCode

  constructor(code: CodexStdioProtocolFailureCode, message: string) {
    super(message)
    this.name = 'CodexStdioProtocolError'
    this.code = code
  }
}

export class CodexStdioTransportError extends Error {
  readonly code: CodexStdioTransportFailureCode

  constructor(code: CodexStdioTransportFailureCode, message: string) {
    super(message)
    this.name = 'CodexStdioTransportError'
    this.code = code
  }
}

export class CodexStdioRequestError extends Error {
  readonly code = 'request_timeout' as const

  constructor(message: string) {
    super(message)
    this.name = 'CodexStdioRequestError'
  }
}

type ServerRequestMethod = ServerRequest['method']

const generatedProtocolValidator = new Ajv({
  strict: false,
  formats: {
    double: true,
    int64: true,
    uint: true,
    uint32: true,
    uint64: true,
  },
})

const validateGeneratedServerRequest =
  generatedProtocolValidator.compile(serverRequestSchema)

type ServerRequestContract = {
  validateResponse: ValidateFunction
}

const serverRequestContracts = Object.fromEntries(
  Object.entries(serverRequestResponseSchemas).map(([method, schema]) => [
    method,
    { validateResponse: generatedProtocolValidator.compile(schema) },
  ]),
) as Record<ServerRequestMethod, ServerRequestContract>

const clientRequestResponseValidators = Object.fromEntries(
  Object.entries(clientRequestResponseSchemas).map(([method, schema]) => [
    method,
    generatedProtocolValidator.compile(schema),
  ]),
) as Record<string, ValidateFunction | undefined>

export type CodexStdioServerRequestFor<Method extends ServerRequestMethod> = {
  id: RequestId
  method: Method
  params: unknown
  respond: (
    result: ServerRequestResponseByMethod[Method],
  ) => Promise<void>
  respondError: (error: CodexProtocolErrorResponse) => Promise<void>
  dismiss: () => boolean
}

export type CodexStdioServerRequest = {
  [Method in ServerRequestMethod]: CodexStdioServerRequestFor<Method>
}[ServerRequestMethod]

export type CodexStdioUnknownServerRequest = {
  id: RequestId
  method: string
  params?: unknown
  respondError: (error: CodexProtocolErrorResponse) => Promise<void>
  dismiss: () => boolean
}

export type CodexStdioObservation =
  | {
      kind: 'server_request'
      request: CodexStdioServerRequest
    }
  | {
      kind: 'unknown_server_request'
      request: CodexStdioUnknownServerRequest
    }
  | {
      kind: 'server_notification'
      method: string
      params?: unknown
    }
  | {
      kind: 'protocol_error'
      code: CodexStdioProtocolFailureCode
      message: string
    }
  | {
      kind: 'transport_lost'
      code: Exclude<
        CodexStdioTransportFailureCode,
        | 'close_timeout'
        | 'observation_consumer_conflict'
        | 'transport_closed'
      >
      message: string
      exitCode?: number | null
      signal?: NodeJS.Signals | null
    }

type ClientRequestLifecycle =
  | {
      state: 'pending'
      method: string
      timeout: NodeJS.Timeout
      resolve: (result: unknown) => void
      reject: (error: Error) => void
    }
  | { state: 'completed' }
  | { state: 'timed_out' }

type ObservationResolver = (
  observation: CodexStdioObservation | undefined,
) => void

type ParsedMessage = Record<string, unknown>

const defaultRequestTimeoutMs = 15000
const defaultCloseTimeoutMs = 1000
const defaultMaxClientRequestIdentities = 65536
const defaultMaxQueuedObservations = 1024

export class CodexStdioTransport {
  private readonly options: Required<
    Pick<
      CodexStdioTransportOptions,
      | 'args'
      | 'requestTimeoutMs'
      | 'closeTimeoutMs'
      | 'maxClientRequestIdentities'
      | 'maxQueuedObservations'
    >
  > &
    Omit<
      CodexStdioTransportOptions,
      | 'args'
      | 'requestTimeoutMs'
      | 'closeTimeoutMs'
      | 'maxClientRequestIdentities'
      | 'maxQueuedObservations'
    >
  private readonly clientRequests = new Map<string, ClientRequestLifecycle>()
  private readonly activeServerRequests = new Map<string, symbol>()
  private readonly observationQueue: CodexStdioObservation[] = []
  private readonly observationResolvers: ObservationResolver[] = []
  private child: ChildProcessWithoutNullStreams | undefined
  private stdoutReader: readline.Interface | undefined
  private startPromise: Promise<void> | undefined
  private closePromise: Promise<void> | undefined
  private pendingStartReject: ((error: Error) => void) | undefined
  private observationStreamClosed = false
  private observationConsumerClaimed = false
  private connectionFailure: Error | undefined
  private closing = false

  constructor(options: CodexStdioTransportOptions) {
    const maxClientRequestIdentities =
      options.maxClientRequestIdentities ?? defaultMaxClientRequestIdentities
    const maxQueuedObservations =
      options.maxQueuedObservations ?? defaultMaxQueuedObservations

    if (
      !Number.isSafeInteger(maxClientRequestIdentities) ||
      maxClientRequestIdentities <= 0
    ) {
      throw new RangeError(
        'maxClientRequestIdentities must be a positive safe integer',
      )
    }

    if (
      !Number.isSafeInteger(maxQueuedObservations) ||
      maxQueuedObservations <= 0
    ) {
      throw new RangeError(
        'maxQueuedObservations must be a positive safe integer',
      )
    }

    this.options = {
      ...options,
      args: options.args ?? [],
      requestTimeoutMs: options.requestTimeoutMs ?? defaultRequestTimeoutMs,
      closeTimeoutMs: options.closeTimeoutMs ?? defaultCloseTimeoutMs,
      maxClientRequestIdentities,
      maxQueuedObservations,
    }
  }

  async sendRequest(request: ClientRequest): Promise<unknown> {
    assertRequestId(request.id)
    await this.start()
    this.assertWritable()

    const requestKey = identityKey(request.id)

    if (this.clientRequests.has(requestKey)) {
      throw new CodexStdioProtocolError(
        'duplicate_response',
        'Client request identity has already been used on this connection',
      )
    }

    if (
      this.clientRequests.size >= this.options.maxClientRequestIdentities
    ) {
      throw this.reportTransportLoss(
        'request_identity_limit',
        'Codex stdio transport reached its Client request identity limit',
      )
    }

    const response = new Promise<unknown>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        const lifecycle = this.clientRequests.get(requestKey)

        if (!lifecycle || lifecycle.state !== 'pending') {
          return
        }

        this.clientRequests.set(requestKey, { state: 'timed_out' })
        lifecycle.reject(
          new CodexStdioRequestError(
            `${request.method} timed out waiting for a response`,
          ),
        )
      }, this.options.requestTimeoutMs)

      this.clientRequests.set(requestKey, {
        state: 'pending',
        method: request.method,
        timeout,
        resolve: resolvePromise,
        reject,
      })
    })

    try {
      await this.writeMessage(request)
    } catch (error) {
      const lifecycle = this.clientRequests.get(requestKey)

      if (lifecycle?.state === 'pending') {
        clearTimeout(lifecycle.timeout)
        this.clientRequests.delete(requestKey)
        lifecycle.reject(toError(error))
      }
    }

    return response
  }

  async sendNotification(notification: ClientNotification): Promise<void> {
    await this.start()
    this.assertWritable()
    await this.writeMessage(notification)
  }

  start(): Promise<void> {
    if (this.closing || this.connectionFailure) {
      try {
        this.assertWritable()
      } catch (error) {
        return Promise.reject(error)
      }
    }

    if (this.startPromise) {
      return this.startPromise
    }

    try {
      this.startPromise = this.spawnChild()
    } catch (error) {
      this.startPromise = Promise.reject(toError(error))
    }

    return this.startPromise
  }

  observations(): AsyncIterable<CodexStdioObservation> {
    if (this.observationConsumerClaimed) {
      throw new CodexStdioTransportError(
        'observation_consumer_conflict',
        'Codex stdio transport supports one observation consumer',
      )
    }

    this.observationConsumerClaimed = true

    return this.iterateObservations()
  }

  private async *iterateObservations(): AsyncIterable<CodexStdioObservation> {
    while (true) {
      const observation = await this.nextObservation()

      if (!observation) {
        return
      }

      yield observation
    }
  }

  close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = this.closeConnection()
    }

    return this.closePromise
  }

  private async closeConnection(): Promise<void> {
    this.closing = true
    this.rejectPendingStart(
      new CodexStdioTransportError(
        'transport_closed',
        'Codex stdio transport was closed before startup completed',
      ),
    )
    const child = this.child
    this.child = undefined
    this.stdoutReader?.close()
    this.stdoutReader = undefined
    this.rejectPendingClientResponses(
      new CodexStdioTransportError(
        'transport_closed',
        'Codex stdio transport was closed',
      ),
    )
    this.activeServerRequests.clear()
    this.closeObservationStream()

    if (!child || child.exitCode !== null || child.signalCode !== null) {
      return
    }

    const exited = new Promise<void>((resolvePromise) => {
      child.once('exit', () => resolvePromise())
    })

    child.kill('SIGTERM')
    await Promise.race([exited, delay(this.options.closeTimeoutMs)])

    if (child.exitCode !== null || child.signalCode !== null) {
      return
    }

    if (this.options.forceKill && child.pid !== undefined) {
      this.options.forceKill(child.pid)
    } else {
      child.kill('SIGKILL')
    }
    await Promise.race([exited, delay(this.options.closeTimeoutMs)])

    if (child.exitCode === null && child.signalCode === null) {
      throw new CodexStdioTransportError(
        'close_timeout',
        'Codex stdio transport could not confirm child termination',
      )
    }
  }

  private spawnChild(): Promise<void> {
    let child: ChildProcessWithoutNullStreams

    try {
      child = spawn(this.options.command, this.options.args, {
        cwd: this.options.cwd,
        env: this.options.env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch {
      throw this.reportTransportLoss(
        'spawn_error',
        'Codex app-server process could not be spawned',
      )
    }

    this.child = child
    this.stdoutReader = readline.createInterface({ input: child.stdout })
    child.stderr.resume()
    child.stderr.on('error', () => {})
    this.stdoutReader.on('line', (line) => this.handleStdoutLine(line))

    const started = new Promise<void>((resolvePromise, reject) => {
      let settled = false

      const resolveStart = (): void => {
        if (settled) {
          return
        }

        if (this.closing || this.child !== child) {
          rejectStart(
            new CodexStdioTransportError(
              'transport_closed',
              'Codex stdio transport was closed before startup completed',
            ),
          )
          return
        }

        settled = true
        this.pendingStartReject = undefined
        resolvePromise()
      }

      const rejectStart = (error: Error): void => {
        if (settled) {
          return
        }

        settled = true
        this.pendingStartReject = undefined
        reject(error)
      }

      this.pendingStartReject = rejectStart
      child.once('spawn', () => {
        const barrier = this.options.startSettlementBarrier

        if (!barrier) {
          resolveStart()
          return
        }

        void barrier.then(resolveStart, rejectStart)
      })
      child.once('error', () => {
        const error = this.reportTransportLoss(
          'spawn_error',
          'Codex app-server process emitted an error',
        )
        rejectStart(error)
      })
    })
    child.once('exit', (exitCode, signal) => {
      this.reportTransportLoss(
        'child_exit',
        'Codex app-server process exited',
        { exitCode, signal },
      )
    })
    child.stdout.once('end', () => {
      setTimeout(() => {
        if (
          child.exitCode !== null ||
          child.signalCode !== null ||
          this.closing ||
          this.connectionFailure
        ) {
          return
        }

        this.reportTransportLoss(
          'stdout_eof',
          'Codex app-server stdout ended',
        )
      }, 10)
    })
    child.stdout.once('error', () => {
      this.reportTransportLoss(
        'stdout_error',
        'Codex app-server stdout failed',
      )
    })
    child.stdin.on('error', () => {
      this.reportTransportLoss(
        'stdin_error',
        'Codex app-server stdin failed',
      )
    })

    return started
  }

  private async writeMessage(message: object): Promise<void> {
    this.assertWritable()
    const child = this.child

    if (!child) {
      throw new CodexStdioTransportError(
        'transport_closed',
        'Codex app-server process is not available',
      )
    }

    const raw = `${JSON.stringify(message)}\n`

    await new Promise<void>((resolvePromise, reject) => {
      child.stdin.write(raw, (writeError) => {
        if (!writeError) {
          resolvePromise()
          return
        }

        const error = this.reportTransportLoss(
          'stdin_error',
          'Codex app-server stdin write failed',
        )
        reject(error)
      })
    })
  }

  private handleStdoutLine(line: string): void {
    if (this.connectionFailure || this.closing) {
      return
    }

    const rawProtocolFailure = inspectRawProtocolEnvelope(line)

    if (rawProtocolFailure === 'unsafe_numeric_id') {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted an unsafe numeric request identity',
      )
      return
    }

    if (rawProtocolFailure === 'duplicate_protocol_key') {
      this.failProtocol(
        'ambiguous_message',
        'Codex app-server emitted duplicate top-level protocol keys',
      )
      return
    }

    let value: unknown

    try {
      value = JSON.parse(line)
    } catch {
      this.failProtocol(
        'malformed_json',
        'Codex app-server emitted malformed JSON',
      )
      return
    }

    if (!isRecord(value)) {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted a non-object message',
      )
      return
    }

    const hasId = Object.hasOwn(value, 'id')
    const hasMethod = Object.hasOwn(value, 'method')
    const hasResult = Object.hasOwn(value, 'result')
    const hasError = Object.hasOwn(value, 'error')

    if (
      (hasResult && hasError) ||
      (hasMethod && (hasResult || hasError)) ||
      (!hasId && (hasResult || hasError))
    ) {
      this.failProtocol(
        'ambiguous_message',
        'Codex app-server emitted an ambiguous protocol message',
      )
      return
    }

    if (hasId && !isRequestId(value.id)) {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted an invalid request identity',
      )
      return
    }

    if (hasMethod && typeof value.method !== 'string') {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted an invalid method',
      )
      return
    }

    if (hasId && hasMethod) {
      if (
        isServerRequestMethod(value.method as string) &&
        (!Object.hasOwn(value, 'params') ||
          !validateGeneratedServerRequest(value))
      ) {
        this.failProtocol(
          'invalid_message',
          'Codex app-server emitted invalid Server request params',
        )
        return
      }

      this.handleServerRequest(value)
      return
    }

    if (hasMethod) {
      this.pushObservation({
        kind: 'server_notification',
        method: value.method as string,
        ...(Object.hasOwn(value, 'params') ? { params: value.params } : {}),
      })
      return
    }

    if (hasId && (hasResult || hasError)) {
      this.handleClientResponse(value, hasError)
      return
    }

    this.failProtocol(
      'invalid_message',
      'Codex app-server emitted an unclassifiable protocol message',
    )
  }

  private handleClientResponse(message: ParsedMessage, hasError: boolean): void {
    const id = message.id as RequestId
    const key = identityKey(id)
    const lifecycle = this.clientRequests.get(key)

    if (!lifecycle) {
      this.failProtocol(
        'unknown_response',
        'Codex app-server emitted a response for an unknown Client request',
      )
      return
    }

    if (lifecycle.state === 'timed_out') {
      return
    }

    if (lifecycle.state === 'completed') {
      this.failProtocol(
        'duplicate_response',
        'Codex app-server emitted a duplicate Client response',
      )
      return
    }

    if (hasError && !isProtocolErrorResponse(message.error)) {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted an invalid error response',
      )
      return
    }

    const validateResponse =
      clientRequestResponseValidators[lifecycle.method]

    if (!hasError && validateResponse && !validateResponse(message.result)) {
      this.failProtocol(
        'invalid_message',
        'Codex app-server emitted a Client response that does not match the generated schema',
      )
      return
    }

    clearTimeout(lifecycle.timeout)
    this.clientRequests.set(key, { state: 'completed' })

    if (hasError) {
      const responseError = message.error as CodexProtocolErrorResponse
      lifecycle.reject(
        new Error(
          `${lifecycle.method} returned protocol error ${responseError.code}: ${responseError.message}`,
        ),
      )
      return
    }

    lifecycle.resolve(message.result)
  }

  private handleServerRequest(message: ParsedMessage): void {
    const id = message.id as RequestId
    const method = message.method as string
    const key = identityKey(id)

    if (this.activeServerRequests.has(key)) {
      this.failProtocol(
        'duplicate_server_request',
        'Codex app-server reused an active Server request identity',
      )
      return
    }

    const token = Symbol(key)
    this.activeServerRequests.set(key, token)
    let state: 'active' | 'responding' | 'settled' = 'active'

    const release = (): void => {
      if (this.activeServerRequests.get(key) === token) {
        this.activeServerRequests.delete(key)
      }
    }

    const dismiss = (): boolean => {
      if (state !== 'active') {
        return false
      }

      state = 'settled'
      release()

      return true
    }

    const respondOnce = async (response: object): Promise<void> => {
      if (state !== 'active') {
        throw new CodexStdioProtocolError(
          'duplicate_response',
          'Server request has already been answered',
        )
      }

      state = 'responding'

      try {
        await this.writeMessage(response)
      } finally {
        state = 'settled'
        release()
      }
    }

    const respondError = async (
      error: CodexProtocolErrorResponse,
    ): Promise<void> => {
      if (!isProtocolErrorResponse(error)) {
        throw new CodexStdioProtocolError(
          'invalid_message',
          'Server response error must contain a numeric code and message',
        )
      }

      await respondOnce({ id, error })
    }

    if (!isServerRequestMethod(method)) {
      this.pushObservation({
        kind: 'unknown_server_request',
        request: {
          id,
          method,
          ...(Object.hasOwn(message, 'params')
            ? { params: message.params }
            : {}),
          respondError,
          dismiss,
        },
      })
      return
    }

    const request = {
      id,
      method,
      params: message.params,
      respond: async (result: unknown) => {
        if (!serverRequestContracts[method].validateResponse(result)) {
          throw new CodexStdioProtocolError(
            'invalid_message',
            'Server success response does not match the generated schema',
          )
        }

        await respondOnce({ id, result })
      },
      respondError,
      dismiss,
    } as CodexStdioServerRequest

    this.pushObservation({ kind: 'server_request', request })
  }

  private failProtocol(
    code: CodexStdioProtocolFailureCode,
    message: string,
  ): void {
    const error = new CodexStdioProtocolError(code, message)
    this.failConnection(error, {
      kind: 'protocol_error',
      code,
      message,
    })
  }

  private failTransport(
    error: CodexStdioTransportError,
    observation: Extract<CodexStdioObservation, { kind: 'transport_lost' }>,
  ): void {
    if (this.closing) {
      return
    }

    this.failConnection(error, observation)
  }

  private reportTransportLoss(
    code: Exclude<
      CodexStdioTransportFailureCode,
      | 'close_timeout'
      | 'observation_consumer_conflict'
      | 'transport_closed'
    >,
    message: string,
    details: Pick<
      Extract<CodexStdioObservation, { kind: 'transport_lost' }>,
      'exitCode' | 'signal'
    > = {},
  ): CodexStdioTransportError {
    const error = new CodexStdioTransportError(code, message)
    this.failTransport(error, {
      kind: 'transport_lost',
      code,
      message,
      ...details,
    })

    return error
  }

  private failConnection(
    error: Error,
    observation: CodexStdioObservation,
  ): void {
    if (this.connectionFailure || this.closing) {
      return
    }

    this.connectionFailure = error
    this.rejectPendingClientResponses(error)
    this.activeServerRequests.clear()
    this.pushObservation(observation)
    this.closeObservationStream()
    this.child?.kill('SIGTERM')
  }

  private rejectPendingClientResponses(error: Error): void {
    for (const lifecycle of this.clientRequests.values()) {
      if (lifecycle.state !== 'pending') {
        continue
      }

      clearTimeout(lifecycle.timeout)
      lifecycle.reject(error)
    }

    this.clientRequests.clear()
  }

  private nextObservation(): Promise<CodexStdioObservation | undefined> {
    const observation = this.observationQueue.shift()

    if (observation) {
      return Promise.resolve(observation)
    }

    if (this.observationStreamClosed) {
      return Promise.resolve(undefined)
    }

    return new Promise((resolvePromise) => {
      this.observationResolvers.push(resolvePromise)
    })
  }

  private pushObservation(observation: CodexStdioObservation): void {
    if (this.observationStreamClosed) {
      return
    }

    const resolver = this.observationResolvers.shift()

    if (resolver) {
      resolver(observation)
      return
    }

    if (
      !this.connectionFailure &&
      this.observationQueue.length >= this.options.maxQueuedObservations
    ) {
      this.observationQueue.length = 0
      const error = new CodexStdioTransportError(
        'observation_queue_limit',
        'Codex stdio transport observation queue reached its limit',
      )
      this.failConnection(error, {
        kind: 'transport_lost',
        code: 'observation_queue_limit',
        message: error.message,
      })
      return
    }

    this.observationQueue.push(observation)
  }

  private rejectPendingStart(error: Error): void {
    this.pendingStartReject?.(error)
  }

  private closeObservationStream(): void {
    if (this.observationStreamClosed) {
      return
    }

    this.observationStreamClosed = true

    for (const resolver of this.observationResolvers.splice(0)) {
      resolver(undefined)
    }
  }

  private assertWritable(): void {
    if (this.connectionFailure) {
      throw this.connectionFailure
    }

    if (this.closing) {
      throw new CodexStdioTransportError(
        'transport_closed',
        'Codex stdio transport is closed',
      )
    }
  }
}

function assertRequestId(id: unknown): asserts id is RequestId {
  if (!isRequestId(id)) {
    throw new CodexStdioProtocolError(
      'invalid_message',
      'Client request identity must be a string or finite number',
    )
  }
}

function isRequestId(value: unknown): value is RequestId {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' &&
      Number.isSafeInteger(value) &&
      !Object.is(value, -0))
  )
}

function inspectRawProtocolEnvelope(
  source: string,
): 'unsafe_numeric_id' | 'duplicate_protocol_key' | undefined {
  let depth = 0
  const topLevelKeys = new Set<string>()

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]

    if (character === '"') {
      const stringEnd = findJsonStringEnd(source, index)

      if (stringEnd === -1) {
        return undefined
      }

      if (depth === 1) {
        const key = readJsonString(source.slice(index, stringEnd + 1))
        let valueStart = skipWhitespace(source, stringEnd + 1)

        if (key !== undefined && source[valueStart] === ':') {
          if (topLevelKeys.has(key)) {
            return 'duplicate_protocol_key'
          }

          topLevelKeys.add(key)

          if (key !== 'id') {
            index = stringEnd
            continue
          }

          valueStart = skipWhitespace(source, valueStart + 1)
          const firstValueCharacter = source[valueStart]

          if (
            firstValueCharacter === '-' ||
            (firstValueCharacter !== undefined &&
              firstValueCharacter >= '0' &&
              firstValueCharacter <= '9')
          ) {
            let valueEnd = valueStart + 1

            while (
              valueEnd < source.length &&
              /[0-9eE+.-]/.test(source[valueEnd] ?? '')
            ) {
              valueEnd += 1
            }

            if (
              !isExactSafeJsonIntegerValue(source.slice(valueStart, valueEnd))
            ) {
              return 'unsafe_numeric_id'
            }
          }
        }
      }

      index = stringEnd
      continue
    }

    if (character === '{' || character === '[') {
      depth += 1
    } else if (character === '}' || character === ']') {
      depth -= 1
    }
  }

  return undefined
}

function isExactSafeJsonIntegerValue(source: string): boolean {
  const match =
    /^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?(?:[eE]([+-]?)([0-9]+))?$/.exec(
      source,
    )

  if (!match) {
    return false
  }

  const [, sign, integerPart, fractionPart = '', exponentSign, exponentDigits] =
    match
  const coefficientDigits = `${integerPart}${fractionPart}`.replace(
    /^0+/,
    '',
  )

  if (coefficientDigits.length === 0) {
    return sign !== '-'
  }

  const normalizedExponentDigits = exponentDigits?.replace(/^0+/, '') ?? ''

  if (normalizedExponentDigits.length > 6) {
    return false
  }

  const exponentMagnitude = normalizedExponentDigits
    ? Number(normalizedExponentDigits)
    : 0
  const exponent = exponentSign === '-' ? -exponentMagnitude : exponentMagnitude
  const scale = exponent - fractionPart.length
  let integerDigits: string

  if (scale >= 0) {
    if (coefficientDigits.length + scale > 16) {
      return false
    }

    integerDigits = `${coefficientDigits}${'0'.repeat(scale)}`
  } else {
    const discardedDigits = -scale

    if (
      discardedDigits >= coefficientDigits.length ||
      !coefficientDigits.endsWith('0'.repeat(discardedDigits))
    ) {
      return false
    }

    integerDigits = coefficientDigits.slice(0, -discardedDigits)
  }

  const value = BigInt(`${sign}${integerDigits}`)

  return (
    value >= BigInt(Number.MIN_SAFE_INTEGER) &&
    value <= BigInt(Number.MAX_SAFE_INTEGER)
  )
}

function findJsonStringEnd(source: string, start: number): number {
  let escaped = false

  for (let index = start + 1; index < source.length; index += 1) {
    const character = source[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (character === '\\') {
      escaped = true
      continue
    }

    if (character === '"') {
      return index
    }
  }

  return -1
}

function readJsonString(source: string): string | undefined {
  try {
    const value = JSON.parse(source)

    return typeof value === 'string' ? value : undefined
  } catch {
    return undefined
  }
}

function skipWhitespace(source: string, start: number): number {
  let index = start

  while (index < source.length && /\s/.test(source[index] ?? '')) {
    index += 1
  }

  return index
}

function isServerRequestMethod(method: string): method is ServerRequestMethod {
  return Object.hasOwn(serverRequestContracts, method)
}

function identityKey(id: RequestId): string {
  return typeof id === 'number' ? `number:${id}` : `string:${id}`
}

function isProtocolErrorResponse(
  value: unknown,
): value is CodexProtocolErrorResponse {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    Number.isFinite(value.code) &&
    typeof value.message === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error('Codex stdio write failed')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolvePromise) => {
    setTimeout(resolvePromise, ms)
  })
}
