import type { Task } from '@shared/schemas';

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
