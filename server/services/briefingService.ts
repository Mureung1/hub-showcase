import { getDay, parseISO } from 'date-fns';
import { getSupabaseClient } from '../lib/supabaseClient';
import { listSchedules } from './scheduleService';
import type {
  Briefing,
  BriefingRoutine,
  Meal,
  Memo,
  Routine,
  RoutineLog,
  Task,
} from '@shared/schemas';

type TaskRow = {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
  raw_input: string;
  created_at: string;
};

type RoutineRow = {
  id: string;
  title: string;
  content: string;
  start_time: string | null;
  end_time: string | null;
  repeat_rule: string;
  raw_input: string;
  created_at: string;
};

type RoutineLogRow = {
  id: string;
  routine_id: string;
  date: string;
  completed: boolean;
  raw_input: string;
  created_at: string;
};

type MealRow = {
  id: string;
  date: string;
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
  raw_input: string;
  created_at: string;
};

type MemoRow = {
  id: string;
  content: string;
  raw_input: string;
  created_at: string;
};

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    deadline: row.deadline,
    completed: row.completed,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function rowToRoutine(row: RoutineRow): Routine {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    startTime: row.start_time ?? undefined,
    endTime: row.end_time ?? undefined,
    repeatRule: row.repeat_rule,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

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

function rowToMeal(row: MealRow): Meal {
  return {
    id: row.id,
    date: row.date,
    breakfast: row.breakfast ?? undefined,
    lunch: row.lunch ?? undefined,
    dinner: row.dinner ?? undefined,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function rowToMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    content: row.content,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

const WEEKDAY_TOKENS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function weekdayToken(date: string): string {
  return WEEKDAY_TOKENS[getDay(parseISO(date))];
}

/**
 * 2분할처럼 여러 루틴이 하나의 repeat_rule을 공유하며 번갈아 돌아가는 그룹에서,
 * 오늘 차례인 루틴 하나를 고른다. 판단 기준(plan.md 3.2.3 "오늘 상체 완료 → 다음엔 하체"):
 * 1. 오늘 날짜 로그가 이미 있으면 그 루틴이 오늘 차례.
 * 2. 없으면 오늘 이전 가장 최근 완료 로그의 "다음" 루틴이 오늘 차례.
 * 3. 완료 로그가 아예 없으면 생성 순서상 첫 번째 루틴이 오늘 차례.
 */
function resolveRotationTurn(group: Routine[], logs: RoutineLog[], date: string): Routine {
  const ordered = [...group].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const groupIds = new Set(ordered.map((r) => r.id));

  const todayLog = logs.find((l) => l.date === date && groupIds.has(l.routineId));
  if (todayLog) {
    return ordered.find((r) => r.id === todayLog.routineId) ?? ordered[0];
  }

  const priorCompleted = logs
    .filter((l) => l.date < date && l.completed && groupIds.has(l.routineId))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  if (priorCompleted.length === 0) return ordered[0];

  const lastRoutine = ordered.find((r) => r.id === priorCompleted[0].routineId) ?? ordered[0];
  const lastIndex = ordered.indexOf(lastRoutine);
  return ordered[(lastIndex + 1) % ordered.length];
}

/** 전체 루틴 정의 + 완료 이력에서, 주어진 날짜에 표시할 루틴만 골라낸다. */
export function resolveTodayRoutines(
  routines: Routine[],
  logs: RoutineLog[],
  date: string,
): Routine[] {
  const rotationGroups = new Map<string, Routine[]>();
  const today: Routine[] = [];

  for (const routine of routines) {
    if (routine.repeatRule === 'daily') {
      today.push(routine);
      continue;
    }
    if (routine.repeatRule.startsWith('weekly:')) {
      const days = routine.repeatRule.slice('weekly:'.length).split(',');
      if (days.includes(weekdayToken(date))) today.push(routine);
      continue;
    }
    const group = rotationGroups.get(routine.repeatRule) ?? [];
    group.push(routine);
    rotationGroups.set(routine.repeatRule, group);
  }

  for (const group of rotationGroups.values()) {
    today.push(resolveRotationTurn(group, logs, date));
  }

  return today;
}

export function getTodaySeoul(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

export async function getBriefing(date: string): Promise<Briefing> {
  const client = getSupabaseClient();

  const [schedules, taskResult, routineResult, logResult, mealResult, memoResult] =
    await Promise.all([
      listSchedules(date),
      client.from('tasks').select('*').order('deadline', { ascending: true }),
      client.from('routines').select('*'),
      client.from('routine_logs').select('*'),
      client.from('meals').select('*').eq('date', date).maybeSingle(),
      client.from('memos').select('*').order('created_at', { ascending: false }),
    ]);

  if (taskResult.error)
    throw new Error(`[briefingService] tasks 조회 실패: ${taskResult.error.message}`);
  if (routineResult.error)
    throw new Error(`[briefingService] routines 조회 실패: ${routineResult.error.message}`);
  if (logResult.error)
    throw new Error(`[briefingService] routine_logs 조회 실패: ${logResult.error.message}`);
  if (mealResult.error)
    throw new Error(`[briefingService] meals 조회 실패: ${mealResult.error.message}`);
  if (memoResult.error)
    throw new Error(`[briefingService] memos 조회 실패: ${memoResult.error.message}`);

  const allRoutines = (routineResult.data as RoutineRow[]).map(rowToRoutine);
  const allLogs = (logResult.data as RoutineLogRow[]).map(rowToRoutineLog);

  const routines: BriefingRoutine[] = resolveTodayRoutines(allRoutines, allLogs, date).map(
    (routine) => ({
      routine,
      completedToday: allLogs.some(
        (log) => log.routineId === routine.id && log.date === date && log.completed,
      ),
    }),
  );

  return {
    date,
    greeting: '오늘 하루도 힘내봐요!',
    schedules,
    routines,
    meal: mealResult.data ? rowToMeal(mealResult.data as MealRow) : null,
    deadlines: (taskResult.data as TaskRow[]).map(rowToTask),
    memos: (memoResult.data as MemoRow[]).map(rowToMemo),
  };
}
