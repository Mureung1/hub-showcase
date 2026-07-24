import express, {
  type NextFunction,
  type Request,
  type Response,
  type Router,
} from 'express'

import {
  PRODUCT_JSON_ENVELOPE_MAX_BYTES,
  ProductContractError,
  decodePublicPreviewCommand,
  type PublicPreviewErrorCode,
  type PublicPreviewResponse,
} from '@ay-ple/product-contract'

import { isLoopbackAddress } from './codex-chat-config.js'
import type {
  PublicPreviewCommandAdapter,
} from './public-preview-command-adapter.js'

export function createPublicPreviewRouter(input: {
  readonly adapter: PublicPreviewCommandAdapter
  readonly origin: string
}): Router {
  const router = express.Router()

  router.use(async (request, response, next) => {
    if (request.headers.origin === input.origin) {
      response.setHeader('access-control-allow-origin', input.origin)
      response.setHeader('vary', 'Origin')
    }
    if (request.method !== 'POST' && request.method !== 'OPTIONS') {
      next()
      return
    }
    if (!isAllowedMutation(request, input.origin)) {
      await sendFailure(
        input.adapter,
        request,
        response,
        403,
        'command_not_allowed',
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

  router.get('/', async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    const signal = requestSignal(request)
    try {
      sendPublicPreviewResponse(
        response,
        200,
        await input.adapter.observe({ signal: signal.signal }),
      )
    } catch {
      await sendFailure(
        input.adapter,
        request,
        response,
        500,
        'setup_unavailable',
      )
    } finally {
      signal.release()
    }
  })

  router.use(
    express.json({
      limit: PRODUCT_JSON_ENVELOPE_MAX_BYTES,
      strict: true,
      type: 'application/json',
    }),
  )

  router.post('/', async (request, response) => {
    response.setHeader('cache-control', 'no-store')
    let command
    try {
      command = decodePublicPreviewCommand(request.body)
    } catch (error) {
      if (!(error instanceof ProductContractError)) throw error
      await sendFailure(
        input.adapter,
        request,
        response,
        400,
        'setup_invalid_input',
      )
      return
    }
    const signal = requestSignal(request)
    try {
      const result = await input.adapter.dispatch({
        command,
        signal: signal.signal,
      })
      sendPublicPreviewResponse(
        response,
        statusForResponse(result),
        result,
      )
    } catch {
      await sendFailure(
        input.adapter,
        request,
        response,
        500,
        'setup_unavailable',
      )
    } finally {
      signal.release()
    }
  })

  router.use(
    async (
      error: unknown,
      request: Request,
      response: Response,
      _next: NextFunction,
    ) => {
      if (response.headersSent) return
      await sendFailure(
        input.adapter,
        request,
        response,
        isEntityTooLarge(error) ? 413 : 400,
        'setup_invalid_input',
      )
    },
  )

  return router
}

function isAllowedMutation(
  request: Request,
  configuredOrigin: string,
): boolean {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false
  const origin = request.headers.origin
  return origin === undefined || origin === configuredOrigin
}

async function sendFailure(
  adapter: PublicPreviewCommandAdapter,
  request: Request,
  response: Response,
  status: number,
  code: PublicPreviewErrorCode,
): Promise<void> {
  if (response.headersSent) return
  const signal = requestSignal(request)
  try {
    sendPublicPreviewResponse(
      response,
      status,
      await adapter.failure({ code, signal: signal.signal }),
    )
  } finally {
    signal.release()
  }
}

function sendPublicPreviewResponse(
  response: Response,
  status: number,
  body: PublicPreviewResponse,
): void {
  if (response.headersSent) return
  response.status(status).json(body)
}

function statusForResponse(response: PublicPreviewResponse): number {
  if (response.status === 'ok') return 200
  switch (response.error.code) {
    case 'setup_invalid_input':
      return 400
    case 'command_not_allowed':
    case 'setup_conflict':
    case 'setup_release_mismatch':
    case 'account_unsupported':
      return 409
    case 'account_login_failed':
      return 502
    case 'account_unavailable':
    case 'setup_unavailable':
      return 503
  }
}

function isEntityTooLarge(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.too.large'
  )
}

function requestSignal(request: Request): {
  readonly signal: AbortSignal
  release(): void
} {
  const controller = new AbortController()
  const abort = () => controller.abort()
  request.once('aborted', abort)
  return {
    signal: controller.signal,
    release() {
      request.off('aborted', abort)
    },
  }
}
