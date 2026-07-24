import { format, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import { getGroqClient } from '../lib/groqClient';
import { getSupabaseClient } from '../lib/supabaseClient';
import { buildSystemPrompt, LlmOutputSchema } from '../lib/promptTemplates';
import { getTodaySeoul, resolveTodayRoutines } from './briefingService';
import { createSchedule } from './scheduleService';
import { createTask } from './taskService';
import { createRoutine, listRoutines } from './routineService';
import { createMeal } from './mealService';
import { createMemo } from './memoService';
import { createReminder } from './reminderService';
import { upsertRoutineLog } from './routineLogService';
import {
  ScheduleCreateSchema,
  TaskCreateSchema,
  RoutineCreateSchema,
  MealCreateSchema,
  MemoCreateSchema,
  ReminderCreateSchema,
  type Item,
  type ItemType,
  type Intent,
  type ParseResult,
  type ResolvedParseResult,
  type RoutineLog,
} from '@shared/schemas';

type LlmResult = {
  type: ItemType;
  intent: Intent;
  label?: string;
  fields: Record<string, string | boolean>;
};

type RoutineLogRow = {
  id: string;
  routine_id: string;
  date: string;
  completed: boolean;
  raw_input: string;
  created_at: string;
};

function rowToRoutineLog(row: RoutineLogRow): RoutineLog {
  return {
    id: row.id,
    routineId: row.routine_id,
    date: row.date,
    completed: row.completed,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

const GROQ_MODEL = 'openai/gpt-oss-120b';

async function callGroq(rawInput: string) {
  const client = getGroqClient();
  const today = getTodaySeoul();
  const weekday = format(parseISO(today), 'EEEE', { locale: ko });
  const completion = await client.chat.completions.create({
    model: GROQ_MODEL,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt(today, weekday) },
      { role: 'user', content: rawInput },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch {
    return null;
  }

  const parsed = LlmOutputSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** "오늘 운동 다 함"류 — 새 루틴을 만드는 게 아니라 기존 루틴 중 하나를 찾아 완료 처리한다. */
async function completeRoutine(fields: Record<string, unknown>, rawInput: string): Promise<Item> {
  const routines = await listRoutines();
  const titleHint = typeof fields.title === 'string' ? fields.title.trim() : '';

  const target = titleHint
    ? (() => {
        const matches = routines.filter((r) => r.title.includes(titleHint));
        if (matches.length !== 1) throw new Error(`루틴 "${titleHint}"을(를) 특정할 수 없습니다`);
        return matches[0];
      })()
    : (() => {
        const client = getSupabaseClient();
        return client
          .from('routine_logs')
          .select('*')
          .then(({ data, error }) => {
            if (error) throw new Error(`routine_logs 조회 실패: ${error.message}`);
            const logs = (data as RoutineLogRow[]).map(rowToRoutineLog);
            const today = resolveTodayRoutines(routines, logs, getTodaySeoul());
            if (today.length !== 1) throw new Error('오늘의 루틴을 하나로 특정할 수 없습니다');
            return today[0];
          });
      })();

  const routine = await target;
  await upsertRoutineLog(routine.id, getTodaySeoul(), true, rawInput);
  return { type: 'routines', data: routine };
}

async function saveOne(result: LlmResult, rawInput: string): Promise<Item> {
  const { type, intent, fields } = result;

  if (type === 'routines' && intent === 'complete') {
    return completeRoutine(fields, rawInput);
  }

  const merged = { ...fields, rawInput };
  switch (type) {
    case 'schedules':
      return { type, data: await createSchedule(ScheduleCreateSchema.parse(merged)) };
    case 'tasks':
      return { type, data: await createTask(TaskCreateSchema.parse(merged)) };
    case 'routines':
      return { type, data: await createRoutine(RoutineCreateSchema.parse(merged)) };
    case 'meals':
      return { type, data: await createMeal(MealCreateSchema.parse(merged)) };
    case 'memos':
      return { type, data: await createMemo(MemoCreateSchema.parse(merged)) };
    case 'reminders':
      return { type, data: await createReminder(ReminderCreateSchema.parse(merged)) };
  }
}

/** 여러 결과를 저장한다. reminders는 같은 배치의 다른 항목(방금 만든 일정/과제)에 자동으로 연결한다. */
async function saveResults(results: LlmResult[], rawInput: string): Promise<Item[]> {
  const nonReminders = results.filter((r) => r.type !== 'reminders');
  const reminders = results.filter((r) => r.type === 'reminders');

  const saved: Item[] = [];
  for (const result of nonReminders) {
    saved.push(await saveOne(result, rawInput));
  }

  for (const result of reminders) {
    const fields = { ...result.fields };
    if (!fields.targetId) {
      const sibling = saved.find((item) => item.type === 'schedules' || item.type === 'tasks');
      if (sibling && (sibling.type === 'schedules' || sibling.type === 'tasks')) {
        fields.targetId = sibling.data.id;
        fields.targetType = sibling.type === 'schedules' ? 'schedule' : 'task';
      }
    }
    saved.push(await saveOne({ ...result, fields }, rawInput));
  }

  return saved;
}

async function fallbackToMemo(rawInput: string): Promise<ResolvedParseResult> {
  const saved = await createMemo({ content: rawInput, rawInput });
  return { status: 'resolved', intent: 'create', items: [{ type: 'memos', data: saved }] };
}

export async function parseText(rawInput: string): Promise<ParseResult> {
  const parsed = await callGroq(rawInput);
  if (!parsed || parsed.status === 'unsupported') {
    return fallbackToMemo(rawInput);
  }

  try {
    if (parsed.status === 'clarify') {
      return {
        status: 'clarify',
        question: parsed.question ?? '어떻게 처리할까요?',
        rawInput,
        candidates: parsed.results.map((r) => ({
          label: r.label ?? r.type,
          intent: r.intent,
          type: r.type,
          fields: r.fields,
        })),
      };
    }

    const items = await saveResults(parsed.results, rawInput);
    const intent = parsed.results[0]?.intent ?? 'create';
    return { status: 'resolved', intent, items };
  } catch {
    return fallbackToMemo(rawInput);
  }
}

export async function resolveCandidate(
  intent: Intent,
  type: ItemType,
  fields: Record<string, string | boolean>,
  rawInput: string,
): Promise<ResolvedParseResult> {
  const items = await saveResults([{ type, intent, fields }], rawInput);
  return { status: 'resolved', intent, items };
}
