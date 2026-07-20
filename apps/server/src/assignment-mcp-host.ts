import { randomBytes, timingSafeEqual } from 'node:crypto'

import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import { isLoopbackAddress } from './codex-chat-config.js'
import type { StatePatch } from './semester-workspace.js'

const mcpJsonEnvelopeLimit = 2 * 1024 * 1024
const defaultBindingWaitMs = 2_000
const minimumBindingWaitMs = 1
const maximumBindingWaitMs = 10_000
const tokenHeader = 'x-ay-ple-mcp-token'
const protocolVersion = '2025-06-18'
const supportedProtocolVersions = new Set([
  '2025-03-26',
  protocolVersion,
])
const safeForbiddenMessage = 'The MCP request is not allowed.'
const safeInvalidRequestMessage = 'The MCP request is invalid.'
const safeMethodUnavailableMessage = 'The MCP method is not available.'
const safeProposalUnavailableMessage = 'The proposal call is not available.'
const safeProposalFailedMessage = 'The StatePatch proposal was not committed.'

const proposalInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'requestKey',
    'workspaceId',
    'courseId',
    'baseRevision',
    'summary',
    'changes',
    'evidence',
  ],
  properties: {
    requestKey: {
      type: 'string',
      pattern: '^proposal_[0-9a-f]{32}$',
    },
    workspaceId: {
      type: 'string',
      pattern: '^workspace_[0-9a-f]{32}$',
    },
    courseId: {
      type: 'string',
      pattern: '^course_[0-9a-f]{32}$',
    },
    baseRevision: {
      type: 'integer',
      minimum: 0,
    },
    summary: {
      type: 'string',
      minLength: 1,
      maxLength: 2048,
    },
    changes: {
      type: 'object',
      additionalProperties: false,
      required: ['operation', 'values'],
      properties: {
        operation: { const: 'assignment.upsert' },
        assignmentId: {
          type: 'string',
          pattern: '^assignment_[0-9a-f]{32}$',
        },
        values: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'dueAt', 'submissionMethod'],
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 1024 },
            dueAt: { type: 'string', minLength: 1, maxLength: 1024 },
            submissionMethod: {
              type: 'string',
              minLength: 1,
              maxLength: 1024,
            },
          },
        },
      },
    },
    evidence: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['field', 'rawMaterialId', 'digest', 'quote'],
        properties: {
          field: {
            enum: ['title', 'dueAt', 'submissionMethod'],
          },
          rawMaterialId: {
            type: 'string',
            pattern: '^material_[0-9a-f]{32}$',
          },
          digest: {
            type: 'string',
            pattern: '^[0-9a-f]{64}$',
          },
          quote: { type: 'string', minLength: 1, maxLength: 16384 },
        },
      },
    },
    origin: {
      type: 'string',
      minLength: 1,
      maxLength: 2048,
    },
  },
} as const

export type AssignmentMcpNativeThreadConfig = {
  readonly url: string
  readonly token: string
}

export type AssignmentMcpNativeBinding = {
  readonly threadId: string
  readonly turnId: string
}

export type RegisterAssignmentMcpProposalInput = {
  readonly requestKey: string
  invoke(payload: unknown): Promise<StatePatch>
}

export type AssignmentMcpProposalSession = {
  readonly requestKey: string
  bindNative(binding: AssignmentMcpNativeBinding): void
  cancel(): void
  latestPatch(): StatePatch | null
}

export type AssignmentMcpHost = {
  readonly router: Router
  readonly token: string
  nativeThreadConfig(url: string): AssignmentMcpNativeThreadConfig
  register(input: RegisterAssignmentMcpProposalInput): AssignmentMcpProposalSession
  close(): void
}

export type AssignmentMcpHostErrorCode =
  | 'binding_conflict'
  | 'binding_invalid'
  | 'host_closed'
  | 'native_url_invalid'
  | 'request_key_invalid'
  | 'session_conflict'
  | 'session_inactive'

export class AssignmentMcpHostError extends Error {
  readonly code: AssignmentMcpHostErrorCode

  constructor(code: AssignmentMcpHostErrorCode, message: string) {
    super(message)
    this.name = 'AssignmentMcpHostError'
    this.code = code
  }
}

type CallState = 'idle' | 'waiting' | 'invoking' | 'settled'

type WaitingCall = {
  readonly resolve: () => void
  readonly reject: (error: ProposalCallError) => void
  readonly timer: NodeJS.Timeout
}

type ActiveProposalSession = {
  readonly requestKey: string
  readonly invoke: (payload: unknown) => Promise<StatePatch>
  active: boolean
  binding?: AssignmentMcpNativeBinding
  callState: CallState
  waitingCall?: WaitingCall
  latestPatch?: StatePatch
}

type JsonRpcId = number | string

type JsonRpcRequest = {
  readonly jsonrpc: '2.0'
  readonly id?: JsonRpcId
  readonly method: string
  readonly params?: Record<string, unknown>
}

type ToolCallOutcome =
  | { readonly state: 'committed'; readonly patch: StatePatch }
  | { readonly state: 'failed' }

class ProposalCallError extends Error {
  constructor() {
    super(safeProposalUnavailableMessage)
    this.name = 'ProposalCallError'
  }
}

export function createAssignmentMcpHost(options: {
  readonly bindingWaitMs?: number
} = {}): AssignmentMcpHost {
  const bindingWaitMs = options.bindingWaitMs ?? defaultBindingWaitMs
  if (
    !Number.isSafeInteger(bindingWaitMs) ||
    bindingWaitMs < minimumBindingWaitMs ||
    bindingWaitMs > maximumBindingWaitMs
  ) {
    throw new AssignmentMcpHostError(
      'binding_invalid',
      'The MCP binding wait bound is invalid.',
    )
  }

  const router = express.Router()
  const token = randomBytes(32).toString('base64url')
  const sessions = new Map<string, ActiveProposalSession>()
  let closed = false

  router.use((request, response, next) => {
    response.setHeader('cache-control', 'no-store')
    if (
      !isLoopbackAddress(request.socket.remoteAddress) ||
      !hasExactToken(request, token)
    ) {
      response.status(403).json({
        code: 'forbidden',
        displayMessage: safeForbiddenMessage,
      })
      return
    }
    next()
  })

  router.use(
    express.json({
      limit: mcpJsonEnvelopeLimit,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/', async (request, response) => {
    const message = parseJsonRpcRequest(request.body)
    if (!message) {
      sendJsonRpcError(response, null, -32600, safeInvalidRequestMessage, 400)
      return
    }

    if (message.id === undefined) {
      response.status(202).end()
      return
    }

    if (message.method === 'initialize') {
      if (!isInitializeParams(message.params)) {
        sendJsonRpcError(
          response,
          message.id,
          -32602,
          safeInvalidRequestMessage,
        )
        return
      }
      response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          protocolVersion: supportedProtocolVersions.has(
            message.params.protocolVersion,
          )
            ? message.params.protocolVersion
            : protocolVersion,
          capabilities: {
            tools: { listChanged: false },
          },
          serverInfo: {
            name: 'ay-ple-assignment-state-patch',
            version: '1.0.0',
          },
        },
      })
      return
    }

    if (message.method === 'tools/list') {
      if (!isEmptyParams(message.params)) {
        sendJsonRpcError(
          response,
          message.id,
          -32602,
          safeInvalidRequestMessage,
        )
        return
      }
      response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          tools: [
            {
              name: 'propose_state_patch',
              description:
                'Persist one evidence-backed Assignment StatePatch for app review.',
              inputSchema: proposalInputSchema,
            },
          ],
        },
      })
      return
    }

    if (message.method === 'tools/call') {
      const call = parseToolCall(message.params)
      if (!call) {
        sendJsonRpcError(
          response,
          message.id,
          -32602,
          safeInvalidRequestMessage,
        )
        return
      }
      if (call.name !== 'propose_state_patch') {
        sendJsonRpcError(
          response,
          message.id,
          -32601,
          safeMethodUnavailableMessage,
        )
        return
      }
      const requestKey = readRequestKey(call.arguments)
      const session = requestKey ? sessions.get(requestKey) : undefined
      if (!session) {
        sendJsonRpcError(
          response,
          message.id,
          -32602,
          safeProposalUnavailableMessage,
        )
        return
      }

      const outcome = await invokeProposalSession(
        session,
        call.arguments,
        bindingWaitMs,
      )
      if (outcome.state === 'failed') {
        response.json({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [{ type: 'text', text: safeProposalFailedMessage }],
            isError: true,
          },
        })
        return
      }
      response.json({
        jsonrpc: '2.0',
        id: message.id,
        result: {
          content: [
            {
              type: 'text',
              text: 'The StatePatch was committed for app review.',
            },
          ],
          structuredContent: {
            patchId: outcome.patch.id,
            status: outcome.patch.status,
          },
          isError: false,
        },
      })
      return
    }

    sendJsonRpcError(
      response,
      message.id,
      -32601,
      safeMethodUnavailableMessage,
    )
  })

  router.all('/', (_request, response) => {
    response.setHeader('allow', 'POST')
    response.status(405).json({
      code: 'method_not_allowed',
      displayMessage: safeMethodUnavailableMessage,
    })
  })

  router.use(
    (
      _error: unknown,
      _request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      if (!response.headersSent) {
        sendJsonRpcError(
          response,
          null,
          -32700,
          safeInvalidRequestMessage,
          400,
        )
      }
    },
  )

  return {
    router,
    token,
    nativeThreadConfig(url) {
      assertLoopbackMcpUrl(url)
      return { url, token }
    },
    register(input) {
      if (closed) {
        throw new AssignmentMcpHostError(
          'host_closed',
          'The MCP host is closed.',
        )
      }
      if (!isProposalKey(input.requestKey)) {
        throw new AssignmentMcpHostError(
          'request_key_invalid',
          'The proposal request key is invalid.',
        )
      }
      if (sessions.has(input.requestKey)) {
        throw new AssignmentMcpHostError(
          'session_conflict',
          'The proposal request key is already registered.',
        )
      }
      const activeSession: ActiveProposalSession = {
        requestKey: input.requestKey,
        invoke: input.invoke,
        active: true,
        callState: 'idle',
      }
      sessions.set(input.requestKey, activeSession)

      return {
        requestKey: input.requestKey,
        bindNative(binding) {
          bindProposalSession(activeSession, binding)
        },
        cancel() {
          cancelProposalSession(activeSession)
          sessions.delete(input.requestKey)
        },
        latestPatch() {
          return activeSession.latestPatch
            ? structuredClone(activeSession.latestPatch)
            : null
        },
      }
    },
    close() {
      if (closed) return
      closed = true
      for (const session of sessions.values()) cancelProposalSession(session)
      sessions.clear()
    },
  }
}

function bindProposalSession(
  session: ActiveProposalSession,
  binding: AssignmentMcpNativeBinding,
): void {
  if (!session.active) {
    throw new AssignmentMcpHostError(
      'session_inactive',
      'The proposal session is inactive.',
    )
  }
  if (!isNativeIdentity(binding.threadId) || !isNativeIdentity(binding.turnId)) {
    throw new AssignmentMcpHostError(
      'binding_invalid',
      'The native proposal binding is invalid.',
    )
  }
  if (session.binding) {
    if (
      session.binding.threadId === binding.threadId &&
      session.binding.turnId === binding.turnId
    ) {
      return
    }
    throw new AssignmentMcpHostError(
      'binding_conflict',
      'The proposal session already has another native binding.',
    )
  }
  session.binding = { ...binding }
  if (session.waitingCall) {
    const waiting = session.waitingCall
    session.waitingCall = undefined
    clearTimeout(waiting.timer)
    waiting.resolve()
  }
}

function cancelProposalSession(session: ActiveProposalSession): void {
  if (!session.active) return
  session.active = false
  if (session.waitingCall) {
    const waiting = session.waitingCall
    session.waitingCall = undefined
    clearTimeout(waiting.timer)
    session.callState = 'settled'
    waiting.reject(new ProposalCallError())
  }
}

async function invokeProposalSession(
  session: ActiveProposalSession,
  payload: Record<string, unknown>,
  bindingWaitMs: number,
): Promise<ToolCallOutcome> {
  if (
    !session.active ||
    session.callState === 'waiting' ||
    session.callState === 'invoking'
  ) {
    return { state: 'failed' }
  }

  if (!session.binding) {
    session.callState = 'waiting'
    try {
      await waitForBinding(session, bindingWaitMs)
    } catch {
      return { state: 'failed' }
    }
  }
  if (!session.active || !session.binding) {
    session.callState = 'settled'
    return { state: 'failed' }
  }

  session.callState = 'invoking'
  try {
    const patch = await session.invoke(payload)
    session.latestPatch = structuredClone(patch)
    session.callState = 'settled'
    return { state: 'committed', patch: structuredClone(patch) }
  } catch {
    session.callState = 'settled'
    return { state: 'failed' }
  }
}

function waitForBinding(
  session: ActiveProposalSession,
  bindingWaitMs: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      if (session.waitingCall?.timer !== timer) return
      session.waitingCall = undefined
      session.callState = 'settled'
      reject(new ProposalCallError())
    }, bindingWaitMs)
    session.waitingCall = { resolve, reject, timer }
  })
}

function parseJsonRpcRequest(value: unknown): JsonRpcRequest | null {
  if (!isRecord(value)) return null
  const expected = value.id === undefined
    ? ['jsonrpc', 'method']
    : ['id', 'jsonrpc', 'method']
  const optional = ['params']
  if (
    !hasExactKeys(value, expected, optional) ||
    value.jsonrpc !== '2.0' ||
    !isBoundedString(value.method, 128) ||
    (value.id !== undefined && !isJsonRpcId(value.id)) ||
    (value.params !== undefined && !isRecord(value.params))
  ) {
    return null
  }
  return value as JsonRpcRequest
}

function isInitializeParams(
  value: Record<string, unknown> | undefined,
): value is Record<string, unknown> & { readonly protocolVersion: string } {
  return (
    value !== undefined &&
    isBoundedString(value.protocolVersion, 32) &&
    isRecord(value.capabilities) &&
    isRecord(value.clientInfo) &&
    isBoundedString(value.clientInfo.name, 256) &&
    isBoundedString(value.clientInfo.version, 128)
  )
}

function isEmptyParams(value: Record<string, unknown> | undefined): boolean {
  return value === undefined || Object.keys(value).length === 0
}

function parseToolCall(value: Record<string, unknown> | undefined): {
  readonly name: string
  readonly arguments: Record<string, unknown>
} | null {
  if (
    value === undefined ||
    !hasExactKeys(value, ['arguments', 'name'], ['_meta']) ||
    !isBoundedString(value.name, 128) ||
    !isRecord(value.arguments) ||
    (value._meta !== undefined && !isRecord(value._meta))
  ) {
    return null
  }
  return { name: value.name, arguments: value.arguments }
}

function readRequestKey(payload: Record<string, unknown>): string | null {
  return isProposalKey(payload.requestKey) ? payload.requestKey : null
}

function hasExactToken(request: Request, expected: string): boolean {
  const received = request.headers[tokenHeader]
  if (typeof received !== 'string') return false
  const receivedBytes = Buffer.from(received, 'utf8')
  const expectedBytes = Buffer.from(expected, 'utf8')
  return (
    receivedBytes.length === expectedBytes.length &&
    timingSafeEqual(receivedBytes, expectedBytes)
  )
}

function assertLoopbackMcpUrl(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new AssignmentMcpHostError(
      'native_url_invalid',
      'The native MCP URL is invalid.',
    )
  }
  const hostname = parsed.hostname.toLowerCase()
  const unwrappedHostname =
    hostname.startsWith('[') && hostname.endsWith(']')
      ? hostname.slice(1, -1)
      : hostname
  if (
    parsed.protocol !== 'http:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.hash !== '' ||
    !isLoopbackAddress(unwrappedHostname)
  ) {
    throw new AssignmentMcpHostError(
      'native_url_invalid',
      'The native MCP URL must be a loopback HTTP endpoint.',
    )
  }
}

function isJsonRpcId(value: unknown): value is JsonRpcId {
  return (
    (typeof value === 'number' && Number.isSafeInteger(value)) ||
    isBoundedString(value, 256)
  )
}

function isNativeIdentity(value: unknown): value is string {
  return (
    isBoundedString(value, 256) &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)
  )
}

function isProposalKey(value: unknown): value is string {
  return typeof value === 'string' && /^proposal_[0-9a-f]{32}$/.test(value)
}

function isBoundedString(value: unknown, maxLength: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const actual = Object.keys(value).sort()
  const allowed = [...required, ...optional]
  if (actual.some((key) => !allowed.includes(key))) return false
  return required.every((key) => actual.includes(key))
}

function sendJsonRpcError(
  response: Response,
  id: JsonRpcId | null,
  code: number,
  message: string,
  status = 200,
): void {
  response.status(status).json({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  })
}
