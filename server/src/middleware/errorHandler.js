import { AppError } from '../errors/AppError.js'
import { env } from '../config/env.js'

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error)
    return
  }

  const appError =
    error instanceof AppError
      ? error
      : new AppError({
          status: 500,
          code: 'INTERNAL_ERROR',
          message: '잠시 후 다시 시도해주세요.',
        })

  if (!(error instanceof AppError) && env.NODE_ENV !== 'test') {
    console.error(error)
  }

  res.status(appError.status).json({
    error: {
      code: appError.code,
      message: appError.message,
    },
  })
}
