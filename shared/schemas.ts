/**
 * Shared Zod schemas — FE/BE 공통 타입 정의
 * 엔티티 스키마와 파싱 결과 스키마를 여기서 한 번만 정의합니다.
 */
import { z } from 'zod';

// ===== 핵심 엔티티 =====

export const ScheduleSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  date: z.string(), // YYYY-MM-DD
  startTime: z.string(), // HH:mm
  endTime: z.string().optional(),
  rawInput: z.string(),
  createdAt: z.string(),
});

export const ScheduleCreateSchema = ScheduleSchema.omit({ id: true, createdAt: true });
export const ScheduleUpdateSchema = ScheduleCreateSchema.partial();

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  deadline: z.string(), // YYYY-MM-DD
  completed: z.boolean(),
  rawInput: z.string(),
  createdAt: z.string(),
});

export const RoutineSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  content: z.string(), // "200 push-up, 500 squat"
  startTime: z.string().optional(), // HH:mm
  endTime: z.string().optional(), // HH:mm
  repeatRule: z.string(), // "daily" | "2split" | "weekly:mon,wed,fri"
  rawInput: z.string(),
  createdAt: z.string(),
});

export const MealSchema = z.object({
  id: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  breakfast: z.string().optional(),
  lunch: z.string().optional(),
  dinner: z.string().optional(),
  rawInput: z.string(),
  createdAt: z.string(),
});

export const MemoSchema = z.object({
  id: z.string().uuid(),
  content: z.string(),
  rawInput: z.string(),
  createdAt: z.string(),
});

// ===== 보조 엔티티 =====

export const RoutineLogSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  date: z.string(), // YYYY-MM-DD
  completed: z.boolean(),
  rawInput: z.string(),
  createdAt: z.string(),
});

export const ReminderSchema = z.object({
  id: z.string().uuid(),
  targetType: z.enum(['schedule', 'task']),
  targetId: z.string().uuid(),
  remindAt: z.string(), // ISO 8601
  rawInput: z.string(),
  createdAt: z.string(),
});

// ===== 파싱 결과 =====

export const ItemTypeSchema = z.enum([
  'schedules',
  'tasks',
  'routines',
  'meals',
  'memos',
  'reminders',
]);
export const IntentSchema = z.enum(['create', 'update', 'delete', 'query', 'complete']);

export const ItemSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('schedules'), data: ScheduleSchema }),
  z.object({ type: z.literal('tasks'), data: TaskSchema }),
  z.object({ type: z.literal('routines'), data: RoutineSchema }),
  z.object({ type: z.literal('meals'), data: MealSchema }),
  z.object({ type: z.literal('memos'), data: MemoSchema }),
  z.object({ type: z.literal('reminders'), data: ReminderSchema }),
]);

export const ParseResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('resolved'), intent: IntentSchema, item: ItemSchema }),
  z.object({
    status: z.literal('clarify'),
    question: z.string(),
    candidates: z.array(z.object({ label: z.string(), intent: IntentSchema, item: ItemSchema })),
  }),
]);

// ===== 브리핑 응답 =====

export const BriefingSchema = z.object({
  date: z.string(),
  greeting: z.string(),
  schedules: z.array(ScheduleSchema),
  routines: z.array(RoutineSchema),
  meal: MealSchema.nullable(),
  deadlines: z.array(TaskSchema),
  memos: z.array(MemoSchema),
});

// ===== 타입 추출 =====

export type Schedule = z.infer<typeof ScheduleSchema>;
export type ScheduleCreate = z.infer<typeof ScheduleCreateSchema>;
export type ScheduleUpdate = z.infer<typeof ScheduleUpdateSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Routine = z.infer<typeof RoutineSchema>;
export type Meal = z.infer<typeof MealSchema>;
export type Memo = z.infer<typeof MemoSchema>;
export type RoutineLog = z.infer<typeof RoutineLogSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
export type Briefing = z.infer<typeof BriefingSchema>;
export type ItemType = z.infer<typeof ItemTypeSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Item = z.infer<typeof ItemSchema>;
export type ParseResult = z.infer<typeof ParseResultSchema>;
export type ResolvedParseResult = Extract<ParseResult, { status: 'resolved' }>;
export type ClarifyParseResult = Extract<ParseResult, { status: 'clarify' }>;
