import type { ItemType, Memo, Task } from '@shared/schemas';

type ApiErrorBody = { error: { code: string; message: string } };

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function updateTaskCompleted(id: string, completed: boolean): Promise<Task> {
  const res = await fetch(`/api/items/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function completeRoutine(id: string, completed: boolean): Promise<void> {
  const res = await fetch(`/api/items/routines/${id}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}

export async function deleteItem(type: ItemType, id: string): Promise<void> {
  const res = await fetch(`/api/items/${type}/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}

export async function updateMemoCompleted(id: string, completed: boolean): Promise<Memo> {
  const res = await fetch(`/api/items/memos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function getCompletedTasks(): Promise<Task[]> {
  const res = await fetch('/api/items/tasks?completed=true');
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function getCompletedMemos(): Promise<Memo[]> {
  const res = await fetch('/api/items/memos?completed=true');
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
