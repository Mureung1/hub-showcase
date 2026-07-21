import { getSupabaseClient } from '../lib/supabaseClient';
import type { RoutineLog } from '@shared/schemas';

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

/** 같은 루틴·같은 날짜 로그가 있으면 완료 상태를 덮어쓰고, 없으면 새로 만든다 (unique(routine_id, date)). */
export async function upsertRoutineLog(
  routineId: string,
  date: string,
  completed: boolean,
  rawInput: string,
): Promise<RoutineLog> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('routine_logs')
    .upsert(
      { routine_id: routineId, date, completed, raw_input: rawInput },
      { onConflict: 'routine_id,date' },
    )
    .select('*')
    .single();
  if (error) throw new Error(`[routineLogService] 완료 처리 실패: ${error.message}`);
  return rowToRoutineLog(data as RoutineLogRow);
}
