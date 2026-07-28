const jwt = require('jsonwebtoken');
const env = require('../config/env');
const AppError = require('../utils/appError');

function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, '인증이 필요합니다', 'UNAUTHORIZED'));
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub };
    return next();
  } catch (err) {
    return next(new AppError(401, '유효하지 않은 토큰입니다', 'INVALID_TOKEN'));
  }
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return next();
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.jwt.accessSecret);
    req.user = { id: payload.sub };
  } catch (err) {
    // Silently proceed for optional authentication
  }
  return next();
}

module.exports = { requireAuth, optionalAuth };

