import { AppError } from '../errors/AppError.js'

export function notFound(req, res, next) {
  next(
    new AppError({
      status: 404,
      code: 'NOT_FOUND',
      message: '요청한 경로를 찾을 수 없어요.',
    }),
  )
}
