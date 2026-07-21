import type { InsightCaptureRequest } from '../../../src/entities/insight/model/insight_capture';

export type ExtensionCaptureResult =
  | {
      created: boolean;
      insight: { id: string; title: string };
      ok: true;
    }
  | {
      ok: false;
      reason:
        | 'invalid-url'
        | 'permission-denied'
        | 'unsupported-protocol'
        | 'write-failed';
    };

export type ExtensionMemoResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'not-found' | 'permission-denied' | 'write-failed';
    };

export type ExtensionApi = {
  capture(
    accessToken: string,
    request: InsightCaptureRequest
  ): Promise<ExtensionCaptureResult>;
  saveMemo(
    accessToken: string,
    insightId: string,
    memo: string
  ): Promise<ExtensionMemoResult>;
};

export function createExtensionApi({
  apiOrigin,
  fetcher = fetch,
}: {
  apiOrigin: string;
  fetcher?: typeof fetch;
}): ExtensionApi {
  return {
    async capture(accessToken, request) {
      const result = await requestJson(
        fetcher,
        `${apiOrigin}/api/insights/capture`,
        accessToken,
        'POST',
        request
      );

      return parseCaptureResult(result);
    },
    async saveMemo(accessToken, insightId, memo) {
      const result = await requestJson(
        fetcher,
        `${apiOrigin}/api/insights/${encodeURIComponent(insightId)}/memo`,
        accessToken,
        'PATCH',
        { memo }
      );

      return parseMemoResult(result);
    },
  };
}

async function requestJson(
  fetcher: typeof fetch,
  url: string,
  accessToken: string,
  method: 'PATCH' | 'POST',
  body: unknown
) {
  try {
    const response = await fetcher(url, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method,
    });

    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function parseCaptureResult(value: unknown): ExtensionCaptureResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, reason: 'write-failed' };
  }

  if (!value.ok) {
    return {
      ok: false,
      reason: isCaptureFailureReason(value.reason)
        ? value.reason
        : 'write-failed',
    };
  }

  if (
    typeof value.created !== 'boolean' ||
    !isRecord(value.insight) ||
    typeof value.insight.id !== 'string' ||
    typeof value.insight.title !== 'string'
  ) {
    return { ok: false, reason: 'write-failed' };
  }

  return {
    created: value.created,
    insight: { id: value.insight.id, title: value.insight.title },
    ok: true,
  };
}

function parseMemoResult(value: unknown): ExtensionMemoResult {
  if (!isRecord(value) || typeof value.ok !== 'boolean') {
    return { ok: false, reason: 'write-failed' };
  }

  if (value.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: isMemoFailureReason(value.reason) ? value.reason : 'write-failed',
  };
}

function isCaptureFailureReason(
  value: unknown
): value is Exclude<ExtensionCaptureResult, { ok: true }>['reason'] {
  return (
    value === 'invalid-url' ||
    value === 'permission-denied' ||
    value === 'unsupported-protocol' ||
    value === 'write-failed'
  );
}

function isMemoFailureReason(
  value: unknown
): value is Exclude<ExtensionMemoResult, { ok: true }>['reason'] {
  return (
    value === 'not-found' ||
    value === 'permission-denied' ||
    value === 'write-failed'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
