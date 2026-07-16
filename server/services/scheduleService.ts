import { getSupabaseClient } from '../lib/supabaseClient';
import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@shared/schemas';

type ScheduleRow = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string | null;
  raw_input: string;
  created_at: string;
};

function rowToSchedule(row: ScheduleRow): Schedule {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time ?? undefined,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function scheduleToRow(input: ScheduleCreate | ScheduleUpdate) {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.date !== undefined) row.date = input.date;
  if (input.startTime !== undefined) row.start_time = input.startTime;
  if (input.endTime !== undefined) row.end_time = input.endTime;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class ScheduleNotFoundError extends Error {}

export async function listSchedules(date?: string): Promise<Schedule[]> {
  const client = getSupabaseClient();
  let query = client.from('schedules').select('*').order('start_time', { ascending: true });
  if (date) query = query.eq('date', date);
  const { data, error } = await query;
  if (error) throw new Error(`[scheduleService] 조회 실패: ${error.message}`);
  return (data as ScheduleRow[]).map(rowToSchedule);
}

export async function createSchedule(input: ScheduleCreate): Promise<Schedule> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('schedules')
    .insert(scheduleToRow(input))
    .select('*')
    .single();
  if (error) throw new Error(`[scheduleService] 생성 실패: ${error.message}`);
  return rowToSchedule(data as ScheduleRow);
}

export async function updateSchedule(id: string, input: ScheduleUpdate): Promise<Schedule> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('schedules')
    .update(scheduleToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[scheduleService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new ScheduleNotFoundError(`[scheduleService] id=${id} 일정을 찾을 수 없습니다.`);
  }
  return rowToSchedule(data as ScheduleRow);
}

export async function deleteSchedule(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('schedules').delete().eq('id', id);
  if (error) throw new Error(`[scheduleService] 삭제 실패: ${error.message}`);
}
