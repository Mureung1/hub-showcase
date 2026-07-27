import type { Schedule, ScheduleCreate, ScheduleUpdate } from '@shared/schemas';
import { apiFetch } from './http';

export async function getSchedules(date?: string): Promise<Schedule[]> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await apiFetch(`/api/items/schedules${query}`);
  return res.json();
}

export async function createSchedule(input: ScheduleCreate): Promise<Schedule> {
  const res = await apiFetch('/api/items/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function updateSchedule(id: string, input: ScheduleUpdate): Promise<Schedule> {
  const res = await apiFetch(`/api/items/schedules/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiFetch(`/api/items/schedules/${id}`, { method: 'DELETE' });
}
