import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/shared/api';
import { getInsightApiOrigin } from '@/shared/capacitor';

import type {
  RetrieveFailureReason,
  RetrieveResult,
  RetrieveService,
} from '../model/retrieve';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export function createBrowserRetrieveService(
  client: SupabaseClient = getSupabaseClient(),
  fetcher: Fetcher = fetch,
  apiOrigin: string = getInsightApiOrigin()
): RetrieveService {
  return {
    async retrieve(query) {
      try {
        const { data, error } = await client.auth.getSession();

        if (error || !data.session) {
          return { ok: false, reason: 'permission-denied' };
        }

        const response = await fetcher(`${apiOrigin}/api/insights/retrieve`, {
          body: JSON.stringify({ query }),
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        if (response.status === 401) {
          return { ok: false, reason: 'permission-denied' };
        }

        return (
          parseRetrieveResult(await readJson(response)) ?? {
            ok: false,
            reason: 'retrieve-failed',
          }
        );
      } catch {
        return { ok: false, reason: 'retrieve-failed' };
      }
    },
  };
}

async function readJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseRetrieveResult(value: unknown): RetrieveResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.ok === false && isRetrieveFailureReason(value.reason)) {
    return { ok: false, reason: value.reason };
  }

  if (
    value.ok !== true ||
    !Array.isArray(value.insightIds) ||
    !value.insightIds.every((id) => typeof id === 'string') ||
    typeof value.pendingCount !== 'number' ||
    !Number.isInteger(value.pendingCount) ||
    value.pendingCount < 0
  ) {
    return null;
  }

  return {
    insightIds: value.insightIds,
    ok: true,
    pendingCount: value.pendingCount,
  };
}

function isRetrieveFailureReason(
  value: unknown
): value is RetrieveFailureReason {
  return (
    value === 'invalid-request' ||
    value === 'permission-denied' ||
    value === 'retrieve-failed' ||
    value === 'usage-limit-reached'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
