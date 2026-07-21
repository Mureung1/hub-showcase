import { Router } from 'express';
import { BriefingSchema } from '@shared/schemas';
import { getBriefing, getTodaySeoul } from '../services/briefingService';

const router = Router();
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', async (req, res) => {
  const rawDate = req.query.date;
  const date = typeof rawDate === 'string' && rawDate.length > 0 ? rawDate : getTodaySeoul();

  if (!DATE_PATTERN.test(date)) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_DATE', message: 'date는 YYYY-MM-DD 형식이어야 합니다.' } });
    return;
  }

  try {
    const briefing = await getBriefing(date);
    res.json(BriefingSchema.parse(briefing));
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

export default router;
