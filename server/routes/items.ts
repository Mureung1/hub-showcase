import { Router, type Response } from 'express';
import type { ZodType } from 'zod';
import {
  ItemTypeSchema,
  ScheduleCreateSchema,
  ScheduleUpdateSchema,
  TaskCreateSchema,
  TaskUpdateSchema,
  RoutineCreateSchema,
  RoutineUpdateSchema,
  MealCreateSchema,
  MealUpdateSchema,
  MemoCreateSchema,
  MemoUpdateSchema,
  ReminderCreateSchema,
  ReminderUpdateSchema,
  type ItemType,
} from '@shared/schemas';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  ScheduleNotFoundError,
} from '../services/scheduleService';
import {
  listTasks,
  createTask,
  updateTask,
  deleteTask,
  TaskNotFoundError,
} from '../services/taskService';
import {
  listRoutines,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  RoutineNotFoundError,
} from '../services/routineService';
import {
  listMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  MealNotFoundError,
} from '../services/mealService';
import {
  listMemos,
  createMemo,
  updateMemo,
  deleteMemo,
  MemoNotFoundError,
} from '../services/memoService';
import {
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  ReminderNotFoundError,
} from '../services/reminderService';
import { upsertRoutineLog } from '../services/routineLogService';
import { getTodaySeoul } from '../services/briefingService';

const router = Router();

router.param('type', (_req, res, next, type) => {
  const parsed = ItemTypeSchema.safeParse(type);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: { code: 'INVALID_TYPE', message: `알 수 없는 항목 유형입니다: ${type}` } });
    return;
  }
  next();
});

function parseBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | undefined {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.message } });
    return undefined;
  }
  return parsed.data;
}

function handleError(err: unknown, res: Response) {
  if (
    err instanceof ScheduleNotFoundError ||
    err instanceof TaskNotFoundError ||
    err instanceof RoutineNotFoundError ||
    err instanceof MealNotFoundError ||
    err instanceof MemoNotFoundError ||
    err instanceof ReminderNotFoundError
  ) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: err.message } });
    return;
  }
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: (err as Error).message } });
}

router.get('/:type', async (req, res) => {
  const type = req.params.type as ItemType;
  const date = typeof req.query.date === 'string' ? req.query.date : undefined;
  const completed =
    req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;
  try {
    switch (type) {
      case 'schedules':
        res.json(await listSchedules(date));
        return;
      case 'tasks':
        res.json(await listTasks(completed));
        return;
      case 'routines':
        res.json(await listRoutines());
        return;
      case 'meals':
        res.json(await listMeals(date));
        return;
      case 'memos':
        res.json(await listMemos(completed));
        return;
      case 'reminders':
        res.json(await listReminders());
        return;
    }
  } catch (err) {
    handleError(err, res);
  }
});

router.post('/:type', async (req, res) => {
  const type = req.params.type as ItemType;
  try {
    switch (type) {
      case 'schedules': {
        const data = parseBody(ScheduleCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createSchedule(data));
        return;
      }
      case 'tasks': {
        const data = parseBody(TaskCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createTask(data));
        return;
      }
      case 'routines': {
        const data = parseBody(RoutineCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createRoutine(data));
        return;
      }
      case 'meals': {
        const data = parseBody(MealCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createMeal(data));
        return;
      }
      case 'memos': {
        const data = parseBody(MemoCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createMemo(data));
        return;
      }
      case 'reminders': {
        const data = parseBody(ReminderCreateSchema, req.body, res);
        if (!data) return;
        res.status(201).json(await createReminder(data));
        return;
      }
    }
  } catch (err) {
    handleError(err, res);
  }
});

router.patch('/:type/:id', async (req, res) => {
  const type = req.params.type as ItemType;
  const { id } = req.params;
  try {
    switch (type) {
      case 'schedules': {
        const data = parseBody(ScheduleUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateSchedule(id, data));
        return;
      }
      case 'tasks': {
        const data = parseBody(TaskUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateTask(id, data));
        return;
      }
      case 'routines': {
        const data = parseBody(RoutineUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateRoutine(id, data));
        return;
      }
      case 'meals': {
        const data = parseBody(MealUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateMeal(id, data));
        return;
      }
      case 'memos': {
        const data = parseBody(MemoUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateMemo(id, data));
        return;
      }
      case 'reminders': {
        const data = parseBody(ReminderUpdateSchema, req.body, res);
        if (!data) return;
        res.json(await updateReminder(id, data));
        return;
      }
    }
  } catch (err) {
    handleError(err, res);
  }
});

router.delete('/:type/:id', async (req, res) => {
  const type = req.params.type as ItemType;
  const { id } = req.params;
  try {
    switch (type) {
      case 'schedules':
        await deleteSchedule(id);
        break;
      case 'tasks':
        await deleteTask(id);
        break;
      case 'routines':
        await deleteRoutine(id);
        break;
      case 'meals':
        await deleteMeal(id);
        break;
      case 'memos':
        await deleteMemo(id);
        break;
      case 'reminders':
        await deleteReminder(id);
        break;
    }
    res.status(204).send();
  } catch (err) {
    handleError(err, res);
  }
});

router.post('/routines/:id/complete', async (req, res) => {
  const { id } = req.params;
  const body = (req.body ?? {}) as { date?: unknown; completed?: unknown; rawInput?: unknown };
  const date = typeof body.date === 'string' ? body.date : getTodaySeoul();
  const completed = typeof body.completed === 'boolean' ? body.completed : true;
  const rawInput = typeof body.rawInput === 'string' ? body.rawInput : '브리핑에서 완료 체크';
  try {
    res.json(await upsertRoutineLog(id, date, completed, rawInput));
  } catch (err) {
    handleError(err, res);
  }
});

export default router;
