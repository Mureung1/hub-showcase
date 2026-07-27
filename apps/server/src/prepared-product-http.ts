import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import {
  PRODUCT_JSON_ENVELOPE_MAX_BYTES,
  ProductContractError,
  decodeEmptyProductRequest,
  decodeProductChatRequest,
  decodeProductInteractionAnswerRequest,
  decodeProductReviewResult,
  isProductInteractionId,
  isProductOperationId,
  type ProductAccountReadiness,
  type ProductCodexSettings,
  type ProductError,
  type ProductOperationFrame,
  type ProductReviewFrame,
  type TargetProductBootstrap,
  type ProductWorkspaceLifecycle,
} from '@ay-ple/product-contract'

import { isLoopbackAddress } from './codex-chat-config.js'
import { writeNdjsonLine } from './http-ndjson.js'
import type { InlineSemanticReviewVertical } from './inline-semantic-review-vertical.js'
import {
  PreparedProductOperationError,
  type PreparedProductOperationCoordinator,
  type PreparedProductOperationSink,
} from './prepared-product-operation-coordinator.js'

const safeInvalidRequest = '요청을 확인하지 못했습니다.'
const safeForbidden = '이 요청은 local AY-PLE에서만 사용할 수 있습니다.'
const safeUnavailable = 'AY 작업공간을 사용할 수 없습니다.'
const defaultWriteDrainMs = 5_000

export function createPreparedProductRouter(options: {
  readonly configuredOrigin?: string
  readonly operations: PreparedProductOperationCoordinator
  readonly review: InlineSemanticReviewVertical
  readonly readLifecycle: () => ProductWorkspaceLifecycle
  readonly readAccountReadiness: () => Promise<ProductAccountReadiness>
  readonly readCodexSettings: () => Promise<ProductCodexSettings>
  readonly writeDrainMs?: number
}): Router {
  const router = express.Router()
  const writeDrainMs = options.writeDrainMs ?? defaultWriteDrainMs

  router.use((request, response, next) => {
    if (
      options.configuredOrigin &&
      request.headers.origin === options.configuredOrigin
    ) {
      response.setHeader('access-control-allow-origin', options.configuredOrigin)
      response.setHeader('vary', 'Origin')
    }
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      next()
      return
    }
    if (!isAllowedMutation(request, options.configuredOrigin)) {
      sendError(response, 403, 'forbidden', safeForbidden)
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

  router.get('/bootstrap', async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    const lifecycle = options.readLifecycle()
    let accountReadiness: ProductAccountReadiness = {
      state: 'unavailable',
      displayMessage: 'AY Runtime 준비가 완료되지 않았습니다.',
    }
    if (lifecycle.state === 'active') {
      try {
        accountReadiness =
          options.operations.operationStatus() === 'active'
            ? { state: 'ready' }
            : await options.readAccountReadiness()
      } catch {
        accountReadiness = {
          state: 'unavailable',
          displayMessage: 'Codex 상태를 확인할 수 없습니다.',
        }
      }
    }
    const body: TargetProductBootstrap = {
      accountReadiness,
      workspaceLifecycle: lifecycle,
      activeOperation: null,
    }
    response.json(body)
  })

  router.get('/codex-settings', async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    try {
      response.json(await options.readCodexSettings())
    } catch {
      sendError(
        response,
        503,
        'codex_settings_unavailable',
        'Codex 모델 설정을 확인할 수 없습니다.',
      )
    }
  })

  router.use(
    express.json({
      limit: PRODUCT_JSON_ENVELOPE_MAX_BYTES,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/chat/messages', async (request, response) => {
    const input = tryDecode(decodeProductChatRequest, request.body)
    if (!input || input.materials.length !== 0) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    await runProductStream({
      request,
      response,
      writeDrainMs,
      run: (streamOptions) =>
        options.operations.sendChat(
          {
            text: input.text,
            ...(input.codexSettings === undefined
              ? {}
              : { codexSettings: input.codexSettings }),
          },
          streamOptions,
        ),
      disconnect: (operationId) => {
        void options.review.browserDisconnected()
        options.operations.disconnect(operationId)
      },
    }).catch((error: unknown) => sendOperationError(response, error))
  })

  router.post('/reviews/:interactionId', async (request, response) => {
    const result = tryDecode(decodeProductReviewResult, request.body)
    if (!result || !isProductInteractionId(request.params.interactionId)) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      await options.review.settle(request.params.interactionId, result)
      response.status(204).end()
    } catch {
      sendError(
        response,
        409,
        'review_invalid',
        '검토 요청이 더 이상 활성 상태가 아닙니다.',
      )
    }
  })

  router.post(
    '/operations/:operationId/interactions/:interactionId/answer',
    async (request, response) => {
      const input = tryDecode(
        decodeProductInteractionAnswerRequest,
        request.body,
      )
      if (
        !input ||
        !isProductOperationId(request.params.operationId) ||
        !isProductInteractionId(request.params.interactionId)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      await respondToInteraction(
        options.operations,
        response,
        request.params.operationId,
        request.params.interactionId,
        { type: 'answer', answers: input.answers },
      )
    },
  )

  router.post(
    '/operations/:operationId/interactions/:interactionId/cancel',
    async (request, response) => {
      if (
        !isProductOperationId(request.params.operationId) ||
        !isProductInteractionId(request.params.interactionId) ||
        !tryDecode(decodeEmptyProductRequest, request.body)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      await respondToInteraction(
        options.operations,
        response,
        request.params.operationId,
        request.params.interactionId,
        { type: 'cancel' },
      )
    },
  )

  router.post(
    '/operations/:operationId/interrupt',
    async (request, response) => {
      if (
        !isProductOperationId(request.params.operationId) ||
        !tryDecode(decodeEmptyProductRequest, request.body)
      ) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
        return
      }
      try {
        if (!(await options.review.turnInterrupted())) {
          await options.operations.interrupt(request.params.operationId)
        }
        response.status(202).end()
      } catch (error) {
        sendOperationError(response, error)
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
      if (!response.headersSent) {
        sendError(response, 400, 'invalid_request', safeInvalidRequest)
      }
    },
  )

  return router
}

async function runProductStream(options: {
  readonly request: Request
  readonly response: Response
  readonly writeDrainMs: number
  readonly run: (input: {
    readonly disconnected: () => boolean
    readonly sink: PreparedProductOperationSink
  }) => Promise<void>
  readonly disconnect: (operationId: string) => void
}): Promise<void> {
  const { request, response } = options
  let disconnected = request.aborted || response.destroyed
  let streamStarted = false
  let operationId: string | undefined
  const disconnect = () => {
    disconnected = true
    if (operationId) options.disconnect(operationId)
  }
  const onClose = () => {
    if (!response.writableEnded) disconnect()
  }
  request.once('aborted', disconnect)
  request.socket.once('close', disconnect)
  response.once('close', onClose)
  const sink: PreparedProductOperationSink = {
    async write(frame: ProductOperationFrame | ProductReviewFrame) {
      operationId ??= frame.operationId
      if (disconnected) options.disconnect(frame.operationId)
      if (!streamStarted) {
        streamStarted = true
        response.status(200)
        response.setHeader('content-type', 'application/x-ndjson')
        response.setHeader('cache-control', 'no-store')
      }
      return writeNdjsonLine(response, frame, options.writeDrainMs)
    },
    end() {
      if (!response.destroyed && !response.writableEnded) response.end()
    },
  }
  try {
    await options.run({
      disconnected: () =>
        disconnected ||
        request.aborted ||
        request.socket.destroyed ||
        response.destroyed,
      sink,
    })
  } finally {
    request.off('aborted', disconnect)
    request.socket.off('close', disconnect)
    response.off('close', onClose)
  }
}

async function respondToInteraction(
  operations: PreparedProductOperationCoordinator,
  response: Response,
  operationId: string,
  interactionId: string,
  interactionResponse:
    | {
        readonly type: 'answer'
        readonly answers: Readonly<Record<string, readonly string[]>>
      }
    | { readonly type: 'cancel' },
): Promise<void> {
  try {
    await operations.respondToInteraction({
      operationId,
      interactionId,
      response: interactionResponse,
    })
    response.status(202).end()
  } catch (error) {
    sendOperationError(response, error)
  }
}

function isAllowedMutation(
  request: Request,
  configuredOrigin: string | undefined,
): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const origin = request.headers.origin
  return (
    origin === undefined ||
    (configuredOrigin !== undefined && origin === configuredOrigin)
  )
}

function tryDecode<T>(
  decode: (value: unknown) => T,
  value: unknown,
): T | undefined {
  try {
    return decode(value)
  } catch (error) {
    if (error instanceof ProductContractError) return undefined
    throw error
  }
}

function sendOperationError(response: Response, error: unknown): void {
  if (response.headersSent) {
    if (!response.writableEnded && !response.destroyed) response.end()
    return
  }
  if (error instanceof PreparedProductOperationError) {
    sendError(response, error.status, error.code, error.displayMessage)
    return
  }
  sendError(response, 500, 'operation_failed', safeUnavailable)
}

function sendError(
  response: Response,
  status: number,
  code: string,
  displayMessage: string,
): void {
  const body: ProductError = { code, displayMessage }
  response.status(status).json(body)
}
