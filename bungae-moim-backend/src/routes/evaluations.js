const express = require('express');
const requireAuth = require('../middleware/auth');
const { listPendingEvaluations } = require('../services/evaluationService');

const router = express.Router();

// GET /api/evaluations/pending — 내가 평가해야 할 모임(설계 4.3의 발견 경로가 쓴다).
router.get('/pending', requireAuth, async (req, res, next) => {
  try {
    const result = await listPendingEvaluations(req.session.userId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
