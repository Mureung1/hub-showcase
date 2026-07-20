import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/app-error.js'
import { fail } from '../http/api-response.js'
import { logger } from '../logger/logger.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next

  if (error instanceof ZodError) {
    response.status(400).json(fail(400, 'Invalid request input'))
    return
  }

  if (error instanceof AppError) {
    response.status(error.status).json(fail(error.status, error.message))
    return
  }

  logger.error('Unhandled request error', {
    error: error instanceof Error ? error.message : String(error),
  })

  response.status(500).json(fail(500, 'Internal server error'))
}
