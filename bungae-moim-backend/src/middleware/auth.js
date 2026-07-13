const pool = require('../config/db');
const ApiError = require('../utils/apiError');

async function requireAuth(req, res, next) {
  try {
    if (!req.session.userId) {
      throw new ApiError('UNAUTHENTICATED', '로그인이 필요합니다');
    }

    const { rows } = await pool.query(
      'SELECT suspended_until FROM users WHERE id = $1',
      [req.session.userId]
    );

    const suspendedUntil = rows[0] && rows[0].suspended_until;
    if (suspendedUntil && new Date(suspendedUntil) > new Date()) {
      throw new ApiError('SUSPENDED', '정지된 계정입니다');
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = requireAuth;
