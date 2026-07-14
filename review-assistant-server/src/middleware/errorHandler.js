export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorHandler(err, req, res, next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: { code: 'INVALID_JSON', message: '요청 형식이 올바르지 않아요.' },
    })
  }

  const status = err.status || 500
  const code = err.code || 'ANALYSIS_FAILED'
  const message = err.status ? err.message : '잠시 후 다시 시도해주세요.'
  res.status(status).json({ error: { code, message } })
}
