const requireRole = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: '로그인이 필요합니다.',
        details: {},
      },
    });
  }

  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: '접근 권한이 없습니다.',
        details: {},
      },
    });
  }

  return next();
};

module.exports = requireRole;
