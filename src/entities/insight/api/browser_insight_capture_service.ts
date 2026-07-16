import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/shared/api';

import { parseInsight } from '../model/parse_insight';
import type {
  InsightCaptureFailureReason,
  InsightCaptureResult,
  InsightCaptureService,
} from '../model/insight_capture';

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export function createBrowserInsightCaptureService(
  client: SupabaseClient = getSupabaseClient(),
  fetcher: Fetcher = fetch
): InsightCaptureService {
  return {
    async capture(request) {
      try {
        const { data, error } = await client.auth.getSession();

        if (error || !data.session) {
          return { ok: false, reason: 'permission-denied' };
        }

        const response = await fetcher('/api/insights/capture', {
          body: JSON.stringify(request),
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        if (response.status === 401) {
          return { ok: false, reason: 'permission-denied' };
        }

        const payload = await readJson(response);
        const result = parseCaptureResult(payload);

        if (result) {
          return result;
        }

        return { ok: false, reason: 'write-failed' };
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

function parseCaptureResult(value: unknown): InsightCaptureResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.ok === false && isCaptureFailureReason(value.reason)) {
    return { ok: false, reason: value.reason };
  }

  if (value.ok !== true || typeof value.created !== 'boolean') {
    return null;
  }

  const insight = parseInsight(value.insight);

  return insight ? { created: value.created, insight, ok: true } : null;
}

function isCaptureFailureReason(
  value: unknown
): value is InsightCaptureFailureReason {
  return (
    value === 'invalid-request' ||
    value === 'invalid-url' ||
    value === 'permission-denied' ||
    value === 'unsupported-protocol' ||
    value === 'write-failed'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
