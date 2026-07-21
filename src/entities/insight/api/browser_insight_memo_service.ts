import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/shared/api';
import { getInsightApiOrigin } from '@/shared/capacitor';

import type { InsightMutationResult } from '../model/insight';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export type InsightMemoService = {
  updateMemo(insightId: string, memo: string): Promise<InsightMutationResult>;
};

const MAX_MEMO_LENGTH = 200;

function isSingleLineMemo(value: string) {
  return !/[\r\n]/u.test(value) && [...value].length <= MAX_MEMO_LENGTH;
}

export function createBrowserInsightMemoService(
  client: SupabaseClient = getSupabaseClient(),
  fetcher: Fetcher = fetch,
  apiOrigin: string = getInsightApiOrigin()
): InsightMemoService {
  return {
    async updateMemo(insightId, memo) {
      if (!isSingleLineMemo(memo)) {
        return { ok: false, reason: 'write-failed' };
      }

      try {
        const { data, error } = await client.auth.getSession();

        if (error || !data.session) {
          return { ok: false, reason: 'permission-denied' };
        }

        const response = await fetcher(
          `${apiOrigin}/api/insights/${encodeURIComponent(insightId)}/memo`,
          {
            body: JSON.stringify({ memo }),
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
              'Content-Type': 'application/json',
            },
            method: 'PATCH',
          }
        );

        if (response.status === 401 || response.status === 403) {
          return { ok: false, reason: 'permission-denied' };
        }

        if (response.status === 404) {
          return { ok: false, reason: 'not-found' };
        }

        if (response.status !== 200) {
          return { ok: false, reason: 'write-failed' };
        }

        const payload = await readJson(response);
        return isSuccessfulResponse(payload)
          ? { ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
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

function isSuccessfulResponse(value: unknown) {
  return isRecord(value) && value.ok === true;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
