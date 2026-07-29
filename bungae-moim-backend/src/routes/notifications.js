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
//
// ⚠️ 이 생성은 F1/F4/E5와 성격이 다르다 — 거기서는 알림이 그 요청이 존재하는 이유인 행위(신청·
// 승인·취소)와 한 트랜잭션이라 실패하면 행위 자체가 롤백돼야 맞다. 여기서는 "이미 있는 알림
// 목록을 보여준다"가 이 엔드포인트의 존재 이유이고, lazy 생성은 그 위에 얹은 최선 노력형 보강일
// 뿐이다 — 실패해도 목록 자체는 여전히 유효하고, 빠진 알림은 다음 방문에서 다시 시도된다.
// 그래서 실패를 격리한다: 여기서 터지면 사용자가 알림을 아예 못 보게 되는 게 오히려 더 나쁘다
// (평가 알림 하나 누락 << 매 페이지 이동마다 500).
router.get('/', requireAuth, async (req, res, next) => {
  try {
    try {
      await ensureEvaluationNotifications(req.session.userId);
    } catch (err) {
      // 응답에는 절대 노출하지 않는다(errorHandler와 동일 원칙) — 서버 로그에만 남기고
      // 알림 목록 조회는 정상적으로 계속 진행한다.
      console.error('[notifications] 평가 요청 알림 lazy 생성 실패:', req.session.userId, err);
    }
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
