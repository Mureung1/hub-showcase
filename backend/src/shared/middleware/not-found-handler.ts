import type { RequestHandler } from 'express'
import { fail } from '../http/api-response.js'

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json(fail(404, `요청한 API 경로를 찾을 수 없습니다: ${request.method} ${request.path}`))
}
