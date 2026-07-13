const ApiError = require('../utils/apiError');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message } });
}

module.exports = errorHandler;
