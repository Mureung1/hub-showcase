import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  RETRIEVE_EMBEDDING_MODEL,
  RETRIEVE_MAX_TOKENS_PER_EMBEDDING,
  RETRIEVE_PROJECTION_VERSION,
} from '../../server/retrieve/retrieve_embedding.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;
const BACKFILL_RESERVATION_TTL = '7 days';
const BATCH_NAME_PATTERN = /^batches\/[A-Za-z0-9_-]+$/u;
const SOURCE_HASH_PATTERN = /^[0-9a-f]{64}$/u;
const STATE_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'state');

export const MAX_BACKFILL_DOCUMENTS = 1_000;

export type BackfillDocument = {
  insightId: string;
  memo: string | null;
  sourceHash: string;
  title: string;
  userId: string;
};

export type BackfillManifest = {
  batchName: string;
  createdAt: string;
  documents: Array<{
    insightId: string;
    modelId: string;
    projectionVersion: number;
    sourceHash: string;
    userId: string;
  }>;
  reservationId: string;
  schemaVersion: 1;
};

export function createBackfillAdminClient(
  environment: Readonly<Record<string, string | undefined>>
) {
  const url = requireEnvironmentValue(environment, 'VITE_SUPABASE_URL');
  const serviceRoleKey = requireEnvironmentValue(
    environment,
    'SUPABASE_SERVICE_ROLE_KEY'
  );

  return createClient(url, serviceRoleKey, {
    auth: SERVER_AUTH_OPTIONS,
  });
}

export function readGeminiApiKey(
  environment: Readonly<Record<string, string | undefined>>
) {
  return requireEnvironmentValue(environment, 'GEMINI_API_KEY');
}

export async function countPendingDocuments(client: SupabaseClient) {
  const { count, error } = await client
    .from('insight_embedding_jobs')
    .select('insight_id', { count: 'exact', head: true })
    .eq('model_id', RETRIEVE_EMBEDDING_MODEL)
    .eq('projection_version', RETRIEVE_PROJECTION_VERSION);

  if (error || count === null || !Number.isInteger(count) || count < 0) {
    throw new Error('꺼내보기 기존 데이터 변환 대상을 세지 못했습니다.');
  }

  return count;
}

export async function listPendingDocuments(client: SupabaseClient) {
  const { data, error } = await client
    .from('insight_embedding_jobs')
    .select(
      'insight_id,user_id,source_hash,updated_at,insights!inner(title,memo)'
    )
    .eq('model_id', RETRIEVE_EMBEDDING_MODEL)
    .eq('projection_version', RETRIEVE_PROJECTION_VERSION)
    .order('updated_at')
    .order('insight_id')
    .limit(MAX_BACKFILL_DOCUMENTS);

  if (error || !Array.isArray(data)) {
    throw new Error('꺼내보기 기존 데이터 변환 대상을 읽지 못했습니다.');
  }

  return data.map(parseBackfillDocument);
}

export async function reserveBatchUsage(
  client: SupabaseClient,
  documentCount: number
) {
  const { data, error } = await client.rpc('reserve_embedding_usage', {
    requested_tokens: documentCount * RETRIEVE_MAX_TOKENS_PER_EMBEDDING,
    requested_ttl: BACKFILL_RESERVATION_TTL,
  });

  if (error) {
    throw new Error('꺼내보기 변환 비용 한도를 확인하지 못했습니다.');
  }

  if (data === null) {
    throw new Error(
      '월간 임베딩 사용 한도를 넘을 수 있어 배치를 제출하지 않았습니다.'
    );
  }

  if (typeof data !== 'string') {
    throw new Error('꺼내보기 변환 비용 예약 결과가 올바르지 않습니다.');
  }

  return data;
}

export async function reconcileBatchUsage(
  client: SupabaseClient,
  input:
    | {
        promptTokens: number;
        reservationId: string;
        settlement: 'actual';
      }
    | {
        reservationId: string;
        settlement: 'reserved-maximum';
      }
) {
  const { data, error } = await client.rpc('reconcile_embedding_usage', {
    actual_prompt_tokens:
      input.settlement === 'actual' ? input.promptTokens : null,
    requested_reservation_id: input.reservationId,
    settlement: input.settlement,
  });

  if (error || data !== true) {
    throw new Error('꺼내보기 변환 비용을 정산하지 못했습니다.');
  }
}

export async function completeBackfillDocument(
  client: SupabaseClient,
  input: {
    insightId: string;
    sourceHash: string;
    userId: string;
    vector: number[];
  }
) {
  const { data, error } = await client.rpc('complete_insight_embedding_job', {
    requested_embedding: `[${input.vector.join(',')}]`,
    requested_insight_id: input.insightId,
    requested_model_id: RETRIEVE_EMBEDDING_MODEL,
    requested_projection_version: RETRIEVE_PROJECTION_VERSION,
    requested_source_hash: input.sourceHash,
    requested_user_id: input.userId,
  });

  if (error) {
    throw new Error('꺼내보기 기존 데이터 변환 결과를 저장하지 못했습니다.');
  }

  return data === true;
}

export async function writeBackfillManifest(manifest: BackfillManifest) {
  const path = getManifestPath(manifest.batchName);

  await mkdir(STATE_DIRECTORY, { recursive: true });
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    flag: 'wx',
  });
}

export async function readBackfillManifest(
  batchName: string
): Promise<BackfillManifest> {
  let value: unknown;

  try {
    value = JSON.parse(
      await readFile(getManifestPath(batchName), 'utf8')
    ) as unknown;
  } catch {
    throw new Error(
      '배치 제출 기록을 찾지 못했습니다. 제출한 환경에서 다시 실행해 주세요.'
    );
  }

  return parseManifest(value, batchName);
}

export async function removeBackfillManifest(batchName: string) {
  await unlink(getManifestPath(batchName));
}

export function assertBatchName(value: string) {
  if (!BATCH_NAME_PATTERN.test(value)) {
    throw new Error('배치 이름은 batches/배치-ID 형식이어야 합니다.');
  }

  return value;
}

function getManifestPath(batchName: string) {
  const [, identifier] = assertBatchName(batchName).split('/');

  return join(STATE_DIRECTORY, `${identifier}.json`);
}

function parseBackfillDocument(value: unknown): BackfillDocument {
  if (!isRecord(value)) {
    throw new Error('꺼내보기 기존 데이터 변환 대상이 올바르지 않습니다.');
  }

  const insight = Array.isArray(value.insights)
    ? value.insights[0]
    : value.insights;

  if (
    typeof value.insight_id !== 'string' ||
    typeof value.user_id !== 'string' ||
    typeof value.source_hash !== 'string' ||
    !SOURCE_HASH_PATTERN.test(value.source_hash) ||
    !isRecord(insight) ||
    typeof insight.title !== 'string' ||
    (insight.memo !== null && typeof insight.memo !== 'string')
  ) {
    throw new Error('꺼내보기 기존 데이터 변환 대상이 올바르지 않습니다.');
  }

  return {
    insightId: value.insight_id,
    memo: insight.memo,
    sourceHash: value.source_hash,
    title: insight.title,
    userId: value.user_id,
  };
}

function parseManifest(
  value: unknown,
  expectedBatchName: string
): BackfillManifest {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    value.batchName !== expectedBatchName ||
    typeof value.createdAt !== 'string' ||
    typeof value.reservationId !== 'string' ||
    !Array.isArray(value.documents)
  ) {
    throw new Error('배치 제출 기록이 올바르지 않습니다.');
  }

  const documents = value.documents.map((document) => {
    if (
      !isRecord(document) ||
      typeof document.insightId !== 'string' ||
      typeof document.userId !== 'string' ||
      typeof document.sourceHash !== 'string' ||
      !SOURCE_HASH_PATTERN.test(document.sourceHash) ||
      document.modelId !== RETRIEVE_EMBEDDING_MODEL ||
      document.projectionVersion !== RETRIEVE_PROJECTION_VERSION
    ) {
      throw new Error('배치 제출 기록이 올바르지 않습니다.');
    }

    return {
      insightId: document.insightId,
      modelId: RETRIEVE_EMBEDDING_MODEL,
      projectionVersion: RETRIEVE_PROJECTION_VERSION,
      sourceHash: document.sourceHash,
      userId: document.userId,
    };
  });

  return {
    batchName: value.batchName,
    createdAt: value.createdAt,
    documents,
    reservationId: value.reservationId,
    schemaVersion: 1,
  };
}

function requireEnvironmentValue(
  environment: Readonly<Record<string, string | undefined>>,
  name: string
) {
  const value = environment[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경 변수가 필요합니다.`);
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
