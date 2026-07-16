import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@shared/schemas';

type ApiErrorBody = { error: { code: string; message: string } };

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getSchedules(date?: string): Promise<Schedule[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`/api/items/schedules${query}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function createSchedule(input: ScheduleCreate): Promise<Schedule> {
  const res = await fetch('/api/items/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function updateSchedule(id: string, input: ScheduleUpdate): Promise<Schedule> {
  const res = await fetch(`/api/items/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/items/schedules/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}
