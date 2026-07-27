import type { ParseResult, ResolvedParseResult, ParseCandidate } from '@shared/schemas';
import { apiFetch } from './http';

export async function parseText(message: string): Promise<ParseResult> {
  const res = await apiFetch('/api/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  return res.json();
}

export async function resolveCandidate(
  candidate: ParseCandidate,
  rawInput: string,
): Promise<ResolvedParseResult> {
  const res = await apiFetch('/api/parse/resolve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      intent: candidate.intent,
      type: candidate.type,
      fields: candidate.fields,
      rawInput,
    }),
  });
  return res.json();
}
