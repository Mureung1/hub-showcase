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
  decodeProductInteractionAnswerRequest,
  decodeProductReviewResult,
  decodeTargetProductChatRequest,
  isProductInteractionId,
  isProductOperationId,
  type ProductAccountReadiness,
  type ProductCodexSettings,
  type ProductError,
  type ProductReviewFrame,
  type TargetProductOperationFrame,
  type TargetProductBootstrap,
  type ProductWorkspaceLifecycle,
} from '@ay-ple/product-contract'

import { isLoopbackAddress } from './codex-chat-config.js'
import { writeNdjsonLine } from './http-ndjson.js'
import type { InteractionBroker } from './interaction-broker.js'
import {
  PreparedProductOperationError,
  type PreparedProductOperationCoordinator,
  type PreparedProductOperationSink,
} from './prepared-product-operation-coordinator.js'
import {
  WorkspaceSourceProjectionError,
  type WorkspaceSourceProjection,
} from './workspace-source-projection.js'

const safeInvalidRequest = '요청을 확인하지 못했습니다.'
const safeForbidden = '이 요청은 local AY-PLE에서만 사용할 수 있습니다.'
const safeUnavailable = 'AY 작업공간을 사용할 수 없습니다.'
const defaultWriteDrainMs = 5_000

type PreparedProductReviewPort = Pick<
  InteractionBroker,
  'browserDisconnected' | 'settle' | 'turnInterrupted'
>

export function createPreparedProductRouter(options: {
  readonly configuredOrigin?: string
  readonly operations: PreparedProductOperationCoordinator
  readonly review: PreparedProductReviewPort
  readonly sources: WorkspaceSourceProjection
  readonly readLifecycle: () => ProductWorkspaceLifecycle
  readonly readAccountReadiness: () => Promise<ProductAccountReadiness>
  readonly readCodexSettings: () => Promise<ProductCodexSettings>
  readonly writeDrainMs?: number
}): Router {
  const router = express.Router()
  const writeDrainMs = options.writeDrainMs ?? defaultWriteDrainMs
  const admitSourceRead = (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (!isAllowedSourceRead(request, options.configuredOrigin)) {
      sendError(response, 403, 'forbidden', safeForbidden)
      return
    }
    next()
  }

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
      activeOperation: options.operations.activeOperation(),
    }
    response.json(body)
  })

  router.get('/codex-settings', async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (options.readLifecycle().state !== 'active') {
      sendError(
        response,
        503,
        'workspace_unavailable',
        safeUnavailable,
      )
      return
    }
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

  router.get('/sources', admitSourceRead, async (_request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (!hasActiveWorkspace(options.readLifecycle, response)) return
    try {
      response.json(await options.sources.list())
    } catch (error) {
      sendSourceError(response, error)
    }
  })

  router.get('/sources/text', admitSourceRead, async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (!hasActiveWorkspace(options.readLifecycle, response)) return
    const relativePath = readSourceRelativePath(request)
    if (!relativePath) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      response.json(await options.sources.readText(relativePath))
    } catch (error) {
      sendSourceError(response, error)
    }
  })

  router.get('/sources/pdf', admitSourceRead, async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    if (!hasActiveWorkspace(options.readLifecycle, response)) return
    const relativePath = readSourceRelativePath(request)
    if (!relativePath) {
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    }
    try {
      const pdf = await options.sources.readPdf(relativePath)
      response.status(200)
      response.setHeader('content-type', 'application/pdf')
      response.setHeader('content-length', pdf.bytes.byteLength)
      response.setHeader('x-content-type-options', 'nosniff')
      response.setHeader('cross-origin-resource-policy', 'same-origin')
      response.setHeader(
        'content-security-policy',
        "default-src 'none'; frame-ancestors 'self'; sandbox",
      )
      response.setHeader('etag', `"sha256-${pdf.digest}"`)
      response.setHeader(
        'content-disposition',
        `inline; filename*=UTF-8''${encodeHeaderFilename(pdf.relativePath)}`,
      )
      response.end(pdf.bytes)
    } catch (error) {
      sendSourceError(response, error)
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
    const input = tryDecode(decodeTargetProductChatRequest, request.body)
    if (!input) {
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
    async write(frame: TargetProductOperationFrame | ProductReviewFrame) {
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

function isAllowedSourceRead(
  request: Request,
  configuredOrigin: string | undefined,
): boolean {
  if (
    !isLoopbackAddress(request.socket.remoteAddress) ||
    !isAllowedLocalHost(request)
  ) {
    return false
  }
  const origin = request.headers.origin
  if (
    origin !== undefined &&
    (configuredOrigin === undefined || origin !== configuredOrigin)
  ) {
    return false
  }
  const fetchSite = request.headers['sec-fetch-site']
  return (
    fetchSite === undefined ||
    fetchSite === 'none' ||
    fetchSite === 'same-origin' ||
    fetchSite === 'same-site'
  )
}

function isAllowedLocalHost(request: Request): boolean {
  const host = request.headers.host
  if (!host) return false
  let parsed: URL
  try {
    parsed = new URL(`http://${host}`)
  } catch {
    return false
  }
  const hostname = parsed.hostname
  const hostPort =
    parsed.port.length > 0 ? Number(parsed.port) : undefined
  return (
    parsed.username.length === 0 &&
    parsed.password.length === 0 &&
    parsed.pathname === '/' &&
    parsed.search.length === 0 &&
    parsed.hash.length === 0 &&
    (hostPort === undefined ||
      (Number.isSafeInteger(hostPort) &&
        hostPort >= 1 &&
        hostPort <= 65_535)) &&
    (hostname === 'localhost' ||
      hostname === '[::1]' ||
      isLoopbackAddress(hostname))
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

function hasActiveWorkspace(
  readLifecycle: () => ProductWorkspaceLifecycle,
  response: Response,
): boolean {
  if (readLifecycle().state === 'active') return true
  sendError(response, 503, 'workspace_unavailable', safeUnavailable)
  return false
}

function readSourceRelativePath(request: Request): string | undefined {
  const keys = Object.keys(request.query)
  const relativePath = request.query.relativePath
  if (
    keys.length !== 1 ||
    keys[0] !== 'relativePath' ||
    typeof relativePath !== 'string'
  ) {
    return undefined
  }
  return relativePath
}

function sendSourceError(response: Response, error: unknown): void {
  if (!(error instanceof WorkspaceSourceProjectionError)) {
    sendError(response, 503, 'source_unavailable', safeUnavailable)
    return
  }
  switch (error.code) {
    case 'invalid_path':
      sendError(response, 400, 'invalid_request', safeInvalidRequest)
      return
    case 'source_not_found':
      sendError(
        response,
        404,
        'source_not_found',
        '자료 파일을 찾을 수 없습니다.',
      )
      return
    case 'unsupported_type':
    case 'unsupported_encoding':
    case 'invalid_pdf':
      sendError(
        response,
        415,
        'source_preview_unsupported',
        '이 자료 형식은 미리볼 수 없습니다.',
      )
      return
    case 'source_too_large':
      sendError(
        response,
        413,
        'source_too_large',
        '미리보기 허용 크기를 초과했습니다.',
      )
      return
    case 'scan_limit_exceeded':
      sendError(
        response,
        413,
        'source_scan_limit_exceeded',
        '표시할 수 있는 자료 범위를 초과했습니다.',
      )
      return
    case 'source_unavailable':
      sendError(
        response,
        503,
        'source_unavailable',
        '자료를 읽을 수 없습니다.',
      )
  }
}

function encodeHeaderFilename(relativePath: string): string {
  const basename = relativePath.split('/').at(-1) ?? 'source.pdf'
  return encodeURIComponent(basename).replace(
    /['()*]/gu,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  )
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
