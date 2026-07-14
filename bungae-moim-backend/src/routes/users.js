const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const ApiError = require('../utils/apiError');
const { normalizeUser } = require('../services/userService');

const router = express.Router();

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, email, nickname, birth_date, trust_score FROM users WHERE id = $1',
      [req.session.userId]
    );

    if (rows.length === 0) {
      throw new ApiError('NOT_FOUND', '사용자를 찾을 수 없습니다');
    }

    res.json({ data: normalizeUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
