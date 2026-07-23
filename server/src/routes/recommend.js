import { Router } from 'express';
import { db } from '../db/index.js';
import { optionalAuth } from '../middleware/auth.js';
import { selectRecommendedBakeries } from '../services/recommendService.js';
import { computeTopRoutes } from '../services/routeService.js';

const router = Router();

const ALLOWED_COUNTS = [2, 3, 4];
const ALLOWED_STYLES = ['크루아상', '식빵', '단팥빵', '스콘', '바게트'];

function isValidCoord(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// 자동 추천받기: 조건에 맞는 빵집 선정 + 동선 계산까지 한 번에 끝내서 결과만 반환한다
// (프론트가 /api/routes를 다시 호출할 필요 없음).
router.post('/recommend', optionalAuth, async (req, res, next) => {
  try {
    const { origin, count, mustIncludeId, styles, wantsCoffee } = req.body;
    const styleList = Array.isArray(styles) ? styles : [];

    if (!origin || !isValidCoord(origin.lat) || !isValidCoord(origin.lng)) {
      const err = new Error('origin(lat, lng)이 필요해요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!ALLOWED_COUNTS.includes(count)) {
      const err = new Error('count는 2, 3, 4 중 하나여야 해요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (styleList.some((s) => !ALLOWED_STYLES.includes(s))) {
      const err = new Error('styles 값이 올바르지 않아요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const { rows: bakeries } = await db.query('SELECT * FROM bakeries WHERE lat IS NOT NULL AND lng IS NOT NULL');

    const { picked, styleApplied, coffeeApplied } = selectRecommendedBakeries(bakeries, {
      count,
      mustIncludeId: mustIncludeId ?? null,
      styles: styleList,
      wantsCoffee: Boolean(wantsCoffee),
    });

    if (picked.length < 2) {
      const err = new Error('추천할 빵집이 충분하지 않아요.');
      err.status = 400;
      err.code = 'NOT_ENOUGH_BAKERIES';
      throw err;
    }

    const routes = computeTopRoutes(origin, picked);
    res.json({ success: true, data: { bakeries: picked, routes, styleApplied, coffeeApplied } });
  } catch (err) {
    next(err);
  }
});

export default router;
