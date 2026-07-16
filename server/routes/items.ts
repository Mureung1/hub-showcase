import { Router } from 'express';
import { ItemTypeSchema, ScheduleCreateSchema, ScheduleUpdateSchema } from '@shared/schemas';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  ScheduleNotFoundError,
} from '../services/scheduleService';

const router = Router();

router.param('type', (_req, res, next, type) => {
  const parsed = ItemTypeSchema.safeParse(type);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_TYPE', message: `알 수 없는 항목 유형입니다: ${type}` } });
    return;
  }
  if (parsed.data !== 'schedules') {
    res.status(501).json({
      error: { code: 'NOT_IMPLEMENTED', message: `${parsed.data} 타입은 아직 구현되지 않았습니다.` },
    });
    return;
  }
  next();
});

router.get('/:type', async (req, res) => {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : undefined;
    const schedules = await listSchedules(date);
    res.json(schedules);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

router.post('/:type', async (req, res) => {
  const parsedBody = ScheduleCreateSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: parsedBody.error.message } });
    return;
  }
  try {
    const schedule = await createSchedule(parsedBody.data);
    res.status(201).json(schedule);
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

router.patch('/:type/:id', async (req, res) => {
  const parsedBody = ScheduleUpdateSchema.safeParse(req.body);
  if (!parsedBody.success) {
    res
      .status(400)
      .json({ error: { code: 'VALIDATION_ERROR', message: parsedBody.error.message } });
    return;
  }
  try {
    const schedule = await updateSchedule(req.params.id, parsedBody.data);
    res.json(schedule);
  } catch (err) {
    if (err instanceof ScheduleNotFoundError) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
      return;
    }
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

router.delete('/:type/:id', async (req, res) => {
  try {
    await deleteSchedule(req.params.id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
  }
});

export default router;
