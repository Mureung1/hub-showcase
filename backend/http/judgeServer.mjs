import http from 'node:http'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { handleCodeRunApiRequest } from './codeRunRoutes.mjs'
import { createCorsHeaders, createRouteNotFoundResponse } from '../shared/http.mjs'

export const defaultJudgeHost = '127.0.0.1'
export const defaultJudgePort = 8790

export function createJudgeServer(options = {}) {
  return http.createServer(createJudgeApp(options))
}

export function createJudgeApp({ logger = console } = {}) {
  const app = express()

  app.set('trust proxy', true)
  app.use((request, response, next) => {
    response.set(createCorsHeaders())
    next()
  })
  app.options('/api/*path', (request, response) => response.status(204).end())
  app.use(express.text({ type: '*/*', limit: '1mb' }))

  app.use(async (request, response, next) => {
    if (!request.path.startsWith('/api')) {
      next()
      return
    }

    try {
      if (request.method === 'GET' && request.path === '/api/health') {
        sendJson(response, {
          status: 200,
          body: { status: 'ok', service: 'judge' },
        })
        return
      }

      const result =
        (await handleCodeRunApiRequest({
          method: request.method,
          url: request.originalUrl,
          bodyText: typeof request.body === 'string' ? request.body : '',
          ip: request.ip,
        })) ?? createRouteNotFoundResponse()

      sendJson(response, result)
    } catch (error) {
      next(error)
    }
  })

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error)
      return
    }

    const requestTooLarge = error?.status === 413 || error?.type === 'entity.too.large'
    logger.error(error instanceof Error ? error.message : error)
    sendJson(response, requestTooLarge ? {
      status: 413,
      body: { error: 'request_too_large', message: '요청 본문이 너무 큽니다.' },
    } : {
      status: 500,
      body: { error: 'internal_server_error', message: '코드 실행 요청 처리에 실패했습니다.' },
    })
  })

  return app
}

export function startJudgeServer({
  host = process.env.JUDGE_HOST || (process.env.PORT ? '0.0.0.0' : defaultJudgeHost),
  port = Number(process.env.PORT || process.env.JUDGE_PORT || defaultJudgePort),
  logger = console,
} = {}) {
  const server = createJudgeServer({ logger })

  server.listen(port, host, () => {
    logger.log(`ICU Judge listening on http://${host}:${port}`)
  })

  return server
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startJudgeServer()
}

function sendJson(response, { status, body, headers = createCorsHeaders() }) {
  response.set(headers)
  response.status(status)

  if (body === null) {
    response.end()
    return
  }

  response.json(body)
}
