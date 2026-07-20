const sendError = (res, status, code, message, details = {}) =>
  res.status(status).json({
    error: { code, message, details },
  });

module.exports = { sendError };
