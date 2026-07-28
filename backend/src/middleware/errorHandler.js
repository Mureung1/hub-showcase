export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Not Found: ${req.method} ${req.originalUrl}` })
}

export function errorHandler(err, req, res, next) {
  console.error(err)
  const status = err.status || 500
  const message = err.status ? err.message : '서버 오류가 발생했습니다.'
  res.status(status).json({ error: message })
}
