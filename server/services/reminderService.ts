import { getSupabaseClient } from '../lib/supabaseClient';
import type { Reminder, ReminderCreate, ReminderUpdate } from '@shared/schemas';

type ReminderRow = {
  id: string;
  target_type: 'schedule' | 'task';
  target_id: string;
  remind_at: string;
  raw_input: string;
  created_at: string;
};

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    targetType: row.target_type,
    targetId: row.target_id,
    remindAt: row.remind_at,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function reminderToRow(input: ReminderCreate | ReminderUpdate) {
  const row: Record<string, unknown> = {};
  if (input.targetType !== undefined) row.target_type = input.targetType;
  if (input.targetId !== undefined) row.target_id = input.targetId;
  if (input.remindAt !== undefined) row.remind_at = input.remindAt;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class ReminderNotFoundError extends Error {}

export async function listReminders(): Promise<Reminder[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('reminders')
    .select('*')
    .order('remind_at', { ascending: true });
  if (error) throw new Error(`[reminderService] 조회 실패: ${error.message}`);
  return (data as ReminderRow[]).map(rowToReminder);
}

export async function createReminder(input: ReminderCreate): Promise<Reminder> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('reminders')
    .insert(reminderToRow(input))
    .select('*')
    .single();
  if (error) throw new Error(`[reminderService] 생성 실패: ${error.message}`);
  return rowToReminder(data as ReminderRow);
}

export async function updateReminder(id: string, input: ReminderUpdate): Promise<Reminder> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('reminders')
    .update(reminderToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[reminderService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new ReminderNotFoundError(`[reminderService] id=${id} 리마인더를 찾을 수 없습니다.`);
  }
  return rowToReminder(data as ReminderRow);
}

export async function deleteReminder(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('reminders').delete().eq('id', id);
  if (error) throw new Error(`[reminderService] 삭제 실패: ${error.message}`);
}
