const { sendError } = require('../utils/apiError');

const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, 401, 'UNAUTHORIZED', '로그인이 필요합니다.');
  }

  if (!allowedRoles.includes(req.user.role)) {
    return sendError(res, 403, 'FORBIDDEN', '접근 권한이 없습니다.');
  }

  return next();
};

module.exports = requireRole;
