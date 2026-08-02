import { Router } from 'express';
import { computeTopRoutes } from '../services/routeService.js';
import { computeTransitMinutes } from '../services/transitService.js';

const router = Router();

function isValidCoord(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

router.post('/routes', (req, res, next) => {
  try {
    const { origin, bakeries } = req.body;

    if (!origin || !isValidCoord(origin.lat) || !isValidCoord(origin.lng)) {
      const err = new Error('origin(lat, lng)이 필요해요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!Array.isArray(bakeries) || bakeries.length < 2) {
      const err = new Error('빵집을 2곳 이상 선택해주세요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    if (!bakeries.every((b) => b && isValidCoord(b.lat) && isValidCoord(b.lng) && b.id != null)) {
      const err = new Error('각 빵집은 id, lat, lng이 필요해요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const routes = computeTopRoutes(origin, bakeries);
    res.json({ success: true, data: { routes } });
  } catch (err) {
    next(err);
  }
});

// 이미 정해진 방문 순서(출발지 포함)를 그대로 받아 TMap 대중교통 API로 실제 소요시간을 구한다.
// "어떤 순서로 방문할지"는 위 /routes가 이미 계산했으므로 여기서는 순서를 다시 정하지 않는다.
router.post('/routes/transit-time', async (req, res, next) => {
  try {
    const { points } = req.body;
    if (!Array.isArray(points) || points.length < 2 || !points.every((p) => p && isValidCoord(p.lat) && isValidCoord(p.lng))) {
      const err = new Error('points(lat, lng 배열, 2개 이상)가 필요해요.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }

    const minutes = await computeTransitMinutes(points);
    res.json({ success: true, data: { minutes } });
  } catch (err) {
    next(err);
  }
});

export default router;
