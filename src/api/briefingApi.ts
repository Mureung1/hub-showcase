import type { Briefing } from '@shared/schemas';
import { apiFetch } from './http';

export async function getBriefing(date?: string): Promise<Briefing> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await apiFetch(`/api/briefing${query}`);
  return res.json();
}
