import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import readline from 'node:readline'
import type {
  ClientNotification,
  ClientRequest,
  RequestId,
  ServerRequest,
} from './internal/codex-app-server-protocol/generated/index.js'
import type { ApplyPatchApprovalResponse } from './internal/codex-app-server-protocol/generated/ApplyPatchApprovalResponse.js'
import type { ExecCommandApprovalResponse } from './internal/codex-app-server-protocol/generated/ExecCommandApprovalResponse.js'
import type { AttestationGenerateResponse } from './internal/codex-app-server-protocol/generated/v2/AttestationGenerateResponse.js'
import type { ChatgptAuthTokensRefreshResponse } from './internal/codex-app-server-protocol/generated/v2/ChatgptAuthTokensRefreshResponse.js'
import type { CommandExecutionRequestApprovalResponse } from './internal/codex-app-server-protocol/generated/v2/CommandExecutionRequestApprovalResponse.js'
import type { DynamicToolCallResponse } from './internal/codex-app-server-protocol/generated/v2/DynamicToolCallResponse.js'
import type { FileChangeRequestApprovalResponse } from './internal/codex-app-server-protocol/generated/v2/FileChangeRequestApprovalResponse.js'
import type { McpServerElicitationRequestResponse } from './internal/codex-app-server-protocol/generated/v2/McpServerElicitationRequestResponse.js'
import type { PermissionsRequestApprovalResponse } from './internal/codex-app-server-protocol/generated/v2/PermissionsRequestApprovalResponse.js'
import type { ToolRequestUserInputResponse } from './internal/codex-app-server-protocol/generated/v2/ToolRequestUserInputResponse.js'

export type CodexStdioTransportOptions = {
  command: string
  args?: string[]
  cwd: string
  env: NodeJS.ProcessEnv
  requestTimeoutMs?: number
  closeTimeoutMs?: number
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

type ServerRequestFor<Method extends ServerRequestMethod> = Extract<
  ServerRequest,
  { method: Method }
>

type ServerRequestParams<Method extends ServerRequestMethod> =
  ServerRequestFor<Method>['params']

type ServerRequestDefinition<Method extends ServerRequestMethod, Response> = {
  responseType: Response
  isParams: (value: unknown) => value is ServerRequestParams<Method>
}

const serverRequestDefinitions = {
  'item/commandExecution/requestApproval': {
    responseType: null as unknown as CommandExecutionRequestApprovalResponse,
    isParams: isCommandExecutionApprovalParams,
  },
  'item/fileChange/requestApproval': {
    responseType: null as unknown as FileChangeRequestApprovalResponse,
    isParams: isFileChangeApprovalParams,
  },
  'item/tool/requestUserInput': {
    responseType: null as unknown as ToolRequestUserInputResponse,
    isParams: isToolRequestUserInputParams,
  },
  'mcpServer/elicitation/request': {
    responseType: null as unknown as McpServerElicitationRequestResponse,
    isParams: isMcpServerElicitationParams,
  },
  'item/permissions/requestApproval': {
    responseType: null as unknown as PermissionsRequestApprovalResponse,
    isParams: isPermissionsApprovalParams,
  },
  'item/tool/call': {
    responseType: null as unknown as DynamicToolCallResponse,
    isParams: isDynamicToolCallParams,
  },
  'account/chatgptAuthTokens/refresh': {
    responseType: null as unknown as ChatgptAuthTokensRefreshResponse,
    isParams: isChatgptAuthTokensRefreshParams,
  },
  'attestation/generate': {
    responseType: null as unknown as AttestationGenerateResponse,
    isParams: isAttestationGenerateParams,
  },
  applyPatchApproval: {
    responseType: null as unknown as ApplyPatchApprovalResponse,
    isParams: isApplyPatchApprovalParams,
  },
  execCommandApproval: {
    responseType: null as unknown as ExecCommandApprovalResponse,
    isParams: isExecCommandApprovalParams,
  },
} satisfies {
  [Method in ServerRequestMethod]: ServerRequestDefinition<Method, unknown>
}

type ServerRequestResponseByMethod = {
  [Method in ServerRequestMethod]:
    (typeof serverRequestDefinitions)[Method]['responseType']
}

export type CodexStdioServerRequestFor<Method extends ServerRequestMethod> = {
  id: RequestId
  method: Method
  params: ServerRequestParams<Method>
  respond: (
    result: ServerRequestResponseByMethod[Method],
  ) => Promise<void>
  respondError: (error: CodexProtocolErrorResponse) => Promise<void>
}

export type CodexStdioServerRequest = {
  [Method in ServerRequestMethod]: CodexStdioServerRequestFor<Method>
}[ServerRequestMethod]

export type CodexStdioUnknownServerRequest = {
  id: RequestId
  method: string
  params?: unknown
  respondError: (error: CodexProtocolErrorResponse) => Promise<void>
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
      code: Exclude<CodexStdioTransportFailureCode, 'transport_closed'>
      message: string
      exitCode?: number | null
      signal?: NodeJS.Signals | null
    }

type PendingClientResponse = {
  method: string
  timeout: NodeJS.Timeout
  resolve: (result: unknown) => void
  reject: (error: Error) => void
}

type ObservationResolver = (
  observation: CodexStdioObservation | undefined,
) => void

type ParsedMessage = Record<string, unknown>

const defaultRequestTimeoutMs = 15000
const defaultCloseTimeoutMs = 1000

export class CodexStdioTransport {
  private readonly options: Required<
    Pick<CodexStdioTransportOptions, 'args' | 'requestTimeoutMs' | 'closeTimeoutMs'>
  > &
    Omit<
      CodexStdioTransportOptions,
      'args' | 'requestTimeoutMs' | 'closeTimeoutMs'
    >
  private readonly pendingClientResponses = new Map<
    string,
    PendingClientResponse
  >()
  private readonly completedClientResponseIds = new Set<string>()
  private readonly serverRequestIds = new Set<string>()
  private readonly observationQueue: CodexStdioObservation[] = []
  private readonly observationResolvers: ObservationResolver[] = []
  private child: ChildProcessWithoutNullStreams | undefined
  private stdoutReader: readline.Interface | undefined
  private observationStreamClosed = false
  private connectionFailure: Error | undefined
  private closing = false

  constructor(options: CodexStdioTransportOptions) {
    this.options = {
      ...options,
      args: options.args ?? [],
      requestTimeoutMs: options.requestTimeoutMs ?? defaultRequestTimeoutMs,
      closeTimeoutMs: options.closeTimeoutMs ?? defaultCloseTimeoutMs,
    }
  }

  async sendRequest(request: ClientRequest): Promise<unknown> {
    assertRequestId(request.id)
    this.start()
    this.assertWritable()

    const requestKey = identityKey(request.id)

    if (
      this.pendingClientResponses.has(requestKey) ||
      this.completedClientResponseIds.has(requestKey)
    ) {
      throw new CodexStdioProtocolError(
        'duplicate_response',
        'Client request identity has already been used on this connection',
      )
    }

    const response = new Promise<unknown>((resolvePromise, reject) => {
      const timeout = setTimeout(() => {
        this.pendingClientResponses.delete(requestKey)
        this.completedClientResponseIds.add(requestKey)
        reject(
          new CodexStdioRequestError(
            `${request.method} timed out waiting for a response`,
          ),
        )
      }, this.options.requestTimeoutMs)

      this.pendingClientResponses.set(requestKey, {
        method: request.method,
        timeout,
        resolve: resolvePromise,
        reject,
      })
    })

    try {
      await this.writeMessage(request)
    } catch (error) {
      const pending = this.pendingClientResponses.get(requestKey)

      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingClientResponses.delete(requestKey)
        pending.reject(toError(error))
      }
    }

    return response
  }

  async sendNotification(notification: ClientNotification): Promise<void> {
    this.start()
    this.assertWritable()
    await this.writeMessage(notification)
  }

  async *observations(): AsyncIterable<CodexStdioObservation> {
    while (true) {
      const observation = await this.nextObservation()

      if (!observation) {
        return
      }

      yield observation
    }
  }

  async close(): Promise<void> {
    if (this.closing) {
      return
    }

    this.closing = true
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

    child.kill('SIGKILL')
    await Promise.race([exited, delay(this.options.closeTimeoutMs)])
  }

  private start(): void {
    if (this.child) {
      return
    }

    if (this.closing || this.connectionFailure) {
      this.assertWritable()
    }

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

    child.once('error', () => {
      this.reportTransportLoss(
        'spawn_error',
        'Codex app-server process emitted an error',
      )
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
          !isServerRequestParams(
            value.method as ServerRequestMethod,
            value.params,
          ))
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
    const pending = this.pendingClientResponses.get(key)

    if (!pending) {
      const duplicate = this.completedClientResponseIds.has(key)
      this.failProtocol(
        duplicate ? 'duplicate_response' : 'unknown_response',
        duplicate
          ? 'Codex app-server emitted a duplicate Client response'
          : 'Codex app-server emitted a response for an unknown Client request',
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

    clearTimeout(pending.timeout)
    this.pendingClientResponses.delete(key)
    this.completedClientResponseIds.add(key)

    if (hasError) {
      const responseError = message.error as CodexProtocolErrorResponse
      pending.reject(
        new Error(
          `${pending.method} returned protocol error ${responseError.code}: ${responseError.message}`,
        ),
      )
      return
    }

    pending.resolve(message.result)
  }

  private handleServerRequest(message: ParsedMessage): void {
    const id = message.id as RequestId
    const method = message.method as string
    const key = identityKey(id)

    if (this.serverRequestIds.has(key)) {
      this.failProtocol(
        'duplicate_server_request',
        'Codex app-server reused an active Server request identity',
      )
      return
    }

    this.serverRequestIds.add(key)
    let responded = false

    const respondOnce = async (response: object): Promise<void> => {
      if (responded) {
        throw new CodexStdioProtocolError(
          'duplicate_response',
          'Server request has already been answered',
        )
      }

      responded = true
      await this.writeMessage(response)
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
        },
      })
      return
    }

    const request = {
      id,
      method,
      params: message.params,
      respond: async (result: unknown) => respondOnce({ id, result }),
      respondError,
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
    code: Exclude<CodexStdioTransportFailureCode, 'transport_closed'>,
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
    this.pushObservation(observation)
    this.closeObservationStream()
    this.child?.kill('SIGTERM')
  }

  private rejectPendingClientResponses(error: Error): void {
    for (const [key, pending] of this.pendingClientResponses) {
      clearTimeout(pending.timeout)
      pending.reject(error)
      this.pendingClientResponses.delete(key)
    }
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
    const resolver = this.observationResolvers.shift()

    if (resolver) {
      resolver(observation)
      return
    }

    this.observationQueue.push(observation)
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
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function isServerRequestMethod(method: string): method is ServerRequestMethod {
  return Object.hasOwn(serverRequestDefinitions, method)
}

function isServerRequestParams<Method extends ServerRequestMethod>(
  method: Method,
  value: unknown,
): value is ServerRequestParams<Method> {
  return serverRequestDefinitions[method].isParams(value)
}

function isCommandExecutionApprovalParams(
  value: unknown,
): value is ServerRequestParams<'item/commandExecution/requestApproval'> {
  return (
    hasStringFields(value, ['threadId', 'turnId', 'itemId']) &&
    isFiniteNumber(value.startedAtMs) &&
    isNullableString(value.environmentId) &&
    isOptionalNullableString(value, 'approvalId') &&
    isOptionalNullableString(value, 'reason') &&
    isOptionalNullableString(value, 'command') &&
    isOptionalNullableString(value, 'cwd') &&
    isOptionalNullableArray(value, 'commandActions') &&
    isOptionalNullableArray(value, 'proposedNetworkPolicyAmendments') &&
    isOptionalNullableRecord(value, 'networkApprovalContext') &&
    isOptionalNullableRecord(value, 'proposedExecpolicyAmendment')
  )
}

function isFileChangeApprovalParams(
  value: unknown,
): value is ServerRequestParams<'item/fileChange/requestApproval'> {
  return (
    hasStringFields(value, ['threadId', 'turnId', 'itemId']) &&
    isFiniteNumber(value.startedAtMs) &&
    isOptionalNullableString(value, 'reason') &&
    isOptionalNullableString(value, 'grantRoot')
  )
}

function isToolRequestUserInputParams(
  value: unknown,
): value is ServerRequestParams<'item/tool/requestUserInput'> {
  return (
    hasStringFields(value, ['threadId', 'turnId', 'itemId']) &&
    Array.isArray(value.questions) &&
    value.questions.every(isUserInputQuestion) &&
    (value.autoResolutionMs === null || isFiniteNumber(value.autoResolutionMs))
  )
}

function isMcpServerElicitationParams(
  value: unknown,
): value is ServerRequestParams<'mcpServer/elicitation/request'> {
  if (
    !hasStringFields(value, ['threadId', 'serverName', 'message']) ||
    !isNullableString(value.turnId) ||
    !isJsonValue(value._meta)
  ) {
    return false
  }

  if (value.mode === 'url') {
    return hasStringFields(value, ['url', 'elicitationId'])
  }

  if (value.mode === 'form') {
    return isRecord(value.requestedSchema)
  }

  return value.mode === 'openai/form' && isJsonValue(value.requestedSchema)
}

function isPermissionsApprovalParams(
  value: unknown,
): value is ServerRequestParams<'item/permissions/requestApproval'> {
  return (
    hasStringFields(value, ['threadId', 'turnId', 'itemId', 'cwd']) &&
    isNullableString(value.environmentId) &&
    isFiniteNumber(value.startedAtMs) &&
    isNullableString(value.reason) &&
    isRecord(value.permissions) &&
    isNullableRecord(value.permissions.network) &&
    isNullableRecord(value.permissions.fileSystem)
  )
}

function isDynamicToolCallParams(
  value: unknown,
): value is ServerRequestParams<'item/tool/call'> {
  return (
    hasStringFields(value, ['threadId', 'turnId', 'callId', 'tool']) &&
    isNullableString(value.namespace) &&
    isJsonValue(value.arguments)
  )
}

function isChatgptAuthTokensRefreshParams(
  value: unknown,
): value is ServerRequestParams<'account/chatgptAuthTokens/refresh'> {
  return (
    isRecord(value) &&
    value.reason === 'unauthorized' &&
    isOptionalNullableString(value, 'previousAccountId')
  )
}

function isAttestationGenerateParams(
  value: unknown,
): value is ServerRequestParams<'attestation/generate'> {
  return isRecord(value) && Object.keys(value).length === 0
}

function isApplyPatchApprovalParams(
  value: unknown,
): value is ServerRequestParams<'applyPatchApproval'> {
  return (
    hasStringFields(value, ['conversationId', 'callId']) &&
    isRecord(value.fileChanges) &&
    isNullableString(value.reason) &&
    isNullableString(value.grantRoot)
  )
}

function isExecCommandApprovalParams(
  value: unknown,
): value is ServerRequestParams<'execCommandApproval'> {
  return (
    hasStringFields(value, ['conversationId', 'callId', 'cwd']) &&
    isNullableString(value.approvalId) &&
    isNullableString(value.reason) &&
    isStringArray(value.command) &&
    Array.isArray(value.parsedCmd)
  )
}

function isUserInputQuestion(value: unknown): boolean {
  return (
    hasStringFields(value, ['id', 'header', 'question']) &&
    typeof value.isOther === 'boolean' &&
    typeof value.isSecret === 'boolean' &&
    (value.options === null || Array.isArray(value.options))
  )
}

function hasStringFields(
  value: unknown,
  fields: string[],
): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    fields.every((field) => typeof value[field] === 'string')
  )
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNullableRecord(
  value: unknown,
): value is Record<string, unknown> | null {
  return value === null || isRecord(value)
}

function isOptionalNullableString(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return !Object.hasOwn(value, field) || isNullableString(value[field])
}

function isOptionalNullableArray(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return (
    !Object.hasOwn(value, field) ||
    value[field] === null ||
    Array.isArray(value[field])
  )
}

function isOptionalNullableRecord(
  value: Record<string, unknown>,
  field: string,
): boolean {
  return !Object.hasOwn(value, field) || isNullableRecord(value[field])
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

function isJsonValue(value: unknown): boolean {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    isFiniteNumber(value)
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  return isRecord(value) && Object.values(value).every(isJsonValue)
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
