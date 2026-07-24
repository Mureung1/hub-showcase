import { getSupabaseClient } from '../lib/supabaseClient';
import type { Task, TaskCreate, TaskUpdate } from '@shared/schemas';

type TaskRow = {
  id: string;
  title: string;
  deadline: string;
  completed: boolean;
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

function taskToRow(input: TaskCreate | TaskUpdate) {
  const row: Record<string, unknown> = {};
  if (input.title !== undefined) row.title = input.title;
  if (input.deadline !== undefined) row.deadline = input.deadline;
  if ('completed' in input && input.completed !== undefined) row.completed = input.completed;
  if (input.rawInput !== undefined) row.raw_input = input.rawInput;
  return row;
}

export class TaskNotFoundError extends Error {}

export async function listTasks(completed?: boolean): Promise<Task[]> {
  const client = getSupabaseClient();
  let query = client.from('tasks').select('*').order('deadline', { ascending: true });
  if (completed !== undefined) query = query.eq('completed', completed);
  const { data, error } = await query;
  if (error) throw new Error(`[taskService] 조회 실패: ${error.message}`);
  return (data as TaskRow[]).map(rowToTask);
}

export async function createTask(input: TaskCreate): Promise<Task> {
  const client = getSupabaseClient();
  const { data, error } = await client.from('tasks').insert(taskToRow(input)).select('*').single();
  if (error) throw new Error(`[taskService] 생성 실패: ${error.message}`);
  return rowToTask(data as TaskRow);
}

export async function updateTask(id: string, input: TaskUpdate): Promise<Task> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('tasks')
    .update(taskToRow(input))
    .eq('id', id)
    .select('*')
    .maybeSingle();
  if (error) throw new Error(`[taskService] 수정 실패: ${error.message}`);
  if (!data) {
    throw new TaskNotFoundError(`[taskService] id=${id} 과제를 찾을 수 없습니다.`);
  }
  return rowToTask(data as TaskRow);
}

export async function deleteTask(id: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.from('tasks').delete().eq('id', id);
  if (error) throw new Error(`[taskService] 삭제 실패: ${error.message}`);
}
