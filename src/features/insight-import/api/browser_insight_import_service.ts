import type { SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseClient } from '@/shared/api';

import { IMPORT_LIMITS } from '../model/import_limits';
import type {
  ImportServiceFailureReason,
  ImportServiceResult,
  InsightImportService,
  PrepareImportInput,
} from '../model/insight_import_service';
import {
  IMPORT_ADAPTER_KEYS,
  type AnalyzedImportItem,
  type ImportAdapterKey,
  type ImportCommitResult,
  type ImportHistoryEntry,
  type ImportIssuePage,
  type ImportSummary,
  type ImportUndoResult,
  type ImportWarningCode,
  type PreparedImport,
  type PreparedImportItem,
} from '../model/import_types';

const HISTORY_COLUMNS = [
  'id',
  'adapter_key',
  'status',
  'total_count',
  'new_count',
  'duplicate_count',
  'input_duplicate_count',
  'excluded_count',
  'created_count',
  'preserved_count',
  'already_deleted_count',
  'completed_at',
  'undo_expires_at',
].join(',');

const ISSUE_COLUMNS = [
  'candidate_id',
  'captured_at_candidate',
  'collection_path',
  'explicit_memo_candidate',
  'original_url',
  'source_location',
  'title_candidate',
  'warnings',
  'classification',
  'domain',
  'exclusion_code',
  'normalized_url',
  'ordinal',
].join(',');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;
const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{64}$/u;
const PREPARED_CLASSIFICATIONS = [
  'new',
  'existing_duplicate',
  'input_duplicate',
  'excluded',
] as const;
const ISSUE_CLASSIFICATIONS = ['excluded', 'input_duplicate'] as const;
const WARNING_CODES = [
  'missing-title',
  'trimmed-title',
  'trimmed-memo',
  'ambiguous-field',
] as const;
const EXCLUSION_CODES = [
  'invalid-url',
  'unsupported-protocol',
  'private-address',
  'limit-exceeded',
] as const;

export function createBrowserInsightImportService(
  client: SupabaseClient = getSupabaseClient()
): InsightImportService {
  return {
    async commit(jobId, mappings) {
      return runCommitRpc(client, 'commit_insight_import', jobId, mappings);
    },
    async deleteRecord(jobId) {
      if (!isUuid(jobId)) {
        return failure('invalid-request');
      }

      try {
        const { data, error } = await client.rpc(
          'delete_insight_import_record',
          { p_job_id: jobId }
        );

        if (error) {
          return failure(mapPostgresError(error, 'write-failed'));
        }

        return data === null
          ? { ok: true, value: undefined }
          : failure('read-failed');
      } catch {
        return failure('write-failed');
      }
    },
    async listHistory() {
      try {
        const { data, error } = await client
          .from('insight_import_jobs')
          .select(HISTORY_COLUMNS)
          .in('status', ['completed', 'undone'])
          .order('completed_at', { ascending: false })
          .limit(20);

        if (error) {
          return failure(mapPostgresError(error, 'read-failed'));
        }

        const history = parseHistory(data);

        return history ? { ok: true, value: history } : failure('read-failed');
      } catch {
        return failure('read-failed');
      }
    },
    async listIssues(jobId, afterOrdinal) {
      if (
        !isUuid(jobId) ||
        (afterOrdinal !== null &&
          (!isNonNegativeInteger(afterOrdinal) || afterOrdinal === 0))
      ) {
        return failure('invalid-request');
      }

      try {
        let query = client
          .from('insight_import_items')
          .select(ISSUE_COLUMNS)
          .eq('job_id', jobId)
          .in('classification', [...ISSUE_CLASSIFICATIONS]);

        if (afterOrdinal !== null) {
          query = query.gt('ordinal', afterOrdinal);
        }

        const { data, error } = await query
          .order('ordinal', { ascending: true })
          .limit(51);

        if (error) {
          return failure(mapPostgresError(error, 'read-failed'));
        }

        const issuePage = parseIssuePage(data, afterOrdinal);

        return issuePage
          ? { ok: true, value: issuePage }
          : failure('read-failed');
      } catch {
        return failure('read-failed');
      }
    },
    async prepare(input) {
      if (!isPrepareInput(input)) {
        return failure('invalid-request');
      }

      return runParsedRpc(
        client,
        'prepare_insight_import',
        {
          p_adapter_key: input.adapterKey,
          p_idempotency_key: input.idempotencyKey,
          p_input_kind: input.inputKind,
          p_items: input.items.map(toPrepareItem),
        },
        parsePreparedImport
      );
    },
    async retry(jobId, mappings) {
      return runCommitRpc(client, 'retry_insight_import', jobId, mappings);
    },
    async undo(jobId) {
      if (!isUuid(jobId)) {
        return failure('invalid-request');
      }

      try {
        const { data, error } = await client.rpc('undo_insight_import', {
          p_job_id: jobId,
        });

        if (error) {
          return failure(mapPostgresError(error, 'write-failed'));
        }

        if (
          isRecord(data) &&
          data.ok === false &&
          data.reason === 'undo-expired'
        ) {
          return failure('undo-expired');
        }

        const result = parseUndoResult(data);

        return result ? { ok: true, value: result } : failure('read-failed');
      } catch {
        return failure('write-failed');
      }
    },
  };
}

async function runCommitRpc(
  client: SupabaseClient,
  functionName: 'commit_insight_import' | 'retry_insight_import',
  jobId: string,
  mappings: Parameters<InsightImportService['commit']>[1]
): Promise<ImportServiceResult<ImportCommitResult>> {
  if (!isUuid(jobId)) {
    return failure('invalid-request');
  }

  try {
    const { data, error } = await client.rpc(functionName, {
      p_collection_mappings: mappings,
      p_job_id: jobId,
    });

    if (error) {
      return failure(mapPostgresError(error, 'write-failed'));
    }

    if (
      isRecord(data) &&
      data.ok === false &&
      data.reason === 'commit-failed'
    ) {
      return failure('write-failed');
    }

    const result = parseCommitResult(data);

    return result ? { ok: true, value: result } : failure('read-failed');
  } catch {
    return failure('write-failed');
  }
}

async function runParsedRpc<T>(
  client: SupabaseClient,
  functionName: string,
  parameters: Record<string, unknown>,
  parser: (value: unknown) => T | null
): Promise<ImportServiceResult<T>> {
  try {
    const { data, error } = await client.rpc(functionName, parameters);

    if (error) {
      return failure(mapPostgresError(error, 'write-failed'));
    }

    const value = parser(data);

    return value ? { ok: true, value } : failure('read-failed');
  } catch {
    return failure('write-failed');
  }
}

function isPrepareInput(input: PrepareImportInput) {
  return (
    IDEMPOTENCY_KEY_PATTERN.test(input.idempotencyKey) &&
    input.items.length <= IMPORT_LIMITS.candidateCount
  );
}

function toPrepareItem(item: AnalyzedImportItem) {
  return {
    candidateId: item.candidateId,
    capturedAtCandidate: item.capturedAtCandidate,
    collectionPath: item.collectionPath,
    domain: item.domain,
    exclusionCode: item.exclusionCode,
    explicitMemoCandidate: item.explicitMemoCandidate,
    normalizedUrl: item.normalizedUrl,
    originalUrl: item.originalUrl,
    sourceLocation: item.sourceLocation,
    titleCandidate: item.titleCandidate,
    warnings: item.warnings,
  };
}

function parsePreparedImport(value: unknown): PreparedImport | null {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isImportAdapterKey(value.adapterKey) ||
    value.status !== 'ready' ||
    !isIsoTimestamp(value.expiresAt) ||
    !Array.isArray(value.collections) ||
    !Array.isArray(value.items)
  ) {
    return null;
  }

  const collections = value.collections.map(parseCollectionPath);
  const items = value.items.map(parsePreparedItem);
  const summary = parseSummary(value.summary);

  if (
    collections.some((path) => path === null) ||
    items.some((item) => item === null) ||
    !summary
  ) {
    return null;
  }

  return {
    adapterKey: value.adapterKey,
    collections: collections as string[][],
    expiresAt: value.expiresAt,
    id: value.id,
    items: items as PreparedImportItem[],
    status: 'ready',
    summary,
  };
}

function parsePreparedItem(value: unknown): PreparedImportItem | null {
  if (
    !isRecord(value) ||
    !isNonEmptyText(value.candidateId) ||
    !isNullableIsoTimestamp(value.capturedAtCandidate) ||
    !isTextWithin(value.originalUrl, IMPORT_LIMITS.urlLength, true) ||
    !isTextWithin(
      value.sourceLocation,
      IMPORT_LIMITS.sourceLocationLength,
      true
    ) ||
    !isNullableTextWithin(
      value.explicitMemoCandidate,
      IMPORT_LIMITS.memoLength
    ) ||
    !isNullableTextWithin(value.titleCandidate, IMPORT_LIMITS.titleLength) ||
    !isNullableTextWithin(value.normalizedUrl, IMPORT_LIMITS.urlLength) ||
    !isNullableText(value.domain) ||
    !isOneOf(value.classification, PREPARED_CLASSIFICATIONS) ||
    !Array.isArray(value.warnings)
  ) {
    return null;
  }

  const collectionPath = parseCollectionPath(value.collectionPath);
  const warnings = value.warnings.every((warning) =>
    isOneOf(warning, WARNING_CODES)
  )
    ? (value.warnings as ImportWarningCode[])
    : null;
  const exclusionCode = isNullableOneOf(value.exclusionCode, EXCLUSION_CODES)
    ? value.exclusionCode
    : undefined;

  if (
    !collectionPath ||
    !warnings ||
    exclusionCode === undefined ||
    (value.classification === 'excluded') !== (exclusionCode !== null) ||
    (exclusionCode === null &&
      !isTextWithin(value.normalizedUrl, IMPORT_LIMITS.urlLength, true))
  ) {
    return null;
  }

  return {
    candidateId: value.candidateId,
    capturedAtCandidate: value.capturedAtCandidate,
    classification: value.classification,
    collectionPath,
    domain: value.domain,
    exclusionCode,
    explicitMemoCandidate: value.explicitMemoCandidate,
    normalizedUrl: value.normalizedUrl,
    originalUrl: value.originalUrl,
    sourceLocation: value.sourceLocation,
    titleCandidate: value.titleCandidate,
    warnings,
  };
}

function parseCommitResult(value: unknown): ImportCommitResult | null {
  if (
    !isRecord(value) ||
    !isUuid(value.jobId) ||
    !isNonNegativeInteger(value.createdCount) ||
    !isNonNegativeInteger(value.duplicateCount) ||
    !isNonNegativeInteger(value.excludedCount)
  ) {
    return null;
  }

  return {
    createdCount: value.createdCount,
    duplicateCount: value.duplicateCount,
    excludedCount: value.excludedCount,
    jobId: value.jobId,
  };
}

function parseUndoResult(value: unknown): ImportUndoResult | null {
  if (
    !isRecord(value) ||
    !isUuid(value.jobId) ||
    !isNonNegativeInteger(value.alreadyDeletedCount) ||
    !isNonNegativeInteger(value.deletedCount) ||
    !isNonNegativeInteger(value.preservedCount)
  ) {
    return null;
  }

  return {
    alreadyDeletedCount: value.alreadyDeletedCount,
    deletedCount: value.deletedCount,
    jobId: value.jobId,
    preservedCount: value.preservedCount,
  };
}

function parseHistory(value: unknown): ImportHistoryEntry[] | null {
  if (!Array.isArray(value) || value.length > 20) {
    return null;
  }

  const history = value.map(parseHistoryEntry);

  return history.some((entry) => entry === null)
    ? null
    : (history as ImportHistoryEntry[]);
}

function parseHistoryEntry(value: unknown): ImportHistoryEntry | null {
  if (
    !isRecord(value) ||
    !isUuid(value.id) ||
    !isImportAdapterKey(value.adapter_key) ||
    (value.status !== 'completed' && value.status !== 'undone') ||
    !isIsoTimestamp(value.completed_at) ||
    (value.undo_expires_at !== null && !isIsoTimestamp(value.undo_expires_at))
  ) {
    return null;
  }

  const summary = parseSummary({
    createdCount: value.created_count,
    duplicateCount: value.duplicate_count,
    excludedCount: value.excluded_count,
    inputDuplicateCount: value.input_duplicate_count,
    newCount: value.new_count,
    totalCount: value.total_count,
  });

  if (
    !summary ||
    !isNonNegativeInteger(value.preserved_count) ||
    !isNonNegativeInteger(value.already_deleted_count)
  ) {
    return null;
  }

  const deletedCount =
    summary.createdCount - value.preserved_count - value.already_deleted_count;

  if (deletedCount < 0) {
    return null;
  }

  return {
    adapterKey: value.adapter_key,
    completedAt: value.completed_at,
    id: value.id,
    status: value.status,
    summary,
    undoExpiresAt: value.undo_expires_at,
    undoResult:
      value.status === 'undone'
        ? {
            alreadyDeletedCount: value.already_deleted_count,
            deletedCount,
            jobId: value.id,
            preservedCount: value.preserved_count,
          }
        : null,
  };
}

function parseIssuePage(
  value: unknown,
  afterOrdinal: number | null
): ImportIssuePage | null {
  if (!Array.isArray(value) || value.length > 51) {
    return null;
  }

  const parsedRows = value.map(parseIssueRow);

  if (
    parsedRows.some((row) => row === null) ||
    !hasAscendingOrdinals(
      parsedRows as Array<{ item: PreparedImportItem; ordinal: number }>,
      afterOrdinal
    )
  ) {
    return null;
  }

  const rows = parsedRows as Array<{
    item: PreparedImportItem;
    ordinal: number;
  }>;
  const visibleRows = rows.slice(0, 50);

  return {
    items: visibleRows.map(({ item }) => item),
    nextOrdinal:
      rows.length === 51 ? (visibleRows.at(-1)?.ordinal ?? null) : null,
  };
}

function parseIssueRow(
  value: unknown
): { item: PreparedImportItem; ordinal: number } | null {
  if (!isRecord(value) || !isPositiveInteger(value.ordinal)) {
    return null;
  }

  const item = parsePreparedItem({
    candidateId: value.candidate_id,
    capturedAtCandidate: value.captured_at_candidate,
    classification: value.classification,
    collectionPath: value.collection_path,
    domain: value.domain,
    exclusionCode: value.exclusion_code,
    explicitMemoCandidate: value.explicit_memo_candidate,
    normalizedUrl: value.normalized_url,
    originalUrl: value.original_url,
    sourceLocation: value.source_location,
    titleCandidate: value.title_candidate,
    warnings: value.warnings,
  });

  return item && isOneOf(item.classification, ISSUE_CLASSIFICATIONS)
    ? { item, ordinal: value.ordinal }
    : null;
}

function parseSummary(value: unknown): ImportSummary | null {
  if (
    !isRecord(value) ||
    !isNonNegativeInteger(value.createdCount) ||
    !isNonNegativeInteger(value.duplicateCount) ||
    !isNonNegativeInteger(value.excludedCount) ||
    !isNonNegativeInteger(value.inputDuplicateCount) ||
    !isNonNegativeInteger(value.newCount) ||
    !isNonNegativeInteger(value.totalCount)
  ) {
    return null;
  }

  return {
    createdCount: value.createdCount,
    duplicateCount: value.duplicateCount,
    excludedCount: value.excludedCount,
    inputDuplicateCount: value.inputDuplicateCount,
    newCount: value.newCount,
    totalCount: value.totalCount,
  };
}

function parseCollectionPath(value: unknown): string[] | null {
  return Array.isArray(value) &&
    value.length <= IMPORT_LIMITS.collectionDepth &&
    value.every((segment) => typeof segment === 'string')
    ? value
    : null;
}

function hasAscendingOrdinals(
  rows: Array<{ ordinal: number }>,
  afterOrdinal: number | null
) {
  let previousOrdinal = afterOrdinal ?? 0;

  for (const row of rows) {
    if (row.ordinal <= previousOrdinal) {
      return false;
    }
    previousOrdinal = row.ordinal;
  }

  return true;
}

function mapPostgresError(
  error: unknown,
  fallback: ImportServiceFailureReason
): ImportServiceFailureReason {
  const code =
    isRecord(error) && typeof error.code === 'string' ? error.code : null;

  if (code === '42501') {
    return 'permission-denied';
  }

  if (code === '22023') {
    return 'invalid-request';
  }

  return fallback;
}

function failure(reason: ImportServiceFailureReason): {
  ok: false;
  reason: ImportServiceFailureReason;
} {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isImportAdapterKey(value: unknown): value is ImportAdapterKey {
  return isOneOf(value, IMPORT_ADAPTER_KEYS);
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    ISO_TIMESTAMP_PATTERN.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isNullableIsoTimestamp(value: unknown): value is string | null {
  return value === null || isIsoTimestamp(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

function isNonEmptyText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextWithin(
  value: unknown,
  maximumLength: number,
  requireNonEmpty = false
): value is string {
  return (
    typeof value === 'string' &&
    (!requireNonEmpty || value.trim().length > 0) &&
    [...value].length <= maximumLength
  );
}

function isNullableText(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableTextWithin(
  value: unknown,
  maximumLength: number
): value is string | null {
  return value === null || isTextWithin(value, maximumLength);
}

function isNullableOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] | null {
  return value === null || isOneOf(value, allowed);
}

function isOneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T
): value is T[number] {
  return typeof value === 'string' && allowed.includes(value);
}
