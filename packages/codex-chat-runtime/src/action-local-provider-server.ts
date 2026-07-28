import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import type { Socket } from 'node:net'

import { withinDuration } from './local-provider-test-support.js'

const selectedActionPaths = [
  'materials/lms-outline-notice.txt',
  'materials/problem-solving-syllabus.txt',
] as const
const acceptedAssignment = [
  '# 첫 과제',
  '',
  '마감: 2026-08-03 23:59',
  '제출: LMS 과제함',
  '',
].join('\n')
const maxRequestBytes = 4 * 1024 * 1024

export type ActionLocalProviderFunctionCall = {
  readonly callId: string
  readonly name: string
  readonly arguments: Readonly<Record<string, unknown>>
}

export type ActionLocalProviderFunctionOutput = {
  readonly callId: string
  readonly output: string
}

export type ActionLocalProviderRequest = {
  readonly developerTexts: readonly string[]
  readonly functionCalls: readonly ActionLocalProviderFunctionCall[]
  readonly functionOutputs: readonly ActionLocalProviderFunctionOutput[]
  readonly instructions: string | null
  readonly method: string
  readonly model: string | null
  readonly path: string
  readonly toolNames: readonly string[]
  readonly userTexts: readonly string[]
}

export interface ActionLocalProvider {
  readonly url: string
  close(): Promise<readonly ActionLocalProviderRequest[]>
  dispose(): Promise<void>
}

export async function startActionLocalProvider(): Promise<ActionLocalProvider> {
  const responses = actionResponses()
  const requests: ActionLocalProviderRequest[] = []
  const sockets = new Set<Socket>()
  let responseIndex = 0
  const server = createServer((request, response) => {
    void handleRequest(request, response, {
      nextResponse() {
        const body = responses[responseIndex]
        responseIndex += 1
        if (body === undefined) {
          throw new Error('Action local provider has no queued response')
        }
        return body
      },
      record(requestJournal) {
        requests.push(requestJournal)
      },
    }).catch((error: unknown) => {
      if (!response.headersSent) {
        response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      }
      if (!response.writableEnded) {
        response.end(error instanceof Error ? error.message : String(error))
      }
    })
  })
  server.on('connection', (socket) => {
    sockets.add(socket)
    socket.once('close', () => sockets.delete(socket))
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  }).catch((error: unknown) => {
    server.closeAllConnections()
    for (const socket of sockets) socket.destroy()
    if (server.listening) server.close()
    throw error
  })
  const address = server.address() as AddressInfo
  let closeServerPromise: Promise<void> | undefined
  const closeServer = (): Promise<void> => {
    closeServerPromise ??= (async () => {
      const gracefulClose = new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error)
          else resolve()
        })
        server.closeIdleConnections()
      })
      try {
        await withinDuration(
          gracefulClose,
          2_000,
          'Action local provider did not close gracefully',
        )
      } catch {
        server.closeAllConnections()
        for (const socket of sockets) socket.destroy()
        await withinDuration(
          gracefulClose,
          2_000,
          'Action local provider did not close after forced connection cleanup',
        )
      }
    })()
    return closeServerPromise
  }
  let closePromise: Promise<readonly ActionLocalProviderRequest[]> | undefined
  return {
    url: `http://127.0.0.1:${address.port}`,
    close() {
      closePromise ??= (async () => {
        await closeServer()
        if (responseIndex !== responses.length) {
          throw new Error(
            `Action local provider consumed ${responseIndex}/${responses.length} responses`,
          )
        }
        return structuredClone(requests)
      })()
      return closePromise
    },
    dispose: closeServer,
  }
}

type RequestHandlerState = {
  nextResponse(): string
  record(request: ActionLocalProviderRequest): void
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  state: RequestHandlerState,
): Promise<void> {
  if (
    request.method === 'GET' &&
    (request.url?.endsWith('/v1/models') || request.url?.endsWith('/models'))
  ) {
    sendJson(response, {
      object: 'list',
      data: [
        {
          id: 'mock-model',
          object: 'model',
          created: 0,
          owned_by: 'openai',
        },
      ],
    })
    return
  }
  if (
    request.method !== 'POST' ||
    !(request.url?.endsWith('/v1/responses') || request.url?.endsWith('/responses'))
  ) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Unexpected local provider request')
    return
  }
  const body = asRecord(JSON.parse(await readRequestBody(request)))
  state.record(journalRequest(request, body))
  response.writeHead(200, {
    'content-type': 'text/event-stream',
    'cache-control': 'no-cache',
  })
  response.end(state.nextResponse())
}

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let total = 0
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    total += value.byteLength
    if (total > maxRequestBytes) {
      throw new Error('Action local provider request exceeded its byte budget')
    }
    chunks.push(value)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function journalRequest(
  request: IncomingMessage,
  body: Record<string, unknown>,
): ActionLocalProviderRequest {
  return {
    method: request.method ?? '',
    path: request.url ?? '',
    model: typeof body.model === 'string' ? body.model : null,
    instructions:
      typeof body.instructions === 'string' ? body.instructions : null,
    developerTexts: messageInputTexts(body, 'developer'),
    functionCalls: journalFunctionCalls(body),
    functionOutputs: journalFunctionOutputs(body),
    toolNames: journalToolNames(body),
    userTexts: messageInputTexts(body, 'user'),
  }
}

function messageInputTexts(
  body: Record<string, unknown>,
  role: string,
): string[] {
  const texts: string[] = []
  for (const item of arrayRecords(body.input)) {
    if (item.type !== 'message' || item.role !== role) continue
    if (typeof item.content === 'string') {
      texts.push(item.content)
      continue
    }
    for (const part of arrayRecords(item.content)) {
      if (part.type === 'input_text' && typeof part.text === 'string') {
        texts.push(part.text)
      }
    }
  }
  return texts
}

function journalFunctionCalls(
  body: Record<string, unknown>,
): ActionLocalProviderFunctionCall[] {
  const calls: ActionLocalProviderFunctionCall[] = []
  for (const item of arrayRecords(body.input)) {
    if (
      item.type !== 'function_call' ||
      typeof item.call_id !== 'string' ||
      typeof item.name !== 'string'
    ) {
      continue
    }
    const name =
      typeof item.namespace === 'string'
        ? `${item.namespace}__${item.name}`
        : item.name
    const parsedArguments = parseRecord(item.arguments)
    calls.push({
      callId: item.call_id,
      name,
      arguments: parsedArguments,
    })
  }
  return calls
}

function journalFunctionOutputs(
  body: Record<string, unknown>,
): ActionLocalProviderFunctionOutput[] {
  const outputs: ActionLocalProviderFunctionOutput[] = []
  for (const item of arrayRecords(body.input)) {
    if (
      item.type !== 'function_call_output' ||
      typeof item.call_id !== 'string'
    ) {
      continue
    }
    if (typeof item.output === 'string') {
      outputs.push({ callId: item.call_id, output: item.output })
      continue
    }
    const texts = arrayRecords(item.output)
      .map((part) => part.text)
      .filter((text): text is string => typeof text === 'string')
    if (texts.length > 0) {
      outputs.push({ callId: item.call_id, output: texts.join('\n') })
    }
  }
  return outputs
}

function journalToolNames(body: Record<string, unknown>): string[] {
  return arrayRecords(body.tools)
    .map((tool) => tool.name)
    .filter((name): name is string => typeof name === 'string')
}

function actionResponses(): string[] {
  const readArguments = {
    cmd: selectedReadCommand(),
    login: false,
    'yield_time_ms': 10_000,
  }
  return [
    responseWithCall(
      'action-read-response',
      'call-action-read-selected',
      'exec_command',
      readArguments,
    ),
    responseWithCall(
      'action-review-initial-response',
      'call-action-review-initial',
      'propose_state_patch',
      actionReview(
        '첫 과제 정보를 정리합니다.',
        '선택한 두 자료에서 확인한 정보를 반영합니다.',
      ),
      'mcp__ay_ple_interaction',
    ),
    guardianAllowResponse(
      'action-review-initial-guardian-response',
      'action-review-initial-guardian-message',
    ),
    responseWithCall(
      'action-review-revised-response',
      'call-action-review-revised',
      'propose_state_patch',
      actionReview(
        '피드백을 반영해 과제 정보를 다시 정리합니다.',
        '제출 방식을 더 분명하게 반영합니다.',
      ),
      'mcp__ay_ple_interaction',
    ),
    guardianAllowResponse(
      'action-review-revised-guardian-response',
      'action-review-revised-guardian-message',
    ),
    responseWithCall(
      'action-apply-response',
      'call-action-apply-checkpoint',
      'exec_command',
      {
        cmd: acceptedCheckpointCommand(),
        justification: 'Record the accepted SemesterWorkspace checkpoint.',
        login: false,
        sandbox_permissions: 'require_escalated',
        'yield_time_ms': 10_000,
      },
    ),
    guardianAllowResponse(
      'action-apply-guardian-response',
      'action-apply-guardian-message',
    ),
    streamingResponse(
      'action-accepted-terminal-response',
      'action-accepted-terminal-message',
      ['accepted ', 'action ', 'completed'],
    ),
    responseWithCall(
      'action-reject-read-response',
      'call-action-read-rejected',
      'exec_command',
      readArguments,
    ),
    responseWithCall(
      'action-review-rejected-response',
      'call-action-review-rejected',
      'propose_state_patch',
      actionReview(
        '추가 변경을 제안합니다.',
        '현재 자료를 다시 확인한 추가 제안입니다.',
      ),
      'mcp__ay_ple_interaction',
    ),
    guardianAllowResponse(
      'action-review-rejected-guardian-response',
      'action-review-rejected-guardian-message',
    ),
    streamingResponse(
      'action-rejected-terminal-response',
      'action-rejected-terminal-message',
      ['rejected ', 'action ', 'completed'],
    ),
  ]
}

function selectedReadCommand(): string {
  const source = [
    'from pathlib import Path',
    'import hashlib,json,sys',
    'values={value:hashlib.sha256(Path(value).read_bytes()).hexdigest() for value in sys.argv[1:]}',
    "print(json.dumps({'selectedFileDigests':values},separators=(',',':'),sort_keys=True))",
  ].join(';')
  return [
    '/usr/bin/python3',
    '-c',
    shellQuote(source),
    ...selectedActionPaths.map(shellQuote),
  ].join(' ')
}

function acceptedCheckpointCommand(): string {
  const source = [
    'from pathlib import Path',
    'import json,sys',
    "Path(sys.argv[1]).write_text(sys.argv[2],encoding='utf-8')",
    "print(json.dumps({'intendedMutation':sys.argv[1]},separators=(',',':'),sort_keys=True))",
  ].join(';')
  const writeCommand = [
    '/usr/bin/python3',
    '-c',
    shellQuote(source),
    'assignment.md',
    shellQuote(acceptedAssignment),
  ].join(' ')
  return [
    writeCommand,
    '/usr/bin/git add -- assignment.md',
    "/usr/bin/git commit --quiet --only -m 'feat: record accepted first assignment' -- assignment.md",
  ].join(' && ')
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

function actionReview(
  summary: string,
  description: string,
): Record<string, unknown> {
  return {
    changes: [
      {
        after: '2026-08-03 23:59 / LMS 과제함',
        before: '미정',
        description,
        label: '첫 과제 정보',
      },
    ],
    question: '이 변경을 실제 과제 파일에 반영할까요?',
    summary,
  }
}

function responseWithCall(
  responseId: string,
  callId: string,
  name: string,
  argumentsValue: Record<string, unknown>,
  namespace?: string,
): string {
  return sse([
    responseCreated(responseId),
    {
      type: 'response.output_item.done',
      item: {
        type: 'function_call',
        call_id: callId,
        name,
        arguments: JSON.stringify(argumentsValue),
        ...(namespace === undefined ? {} : { namespace }),
      },
    },
    responseCompleted(responseId),
  ])
}

function guardianAllowResponse(responseId: string, messageId: string): string {
  return streamingResponse(responseId, messageId, ['{"outcome":"allow"}'])
}

function streamingResponse(
  responseId: string,
  messageId: string,
  parts: readonly string[],
): string {
  const text = parts.join('')
  return sse([
    responseCreated(responseId),
    {
      type: 'response.output_item.added',
      item: {
        type: 'message',
        role: 'assistant',
        id: messageId,
        content: [{ type: 'output_text', text: '' }],
      },
    },
    ...parts.map((delta) => ({
      type: 'response.output_text.delta',
      delta,
    })),
    {
      type: 'response.output_item.done',
      item: {
        type: 'message',
        role: 'assistant',
        id: messageId,
        content: [{ type: 'output_text', text }],
      },
    },
    responseCompleted(responseId),
  ])
}

function responseCreated(responseId: string): Record<string, unknown> {
  return { type: 'response.created', response: { id: responseId } }
}

function responseCompleted(responseId: string): Record<string, unknown> {
  return {
    type: 'response.completed',
    response: {
      id: responseId,
      usage: {
        input_tokens: 1,
        input_tokens_details: null,
        output_tokens: 1,
        output_tokens_details: null,
        total_tokens: 2,
      },
    },
  }
}

function sse(events: readonly Record<string, unknown>[]): string {
  return events
    .map((event) => `event: ${String(event.type)}\ndata: ${JSON.stringify(event)}\n\n`)
    .join('')
}

function sendJson(response: ServerResponse, value: unknown): void {
  const body = JSON.stringify(value)
  response.writeHead(200, {
    'content-type': 'application/json',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

function arrayRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Action local provider request body must be an object')
  }
  return value as Record<string, unknown>
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value === 'string') {
    try {
      return asRecord(JSON.parse(value))
    } catch {
      return { raw: value }
    }
  }
  try {
    return asRecord(value)
  } catch {
    return { raw: value }
  }
}
