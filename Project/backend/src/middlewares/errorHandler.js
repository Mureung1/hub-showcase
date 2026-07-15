function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.isAppError ? err.message : '서버 오류가 발생했습니다';

  if (!err.isAppError) {
    console.error(err);
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: { code, message },
  });
}

module.exports = errorHandler;

