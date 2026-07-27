import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/shared/api';

import type { PreparedImport } from '../model/import_types';

export type NotionFieldMapping = {
  dataSourceId: string;
  memoPropertyId: string | null;
  titlePropertyId: string | null;
  urlPropertyId: string;
};

export type NotionFieldMappingRequest = {
  dataSourceId: string;
  dataSourceName: string;
  fields: Array<{
    id: string;
    name: string;
    type: 'rich_text' | 'url';
  }>;
  suggestedUrlPropertyId: string;
};

export type NotionConnectionStatus = {
  connectionId: string;
  includePageUrls: boolean;
  jobId: string;
  jobStatus:
    'analyzing' | 'ready' | 'committing' | 'completed' | 'failed' | 'undone';
  status:
    | 'pending'
    | 'exchanging'
    | 'connected'
    | 'analyzing'
    | 'completed'
    | 'canceled'
    | 'failed';
  workspaceName: string | null;
};

export type NotionAnalyzeResult =
  | {
      candidateCount: number;
      mappingRequests: NotionFieldMappingRequest[];
      requestCount: number;
      status: 'mapping-required';
    }
  | {
      candidateCount: number;
      requestCount: number;
      status: 'analyzing';
    }
  | {
      candidateCount: number;
      prepared: PreparedImport;
      requestCount: number;
      status: 'ready';
    };

export type NotionFinishResult = {
  status: 'canceled' | 'cleanup-pending' | 'completed';
};

export type NotionImportApiFailureReason =
  | 'invalid-request'
  | 'not-found'
  | 'permission-denied'
  | 'provider-rate-limited'
  | 'reauthorize'
  | 'write-failed';

export class NotionImportApiError extends Error {
  readonly reason: NotionImportApiFailureReason;
  readonly retryAfterMs: number | null;
  readonly status: number;

  constructor(
    reason: NotionImportApiFailureReason,
    status: number,
    retryAfterMs: number | null
  ) {
    super('Notion 가져오기 요청을 완료하지 못했어요.');
    this.name = 'NotionImportApiError';
    this.reason = reason;
    this.retryAfterMs = retryAfterMs;
    this.status = status;
  }
}

export type NotionImportApi = {
  analyze(
    connectionId: string,
    mappings: NotionFieldMapping[],
    signal?: AbortSignal
  ): Promise<NotionAnalyzeResult>;
  cancel(
    connectionId: string,
    signal?: AbortSignal
  ): Promise<NotionFinishResult>;
  complete(
    connectionId: string,
    signal?: AbortSignal
  ): Promise<NotionFinishResult>;
  start(
    includePageUrls: boolean,
    returnMode: 'android' | 'web',
    signal?: AbortSignal
  ): Promise<{ authorizeUrl: string; connectionId: string }>;
  status(
    connectionId: string,
    signal?: AbortSignal
  ): Promise<NotionConnectionStatus>;
};

type CreateNotionImportApiOptions = {
  client?: Pick<SupabaseClient, 'auth'>;
  fetch?: typeof globalThis.fetch;
};

export function createNotionImportApi({
  client = getSupabaseClient(),
  fetch = globalThis.fetch,
}: CreateNotionImportApiOptions = {}): NotionImportApi {
  const request = async (
    path: string,
    {
      body,
      method = 'GET',
      signal,
    }: {
      body?: unknown;
      method?: 'GET' | 'POST';
      signal?: AbortSignal;
    } = {}
  ) => {
    const {
      data: { session },
      error,
    } = await client.auth.getSession();

    if (error || !session?.access_token) {
      throw new NotionImportApiError('permission-denied', 401, null);
    }

    const response = await fetch(path, {
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      method,
      signal,
    });
    const value = await readJson(response);

    if (!response.ok) {
      throw new NotionImportApiError(
        readFailureReason(value),
        response.status,
        readRetryAfter(response)
      );
    }

    if (!isRecord(value)) {
      throw new NotionImportApiError('write-failed', 503, null);
    }

    return value;
  };

  const finish = async (
    action: 'cancel' | 'complete',
    connectionId: string,
    signal?: AbortSignal
  ) => {
    const value = await request(
      `/api/imports/notion/${connectionId}/${action}`,
      { body: {}, method: 'POST', signal }
    );

    if (
      value.status !== 'canceled' &&
      value.status !== 'cleanup-pending' &&
      value.status !== 'completed'
    ) {
      throw new NotionImportApiError('write-failed', 503, null);
    }

    return {
      status: value.status as NotionFinishResult['status'],
    };
  };

  return {
    async analyze(connectionId, mappings, signal) {
      const value = await request(
        `/api/imports/notion/${connectionId}/analyze`,
        { body: { mappings }, method: 'POST', signal }
      );

      if (
        typeof value.candidateCount !== 'number' ||
        typeof value.requestCount !== 'number'
      ) {
        throw new NotionImportApiError('write-failed', 503, null);
      }
      if (
        value.status === 'mapping-required' &&
        Array.isArray(value.mappingRequests) &&
        value.mappingRequests.every(isNotionFieldMappingRequest)
      ) {
        return {
          candidateCount: value.candidateCount,
          mappingRequests: value.mappingRequests,
          requestCount: value.requestCount,
          status: value.status,
        };
      }
      if (value.status === 'analyzing') {
        return {
          candidateCount: value.candidateCount,
          requestCount: value.requestCount,
          status: value.status,
        };
      }
      if (value.status === 'ready' && isPreparedImport(value.prepared)) {
        return {
          candidateCount: value.candidateCount,
          prepared: value.prepared,
          requestCount: value.requestCount,
          status: value.status,
        };
      }
      throw new NotionImportApiError('write-failed', 503, null);
    },

    cancel(connectionId, signal) {
      return finish('cancel', connectionId, signal);
    },

    complete(connectionId, signal) {
      return finish('complete', connectionId, signal);
    },

    async start(includePageUrls, returnMode, signal) {
      const value = await request('/api/imports/notion/start', {
        body: { includePageUrls, returnMode },
        method: 'POST',
        signal,
      });

      if (
        typeof value.authorizeUrl !== 'string' ||
        typeof value.connectionId !== 'string'
      ) {
        throw new NotionImportApiError('write-failed', 503, null);
      }

      return {
        authorizeUrl: value.authorizeUrl,
        connectionId: value.connectionId,
      };
    },

    async status(connectionId, signal) {
      const value = await request(
        `/api/imports/notion/${connectionId}/status`,
        { signal }
      );

      if (
        typeof value.connectionId !== 'string' ||
        typeof value.includePageUrls !== 'boolean' ||
        typeof value.jobId !== 'string' ||
        !isNotionJobStatus(value.jobStatus) ||
        !isNotionConnectionStatus(value.status) ||
        !(
          value.workspaceName === null ||
          typeof value.workspaceName === 'string'
        )
      ) {
        throw new NotionImportApiError('write-failed', 503, null);
      }

      return value as NotionConnectionStatus;
    },
  };
}

function isNotionFieldMappingRequest(
  value: unknown
): value is NotionFieldMappingRequest {
  if (
    !isRecord(value) ||
    typeof value.dataSourceId !== 'string' ||
    typeof value.dataSourceName !== 'string' ||
    typeof value.suggestedUrlPropertyId !== 'string' ||
    !Array.isArray(value.fields) ||
    value.fields.length === 0
  ) {
    return false;
  }

  const fieldsAreValid = value.fields.every(
    (field) =>
      isRecord(field) &&
      typeof field.id === 'string' &&
      typeof field.name === 'string' &&
      (field.type === 'url' || field.type === 'rich_text')
  );

  return (
    fieldsAreValid &&
    value.fields.some(
      (field) => isRecord(field) && field.id === value.suggestedUrlPropertyId
    )
  );
}

function isNotionConnectionStatus(
  value: unknown
): value is NotionConnectionStatus['status'] {
  return (
    typeof value === 'string' &&
    [
      'pending',
      'exchanging',
      'connected',
      'analyzing',
      'completed',
      'canceled',
      'failed',
    ].includes(value)
  );
}

function isNotionJobStatus(
  value: unknown
): value is NotionConnectionStatus['jobStatus'] {
  return (
    typeof value === 'string' &&
    [
      'analyzing',
      'ready',
      'committing',
      'completed',
      'failed',
      'undone',
    ].includes(value)
  );
}

function readFailureReason(value: unknown): NotionImportApiFailureReason {
  if (
    isRecord(value) &&
    typeof value.reason === 'string' &&
    [
      'invalid-request',
      'not-found',
      'permission-denied',
      'provider-rate-limited',
      'reauthorize',
      'write-failed',
    ].includes(value.reason)
  ) {
    return value.reason as NotionImportApiFailureReason;
  }

  return 'write-failed';
}

function readRetryAfter(response: Response) {
  const value = response.headers.get('retry-after');

  return value && /^\d+$/u.test(value) ? Number(value) * 1000 : null;
}

async function readJson(response: Response) {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function isPreparedImport(value: unknown): value is PreparedImport {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    value.status === 'ready' &&
    Array.isArray(value.items) &&
    Array.isArray(value.collections) &&
    isRecord(value.summary)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
