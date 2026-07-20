import type { RequestHandler } from 'express'
import { fail } from '../http/api-response.js'

export const notFoundHandler: RequestHandler = (request, response) => {
  response.status(404).json(fail(404, `Route not found: ${request.method} ${request.path}`))
}
