import { Router } from 'express';
import { requireAuth } from '../services/auth/requireAuth.js';
import { fetchUserLogs } from '../services/logs/logService.js';

const router = Router();

// 로그인한 사용자 본인의 탐지 로그를 최신순으로 반환한다.
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const logs = await fetchUserLogs(req.session.userId);
    res.json({ logs });
  } catch (err) {
    next(err);
  }
});

export default router;
