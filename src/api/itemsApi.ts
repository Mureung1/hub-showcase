import type { ItemType, Memo, Task } from '@shared/schemas';
import { apiFetch } from './http';

export async function updateTaskCompleted(id: string, completed: boolean): Promise<Task> {
  const res = await apiFetch(`/api/items/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  return res.json();
}

export async function completeRoutine(id: string, completed: boolean): Promise<void> {
  await apiFetch(`/api/items/routines/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
}

export async function deleteItem(type: ItemType, id: string): Promise<void> {
  await apiFetch(`/api/items/${type}/${id}`, { method: 'DELETE' });
}

export async function updateMemoCompleted(id: string, completed: boolean): Promise<Memo> {
  const res = await apiFetch(`/api/items/memos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  return res.json();
}

export async function getCompletedTasks(): Promise<Task[]> {
  const res = await apiFetch('/api/items/tasks?completed=true');
  return res.json();
}

export async function getCompletedMemos(): Promise<Memo[]> {
  const res = await apiFetch('/api/items/memos?completed=true');
  return res.json();
}
