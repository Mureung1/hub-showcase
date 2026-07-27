#!/usr/bin/env node

import {
  INTERACTION_BROKER_BODY_MAX_BYTES,
  INTERACTION_BROKER_PROTOCOL_VERSION,
  INTERACTION_MCP_SERVER_NAME,
  PROPOSE_STATE_PATCH_CAPABILITY,
  decodeProposeStatePatchRequest,
  parseInteractionBrokerResponse,
  type InteractionBrokerRequest,
  type InteractionBrokerResponse,
  type ProposeStatePatchRequest,
} from './index.js'

const brokerUrlEnvironment = 'AY_PLE_INTERACTION_BROKER_URL'
const brokerTokenEnvironment = 'AY_PLE_INTERACTION_BROKER_TOKEN'
const runtimeBindingEnvironment = 'AY_PLE_INTERACTION_RUNTIME_BINDING'
const brokerRoute = '/api/_private/interaction-mcp'
const mcpInputMaximumBytes = 2 * 1024 * 1024
const safeUnavailableMessage = 'The interaction Broker is unavailable.'
const safeInvalidMessage = 'The interaction request is invalid.'
const safeInterruptedMessage = 'The interaction was interrupted.'
const supportedProtocolVersions = new Set([
  '2024-11-05',
  '2025-03-26',
  '2025-06-18',
])

const proposeStatePatchInputSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'question', 'changes'],
  properties: {
    summary: { type: 'string', minLength: 1 },
    question: { type: 'string', minLength: 1 },
    changes: {
      type: 'array',
      minItems: 1,
      maxItems: 32,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'description'],
        properties: {
          label: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          before: { type: 'string' },
          after: { type: 'string' },
          evidence: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['relativePath', 'contentDigest', 'locator'],
              properties: {
                relativePath: { type: 'string', minLength: 1 },
                contentDigest: {
                  type: 'string',
                  pattern: '^[0-9a-f]{64}$',
                },
                locator: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['type', 'quote', 'occurrence'],
                  properties: {
                    type: { const: 'text_quote' },
                    quote: { type: 'string', minLength: 1 },
                    occurrence: {
                      type: 'integer',
                      minimum: 1,
                      maximum: 1024,
                    },
                  },
                },
              },
            },
          },
        },
        anyOf: [{ required: ['before'] }, { required: ['after'] }],
      },
    },
  },
} as const

type JsonRpcId = number | string | null
type JsonRpcMessage = {
  readonly jsonrpc?: unknown
  readonly id?: unknown
  readonly method?: unknown
  readonly params?: unknown
}

type BrokerConfiguration = {
  readonly url: string
  readonly token: string
  readonly runtimeBinding: string
}

class BrokerUnavailableError extends Error {
  constructor() {
    super(safeUnavailableMessage)
    this.name = 'BrokerUnavailableError'
  }
}

const activeCalls = new Map<string, AbortController>()
let initialized = false
let startupPromise: Promise<void> | undefined
let inputBuffer = ''
let discardingOversizedLine = false

process.stdin.setEncoding('utf8')
process.stdin.on('data', (chunk: string) => {
  consumeInput(chunk)
})
process.stdin.on('end', () => {
  abortActiveCalls()
})
process.stdin.on('error', () => {
  abortActiveCalls()
})
process.once('SIGINT', () => {
  abortActiveCalls()
  process.exitCode = 130
})
process.once('SIGTERM', () => {
  abortActiveCalls()
  process.exitCode = 143
})

function consumeInput(chunk: string): void {
  inputBuffer += chunk
  while (true) {
    const newline = inputBuffer.indexOf('\n')
    if (newline < 0) {
      if (
        Buffer.byteLength(inputBuffer, 'utf8') > mcpInputMaximumBytes
      ) {
        inputBuffer = ''
        discardingOversizedLine = true
        sendJsonRpcError(null, -32700, safeInvalidMessage)
      }
      return
    }
    const line = inputBuffer.slice(0, newline).replace(/\r$/, '')
    inputBuffer = inputBuffer.slice(newline + 1)
    if (discardingOversizedLine) {
      discardingOversizedLine = false
      continue
    }
    if (line.length === 0) continue
    if (Buffer.byteLength(line, 'utf8') > mcpInputMaximumBytes) {
      sendJsonRpcError(null, -32700, safeInvalidMessage)
      continue
    }
    void handleLine(line)
  }
}

async function handleLine(line: string): Promise<void> {
  let message: JsonRpcMessage
  try {
    message = JSON.parse(line) as JsonRpcMessage
  } catch {
    sendJsonRpcError(null, -32700, safeInvalidMessage)
    return
  }
  if (
    !isRecord(message) ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    sendJsonRpcError(readJsonRpcId(message.id), -32600, safeInvalidMessage)
    return
  }

  if (message.method === 'notifications/initialized') return
  if (message.method === 'notifications/cancelled') {
    cancelRequest(message.params)
    return
  }

  const id = readJsonRpcId(message.id)
  if (id === undefined) return
  if (message.method === 'initialize') {
    await initialize(id, message.params)
    return
  }
  if (!initialized) {
    sendJsonRpcError(id, -32002, safeUnavailableMessage)
    return
  }
  if (message.method === 'ping') {
    sendJsonRpcResult(id, {})
    return
  }
  if (message.method === 'tools/list') {
    if (!isToolsListParams(message.params)) {
      sendJsonRpcError(id, -32602, safeInvalidMessage)
      return
    }
    sendJsonRpcResult(id, {
      tools: [
        {
          name: PROPOSE_STATE_PATCH_CAPABILITY,
          description:
            'Ask the user to review one semantic state change proposal.',
          inputSchema: proposeStatePatchInputSchema,
        },
      ],
    })
    return
  }
  if (message.method === 'tools/call') {
    await callTool(id, message.params)
    return
  }
  sendJsonRpcError(id, -32601, 'The MCP method is not available.')
}

async function initialize(id: JsonRpcId, params: unknown): Promise<void> {
  const protocolVersion = readProtocolVersion(params)
  if (!protocolVersion) {
    sendJsonRpcError(id, -32602, safeInvalidMessage)
    return
  }
  try {
    await ensureBrokerHandshake()
  } catch {
    sendJsonRpcError(id, -32000, safeUnavailableMessage)
    return
  }
  initialized = true
  sendJsonRpcResult(id, {
    protocolVersion,
    capabilities: { tools: { listChanged: false } },
    serverInfo: {
      name: INTERACTION_MCP_SERVER_NAME,
      version: '1.0.0',
    },
  })
}

async function callTool(id: JsonRpcId, params: unknown): Promise<void> {
  const request = readToolCall(params)
  if (!request) {
    sendToolFailure(id, safeInvalidMessage)
    return
  }
  const abortController = new AbortController()
  const key = jsonRpcIdKey(id)
  activeCalls.set(key, abortController)
  try {
    const response = await postToBroker(
      {
        protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
        kind: 'capability_call',
        capability: PROPOSE_STATE_PATCH_CAPABILITY,
        request,
      },
      abortController.signal,
    )
    if (
      response.kind === 'capability_result' &&
      response.capability === PROPOSE_STATE_PATCH_CAPABILITY
    ) {
      sendJsonRpcResult(id, {
        content: [
          {
            type: 'text',
            text: describeResult(response.result.outcome),
          },
        ],
        structuredContent: response.result,
        isError: false,
      })
      return
    }
    if (response.kind === 'error') {
      sendToolFailure(id, response.displayMessage)
      return
    }
    sendToolFailure(id, safeUnavailableMessage)
  } catch {
    sendToolFailure(
      id,
      abortController.signal.aborted
        ? safeInterruptedMessage
        : safeUnavailableMessage,
    )
  } finally {
    activeCalls.delete(key)
  }
}

function ensureBrokerHandshake(): Promise<void> {
  if (!startupPromise) {
    startupPromise = (async () => {
      const response = await postToBroker({
        protocolVersion: INTERACTION_BROKER_PROTOCOL_VERSION,
        kind: 'handshake',
        serverName: INTERACTION_MCP_SERVER_NAME,
        capabilities: [PROPOSE_STATE_PATCH_CAPABILITY],
      })
      if (response.kind !== 'handshake_accepted') {
        throw new BrokerUnavailableError()
      }
    })()
  }
  return startupPromise
}

async function postToBroker(
  request: InteractionBrokerRequest,
  signal?: AbortSignal,
): Promise<InteractionBrokerResponse> {
  const configuration = readBrokerConfiguration()
  const body = JSON.stringify(request)
  if (Buffer.byteLength(body, 'utf8') > INTERACTION_BROKER_BODY_MAX_BYTES) {
    throw new BrokerUnavailableError()
  }
  let response: Response
  try {
    response = await fetch(configuration.url, {
      method: 'POST',
      redirect: 'error',
      headers: {
        authorization: `Bearer ${configuration.token}`,
        'content-type': 'application/json',
        'x-ay-ple-runtime-binding': configuration.runtimeBinding,
      },
      body,
      signal,
    })
  } catch {
    throw new BrokerUnavailableError()
  }
  const responseBody = await readBoundedResponseBody(response)
  const decoded = parseInteractionBrokerResponse(responseBody)
  if (
    response.status !== 200 &&
    (response.status < 400 || decoded.kind !== 'error')
  ) {
    throw new BrokerUnavailableError()
  }
  return decoded
}

async function readBoundedResponseBody(response: Response): Promise<Uint8Array> {
  if (!response.body) throw new BrokerUnavailableError()
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      total += next.value.byteLength
      if (total > INTERACTION_BROKER_BODY_MAX_BYTES) {
        await reader.cancel()
        throw new BrokerUnavailableError()
      }
      chunks.push(next.value)
    }
  } catch {
    throw new BrokerUnavailableError()
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

function readBrokerConfiguration(): BrokerConfiguration {
  const rawUrl = process.env[brokerUrlEnvironment]
  const token = process.env[brokerTokenEnvironment]
  const runtimeBinding = process.env[runtimeBindingEnvironment]
  if (
    !rawUrl ||
    !token ||
    !runtimeBinding ||
    !/^[A-Za-z0-9_-]{43}$/.test(token) ||
    !/^runtime_[0-9a-f]{32}$/.test(runtimeBinding)
  ) {
    throw new BrokerUnavailableError()
  }
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new BrokerUnavailableError()
  }
  if (
    url.protocol !== 'http:' ||
    (url.hostname !== '127.0.0.1' && url.hostname !== '[::1]') ||
    url.pathname !== brokerRoute ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    url.search.length > 0 ||
    url.hash.length > 0
  ) {
    throw new BrokerUnavailableError()
  }
  return { url: url.href, token, runtimeBinding }
}

function readToolCall(params: unknown): ProposeStatePatchRequest | undefined {
  if (!isRecord(params)) return undefined
  const keys = Object.keys(params).sort()
  const expected = [
    'arguments',
    'name',
    ...(Object.hasOwn(params, '_meta') ? ['_meta'] : []),
  ].sort()
  if (
    keys.length !== expected.length ||
    !keys.every((key, index) => key === expected[index]) ||
    params.name !== PROPOSE_STATE_PATCH_CAPABILITY
  ) {
    return undefined
  }
  try {
    return decodeProposeStatePatchRequest(params.arguments)
  } catch {
    return undefined
  }
}

function readProtocolVersion(params: unknown): string | undefined {
  if (
    !isRecord(params) ||
    typeof params.protocolVersion !== 'string' ||
    !supportedProtocolVersions.has(params.protocolVersion) ||
    !isRecord(params.capabilities) ||
    !isRecord(params.clientInfo) ||
    typeof params.clientInfo.name !== 'string' ||
    typeof params.clientInfo.version !== 'string'
  ) {
    return undefined
  }
  return params.protocolVersion
}

function isToolsListParams(params: unknown): boolean {
  return (
    params === undefined ||
    (isRecord(params) &&
      Object.keys(params).every((key) => key === 'cursor') &&
      (params.cursor === undefined || typeof params.cursor === 'string'))
  )
}

function cancelRequest(params: unknown): void {
  if (!isRecord(params)) return
  const id = readJsonRpcId(params.requestId)
  if (id === undefined) return
  activeCalls.get(jsonRpcIdKey(id))?.abort()
}

function readJsonRpcId(value: unknown): JsonRpcId | undefined {
  return (
    typeof value === 'number' ||
    typeof value === 'string' ||
    value === null
  )
    ? value
    : undefined
}

function jsonRpcIdKey(id: JsonRpcId): string {
  return JSON.stringify(id)
}

function describeResult(outcome: 'accept' | 'revise' | 'reject'): string {
  if (outcome === 'accept') return 'The user accepted the proposal.'
  if (outcome === 'revise') return 'The user requested a revision.'
  return 'The user rejected the proposal.'
}

function sendToolFailure(id: JsonRpcId, displayMessage: string): void {
  sendJsonRpcResult(id, {
    content: [{ type: 'text', text: displayMessage }],
    isError: true,
  })
}

function sendJsonRpcResult(id: JsonRpcId, result: unknown): void {
  sendMessage({ jsonrpc: '2.0', id, result })
}

function sendJsonRpcError(
  id: JsonRpcId | undefined,
  code: number,
  message: string,
): void {
  sendMessage({
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code, message },
  })
}

function sendMessage(message: unknown): void {
  if (process.stdout.destroyed) return
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function abortActiveCalls(): void {
  for (const controller of activeCalls.values()) controller.abort()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
