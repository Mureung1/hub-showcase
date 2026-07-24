import type { ParseResult, ResolvedParseResult, ParseCandidate } from '@shared/schemas';

type ApiErrorBody = { error: { code: string; message: string } };

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ApiErrorBody;
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function parseText(message: string): Promise<ParseResult> {
  const res = await fetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function resolveCandidate(
  candidate: ParseCandidate,
  rawInput: string,
): Promise<ResolvedParseResult> {
  const res = await fetch('/api/parse/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: candidate.intent,
      type: candidate.type,
      fields: candidate.fields,
      rawInput,
    }),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
