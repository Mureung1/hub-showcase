import { Router } from 'express';
import { computeTopRoutes } from '../services/routeService.js';

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

export default router;
