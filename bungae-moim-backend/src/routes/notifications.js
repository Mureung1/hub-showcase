const express = require('express');
const requireAuth = require('../middleware/auth');
const {
  listNotifications,
  markAllRead,
  ensureEvaluationNotifications,
} = require('../services/notificationService');

const router = express.Router();

// GET /api/notifications — 최근 알림 20건 + 미읽음 수(C). 폴링이 아니라 라우트 이동 시 호출된다.
// 목록을 만들기 전에 평가 요청 알림을 lazy 생성한다(크론이 없어 여기가 유일한 훅이다, Δ3).
router.get('/', requireAuth, async (req, res, next) => {
  try {
    await ensureEvaluationNotifications(req.session.userId);
    const result = await listNotifications(req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/read — 미읽음 전체 읽음 처리(목록을 열 때 호출).
router.post('/read', requireAuth, async (req, res, next) => {
  try {
    const result = await markAllRead(req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
