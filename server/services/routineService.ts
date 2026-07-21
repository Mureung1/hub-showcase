import { getSupabaseClient } from '../lib/supabaseClient';
import type { Routine, RoutineCreate, RoutineUpdate } from '@shared/schemas';

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

function routineToRow(input: RoutineCreate | RoutineUpdate) {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.content !== undefined) row.content = input.content;
  if (input.startTime !== undefined) row.start_time = input.startTime;
  if (input.endTime !== undefined) row.end_time = input.endTime;
  if (input.repeatRule !== undefined) row.repeat_rule = input.repeatRule;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class RoutineNotFoundError extends Error {}

export async function listRoutines(): Promise<Routine[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('routines')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`[routineService] 조회 실패: ${error.message}`);
  return (data as RoutineRow[]).map(rowToRoutine);
}

export async function createRoutine(input: RoutineCreate): Promise<Routine> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('routines')
    .insert(routineToRow(input))
    .select('*')
    .single();
  if (error) throw new Error(`[routineService] 생성 실패: ${error.message}`);
  return rowToRoutine(data as RoutineRow);
}

export async function updateRoutine(id: string, input: RoutineUpdate): Promise<Routine> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('routines')
    .update(routineToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[routineService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new RoutineNotFoundError(`[routineService] id=${id} 루틴을 찾을 수 없습니다.`);
  }
  return rowToRoutine(data as RoutineRow);
}

export async function deleteRoutine(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('routines').delete().eq('id', id);
  if (error) throw new Error(`[routineService] 삭제 실패: ${error.message}`);
}
