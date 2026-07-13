export class AppError extends Error {
  constructor({ status = 500, code = 'INTERNAL_ERROR', message = '문제가 발생했어요.' }) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.code = code
  }
}
