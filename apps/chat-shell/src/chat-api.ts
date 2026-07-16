import {
  parseCodexChatStatus,
  parseCodexChatStreamFrame,
  parseCodexChatThread,
  type CodexChatStatus,
  type CodexChatStreamFrame,
  type CodexChatThread,
} from '@ay-ple/codex-chat-runtime/contract'

const MAX_NDJSON_LINE_BYTES = 1024 * 1024
const SAFE_INVALID_RESPONSE = 'Codex Chat returned an invalid response.'
const SAFE_REQUEST_FAILURE = 'The Codex Chat request failed.'

export class ChatStreamError extends Error {
  constructor() {
    super('The Codex Chat stream is invalid.')
    this.name = 'ChatStreamError'
  }
}

export class ChatApiError extends Error {
  readonly code: string
  readonly displayMessage: string
  readonly unknownOutcome?: boolean

  constructor(
    code: string,
    displayMessage: string,
    unknownOutcome?: boolean,
  ) {
    super(displayMessage)
    this.name = 'ChatApiError'
    this.code = code
    this.displayMessage = displayMessage
    this.unknownOutcome = unknownOutcome
  }
}

export async function fetchCodexChatStatus(
  signal?: AbortSignal,
): Promise<CodexChatStatus> {
  const response = await fetch('/api/codex-chat/status', {
    headers: { accept: 'application/json' },
    signal,
  })
  if (!response.ok) throw await toApiError(response)
  return parseJsonResponse(response, parseCodexChatStatus)
}

export async function startCodexChatThread(
  signal?: AbortSignal,
): Promise<CodexChatThread> {
  const response = await fetch('/api/codex-chat/threads', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: '{}',
    signal,
  })
  if (!response.ok) throw await toApiError(response)
  return parseJsonResponse(response, parseCodexChatThread)
}

export async function streamCodexChatTurn(
  threadId: string,
  text: string,
  onFrame: (frame: CodexChatStreamFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/codex-chat/threads/${encodeURIComponent(threadId)}/turns`,
    {
      method: 'POST',
      headers: {
        accept: 'application/x-ndjson, application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text }),
      signal,
    },
  )
  if (!response.ok) throw await toApiError(response)
  await consumeCodexChatTurnResponse(response, threadId, onFrame)
}

export async function interruptCodexChatTurn(
  threadId: string,
  turnId: string,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(
    `/api/codex-chat/threads/${encodeURIComponent(threadId)}/turns/${encodeURIComponent(turnId)}/interrupt`,
    {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
      },
      body: '{}',
      signal,
    },
  )
  if (!response.ok) throw await toApiError(response)
  if (response.status !== 202 || (await response.text()) !== '') {
    throw new ChatApiError('invalid_response', SAFE_INVALID_RESPONSE)
  }
}

export async function consumeCodexChatTurnResponse(
  response: Response,
  expectedThreadId: string,
  onFrame: (frame: CodexChatStreamFrame) => void,
): Promise<void> {
  if (!response.ok) throw await toApiError(response)
  const contentType = response.headers.get('content-type')?.split(';', 1)[0]
  if (contentType !== 'application/x-ndjson' || response.body === null) {
    throw new ChatStreamError()
  }

  let acceptedTurnId: string | undefined
  let terminalSeen = false
  for await (const frame of decodeCodexChatNdjson(response.body)) {
    if (terminalSeen) throw new ChatStreamError()
    if (acceptedTurnId === undefined) {
      if (
        frame.type !== 'turn.accepted' ||
        frame.threadId !== expectedThreadId
      ) {
        throw new ChatStreamError()
      }
      acceptedTurnId = frame.turnId
      onFrame(frame)
      continue
    }
    if (frame.type === 'turn.accepted') throw new ChatStreamError()
    if (
      frame.type !== 'runtime.failed' &&
      (frame.threadId !== expectedThreadId ||
        frame.turnId !== acceptedTurnId)
    ) {
      throw new ChatStreamError()
    }
    terminalSeen =
      frame.type === 'runtime.failed' || frame.type === 'turn.completed'
    onFrame(frame)
  }
  if (acceptedTurnId === undefined || !terminalSeen) {
    throw new ChatStreamError()
  }
}

export async function* decodeCodexChatNdjson(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<CodexChatStreamFrame> {
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: true })
  let pending = ''
  let reachedEnd = false
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        reachedEnd = true
        break
      }
      try {
        pending += decoder.decode(value, { stream: true })
      } catch {
        throw new ChatStreamError()
      }
      let newline = pending.indexOf('\n')
      while (newline >= 0) {
        const line = pending.slice(0, newline)
        pending = pending.slice(newline + 1)
        yield decodeLine(line)
        newline = pending.indexOf('\n')
      }
      requireBoundedLine(pending)
    }
    try {
      pending += decoder.decode()
    } catch {
      throw new ChatStreamError()
    }
    if (pending.length > 0) yield decodeLine(pending)
  } finally {
    if (!reachedEnd) {
      try {
        await reader.cancel()
      } catch {
        // Preserve the decoder error or consumer return that ended iteration.
      }
    }
    reader.releaseLock()
  }
}

function decodeLine(line: string): CodexChatStreamFrame {
  requireBoundedLine(line)
  if (line.length === 0) throw new ChatStreamError()
  try {
    return parseCodexChatStreamFrame(JSON.parse(line) as unknown)
  } catch {
    throw new ChatStreamError()
  }
}

function requireBoundedLine(line: string): void {
  if (new TextEncoder().encode(line).byteLength > MAX_NDJSON_LINE_BYTES) {
    throw new ChatStreamError()
  }
}

async function parseJsonResponse<T>(
  response: Response,
  parse: (value: unknown) => T,
): Promise<T> {
  try {
    return parse(JSON.parse(await response.text()) as unknown)
  } catch {
    throw new ChatApiError('invalid_response', SAFE_INVALID_RESPONSE)
  }
}

async function toApiError(response: Response): Promise<ChatApiError> {
  try {
    const value = JSON.parse(await response.text()) as unknown
    if (!isRecord(value)) throw new TypeError()
    const expected = [
      'code',
      'displayMessage',
      ...(value.unknownOutcome === undefined ? [] : ['unknownOutcome']),
    ].sort()
    const actual = Object.keys(value).sort()
    if (
      actual.length !== expected.length ||
      actual.some((key, index) => key !== expected[index]) ||
      typeof value.code !== 'string' ||
      value.code.length === 0 ||
      typeof value.displayMessage !== 'string' ||
      value.displayMessage.length === 0 ||
      (value.unknownOutcome !== undefined &&
        typeof value.unknownOutcome !== 'boolean')
    ) {
      throw new TypeError()
    }
    return new ChatApiError(
      value.code,
      value.displayMessage,
      value.unknownOutcome as boolean | undefined,
    )
  } catch {
    return new ChatApiError('request_failed', SAFE_REQUEST_FAILURE)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
