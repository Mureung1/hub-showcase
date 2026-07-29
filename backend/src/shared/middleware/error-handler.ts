import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { AppError } from '../errors/app-error.js'
import { fail } from '../http/api-response.js'
import { logger } from '../logger/logger.js'

export const errorHandler: ErrorRequestHandler = (error, _request, response, next) => {
  void next

  if (error instanceof ZodError) {
    response.status(400).json(fail(400, '요청 입력값이 올바르지 않습니다.'))
    return
  }

  if (error instanceof AppError) {
    response.status(error.status).json(fail(error.status, error.message))
    return
  }

  logger.error('Unhandled request error', {
    error: error instanceof Error ? error.message : String(error),
  })

  response.status(500).json(fail(500, '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'))
}
