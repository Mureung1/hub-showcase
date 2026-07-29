import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type {
  InsightEmbeddingStore,
  PendingEmbeddingDocument,
} from './insight_embedding_store.js';
import {
  RETRIEVE_EMBEDDING_MODEL,
  RETRIEVE_PROJECTION_VERSION,
} from './retrieve_embedding.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;
const STORE_FAILURE_MESSAGE = '꺼내보기 검색 정보를 처리하지 못했습니다.';

export type SupabaseInsightEmbeddingStoreConfig = {
  serviceRoleKey: string;
  url: string;
};

export function createSupabaseInsightEmbeddingStore(
  config: SupabaseInsightEmbeddingStoreConfig
): InsightEmbeddingStore {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createInsightEmbeddingStore(client);
}

export function createInsightEmbeddingStore(
  client: Pick<SupabaseClient, 'from' | 'rpc'>
): InsightEmbeddingStore {
  return {
    async completeDocument(input) {
      const { data, error } = await client.rpc(
        'complete_insight_embedding_job',
        {
          requested_embedding: toPostgresVector(input.vector),
          requested_insight_id: input.insightId,
          requested_model_id: RETRIEVE_EMBEDDING_MODEL,
          requested_projection_version: RETRIEVE_PROJECTION_VERSION,
          requested_source_hash: input.sourceHash,
          requested_user_id: input.userId,
        }
      );

      if (error || data !== true) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }
    },

    async countPending(userId) {
      const { count, error } = await client
        .from('insight_embedding_jobs')
        .select('insight_id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('model_id', RETRIEVE_EMBEDDING_MODEL)
        .eq('projection_version', RETRIEVE_PROJECTION_VERSION);

      if (error || !Number.isInteger(count) || count === null || count < 0) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return count;
    },

    async listPending(userId, limit) {
      const { data, error } = await client.rpc(
        'list_pending_insight_embeddings',
        {
          requested_model_id: RETRIEVE_EMBEDDING_MODEL,
          requested_projection_version: RETRIEVE_PROJECTION_VERSION,
          requested_user_id: userId,
          result_limit: limit,
        }
      );

      if (error || !Array.isArray(data)) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return data.map(parsePendingDocument);
    },

    async match({ queryVector, threshold, userId }) {
      const { data, error } = await client.rpc('match_insight_embeddings', {
        match_threshold: threshold,
        query_embedding: toPostgresVector(queryVector),
        requested_model_id: RETRIEVE_EMBEDDING_MODEL,
        requested_projection_version: RETRIEVE_PROJECTION_VERSION,
        requested_user_id: userId,
      });

      if (error || !Array.isArray(data)) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return data.map((row) => {
        if (!isRecord(row) || typeof row.insight_id !== 'string') {
          throw new Error(STORE_FAILURE_MESSAGE);
        }

        return row.insight_id;
      });
    },

    async reconcileUsage(input) {
      const { data, error } = await client.rpc('reconcile_embedding_usage', {
        actual_prompt_tokens:
          input.settlement === 'actual' ? input.promptTokens : null,
        requested_reservation_id: input.reservationId,
        settlement: input.settlement,
      });

      if (error || data !== true) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }
    },

    async reserveUsage(maxTokens) {
      const { data, error } = await client.rpc('reserve_embedding_usage', {
        requested_tokens: maxTokens,
      });

      if (error) {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      if (data === null) {
        return { ok: false, reason: 'usage-limit-reached' };
      }

      if (typeof data !== 'string') {
        throw new Error(STORE_FAILURE_MESSAGE);
      }

      return {
        ok: true,
        reservationId: data,
      };
    },
  };
}

function parsePendingDocument(value: unknown): PendingEmbeddingDocument {
  if (
    !isRecord(value) ||
    typeof value.insight_id !== 'string' ||
    typeof value.title !== 'string' ||
    (value.memo !== null && typeof value.memo !== 'string') ||
    typeof value.source_hash !== 'string'
  ) {
    throw new Error(STORE_FAILURE_MESSAGE);
  }

  return {
    insightId: value.insight_id,
    memo: value.memo,
    sourceHash: value.source_hash,
    title: value.title,
  };
}

function toPostgresVector(vector: number[]) {
  return `[${vector.join(',')}]`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
