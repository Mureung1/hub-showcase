import type { Briefing } from '@shared/schemas';

type ApiErrorBody = { error: { code: string; message: string } };

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getBriefing(date?: string): Promise<Briefing> {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  const res = await fetch(`/api/briefing${query}`);
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
