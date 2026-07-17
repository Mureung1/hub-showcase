import { CodexChatRuntimeError, type CodexChatStreamFrame } from '@ay-ple/codex-chat-runtime'
import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import { isLoopbackAddress } from './codex-chat-config.js'
import {
  CodexChatServiceError,
  type CodexChatService,
  type CodexChatStreamSink,
} from './codex-chat-service.js'

const CHAT_JSON_ENVELOPE_LIMIT = 1024 * 1024
const CHAT_TEXT_MAX_BYTES = 131_072
const DEFAULT_HTTP_WRITE_DRAIN_MS = 5_000
const SAFE_UNAVAILABLE_MESSAGE = 'Codex Chat is unavailable.'
const SAFE_INVALID_REQUEST_MESSAGE = 'The Codex Chat request is invalid.'
const SAFE_FORBIDDEN_MESSAGE = 'The Codex Chat request is not allowed.'
const SAFE_ACTIVE_TURN_MESSAGE = 'A Codex turn is already active.'
const SAFE_UNKNOWN_THREAD_MESSAGE = 'The Codex thread is not active.'
const SAFE_UNKNOWN_TURN_MESSAGE = 'The Codex turn is not active.'
const SAFE_OPERATION_FAILED_MESSAGE = 'The Codex Chat operation failed.'

export function createCodexChatRouter(
  service: CodexChatService,
  configuredOrigin?: string,
  httpWriteDrainMs = DEFAULT_HTTP_WRITE_DRAIN_MS,
): Router {
  const router = express.Router()

  router.use((request, response, next) => {
    applyScopedCors(request, response, configuredOrigin)
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      next()
      return
    }
    if (!isAllowedMutation(request, configuredOrigin)) {
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
      if (!response.writableEnded) disconnected = true
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
        isDisconnected()
          ? undefined
          : createResponseSink(response, httpWriteDrainMs),
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

export interface NdjsonWritable {
  readonly destroyed: boolean
  readonly writableEnded: boolean
  write(chunk: string): boolean
  destroy(): void
  once(event: 'close' | 'drain', listener: () => void): unknown
  off(event: 'close' | 'drain', listener: () => void): unknown
}

export async function writeNdjsonLine(
  response: NdjsonWritable,
  frame: CodexChatStreamFrame,
  writeDrainMs = DEFAULT_HTTP_WRITE_DRAIN_MS,
): Promise<boolean> {
  if (response.destroyed || response.writableEnded) return false
  try {
    if (response.write(`${JSON.stringify(frame)}\n`)) return true
  } catch {
    return false
  }
  if (response.destroyed || response.writableEnded) return false
  return new Promise((resolve) => {
    let settled = false
    let deadline: ReturnType<typeof setTimeout> | undefined
    const onDrain = () => finish('drained')
    const onClose = () => finish('closed')
    const finish = (outcome: 'drained' | 'closed' | 'timed-out') => {
      if (settled) return
      settled = true
      if (deadline) clearTimeout(deadline)
      response.off('drain', onDrain)
      response.off('close', onClose)
      if (outcome === 'timed-out') {
        try {
          response.destroy()
        } catch {
          // The stalled write is already classified as disconnected.
        }
      }
      resolve(outcome === 'drained')
    }
    response.once('drain', onDrain)
    response.once('close', onClose)
    deadline = setTimeout(() => finish('timed-out'), writeDrainMs)
  })
}

function createResponseSink(
  response: Response,
  writeDrainMs: number,
): CodexChatStreamSink {
  return {
    async accept(turn) {
      if (response.destroyed || response.writableEnded) return false
      response.status(200)
      response.setHeader('content-type', 'application/x-ndjson')
      response.setHeader('cache-control', 'no-store')
      return writeNdjsonLine(
        response,
        {
          type: 'turn.accepted',
          threadId: turn.threadId,
          turnId: turn.turnId,
        },
        writeDrainMs,
      )
    },
    write: (frame) => writeNdjsonLine(response, frame, writeDrainMs),
    end() {
      if (!response.writableEnded && !response.destroyed) response.end()
    },
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
  if (error instanceof CodexChatServiceError) {
    switch (error.code) {
      case 'active_turn':
        return new CodexChatHttpError(409, error.code, SAFE_ACTIVE_TURN_MESSAGE)
      case 'unknown_thread':
        return new CodexChatHttpError(404, error.code, SAFE_UNKNOWN_THREAD_MESSAGE)
      case 'unknown_turn':
        return new CodexChatHttpError(404, error.code, SAFE_UNKNOWN_TURN_MESSAGE)
      case 'codex_chat_unavailable':
        return new CodexChatHttpError(503, error.code, SAFE_UNAVAILABLE_MESSAGE)
    }
  }
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
