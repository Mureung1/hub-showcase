import { getSupabaseClient } from '../lib/supabaseClient';
import type { Memo, MemoCreate, MemoUpdate } from '@shared/schemas';

type MemoRow = {
  id: string;
  content: string;
  raw_input: string;
  created_at: string;
};

function rowToMemo(row: MemoRow): Memo {
  return {
    id: row.id,
    content: row.content,
    rawInput: row.raw_input,
    createdAt: row.created_at,
  };
}

function memoToRow(input: MemoCreate | MemoUpdate) {
  const row: Record<string, unknown> = {};
  if (input.content !== undefined) row.content = input.content;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class MemoNotFoundError extends Error {}

export async function listMemos(): Promise<Memo[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('memos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`[memoService] 조회 실패: ${error.message}`);
  return (data as MemoRow[]).map(rowToMemo);
}

export async function createMemo(input: MemoCreate): Promise<Memo> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('memos').insert(memoToRow(input)).select('*').single();
  if (error) throw new Error(`[memoService] 생성 실패: ${error.message}`);
  return rowToMemo(data as MemoRow);
}

export async function updateMemo(id: string, input: MemoUpdate): Promise<Memo> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('memos')
    .update(memoToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[memoService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new MemoNotFoundError(`[memoService] id=${id} 메모를 찾을 수 없습니다.`);
  }
  return rowToMemo(data as MemoRow);
}

export async function deleteMemo(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('memos').delete().eq('id', id);
  if (error) throw new Error(`[memoService] 삭제 실패: ${error.message}`);
}
