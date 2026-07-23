const express = require('express');
const pool = require('../config/db');
const requireAuth = require('../middleware/auth');
const ApiError = require('../utils/apiError');
const { validateBirthDate } = require('../utils/validators');
const { normalizeUser } = require('../services/userService');
const { listHostedMeetings } = require('../services/meetingService');

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

// PATCH /api/users/me — 생년월일 최초 입력(D5). 자기신고라 처음 거짓말은 못 막지만,
// birth_date가 NULL일 때만 받아 성인↔미성년을 오가는 악용은 막는다(설계 문서 결정 2).
// (정교한 본인인증은 기획서 196번대로 추후 검토 — 의식적으로 미뤄둔 한계다.)
router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const birthDate = validateBirthDate(req.body);

    // 최초 1회만 설정되도록 birth_date IS NULL 조건을 UPDATE에 직접 걸어 원자적으로 잠근다.
    // SELECT 후 UPDATE로 나누면 동시 요청이 둘 다 NULL을 읽어 통과하는 경쟁이 생긴다.
    const updated = await pool.query(
      `UPDATE users SET birth_date = $1 WHERE id = $2 AND birth_date IS NULL
       RETURNING id, email, nickname, birth_date, trust_score`,
      [birthDate, req.session.userId]
    );

    if (updated.rows.length > 0) {
      res.json({ data: normalizeUser(updated.rows[0]) });
      return;
    }

    // 바뀐 행이 없음 = 사용자가 없거나(NOT_FOUND) 이미 생년월일이 설정됨(잠금).
    const existing = await pool.query('SELECT 1 FROM users WHERE id = $1', [req.session.userId]);
    if (existing.rows.length === 0) {
      throw new ApiError('NOT_FOUND', '사용자를 찾을 수 없습니다');
    }
    throw new ApiError('VALIDATION_ERROR', '생년월일은 수정할 수 없습니다');
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/hosted-meetings — 내가 등록한 모임(G1)
router.get('/me/hosted-meetings', requireAuth, async (req, res, next) => {
  try {
    const result = await listHostedMeetings(req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
