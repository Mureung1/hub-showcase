import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import { parseInsight } from '../model/parse_insight';
import type { Insight } from '../model/insight';
import type {
  InsightRepository,
  InsightRepositoryWriteFailureReason,
  InsightRepositoryWarning,
} from '../model/insight_repository';

const INSIGHT_COLUMNS = [
  'id',
  'user_id',
  'original_url',
  'normalized_url',
  'domain',
  'title',
  'title_origin',
  'memo',
  'category_id',
  'schema_version',
  'created_at',
  'updated_at',
].join(',');

export function createSupabaseInsightRepository(
  client: SupabaseClient,
  userId: string
): InsightRepository {
  return {
    async list() {
      try {
        const { data, error } = await client
          .from('insights')
          .select(INSIGHT_COLUMNS)
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          return {
            insights: [],
            warnings: [toReadWarning(error)],
          };
        }

        const insights: Insight[] = [];
        let hasCorruptedEntry = false;

        for (const row of data ?? []) {
          const insight = parseInsightRow(row, userId);

          if (insight) {
            insights.push(insight);
          } else {
            hasCorruptedEntry = true;
          }
        }

        return {
          insights,
          warnings: hasCorruptedEntry ? ['corrupted-entry'] : [],
        };
      } catch {
        return { insights: [], warnings: ['read-failed'] };
      }
    },
    async create(insight) {
      try {
        const { data, error } = await client
          .from('insights')
          .insert(toInsertRow(insight, userId))
          .select(INSIGHT_COLUMNS)
          .single();

        if (error) {
          return { ok: false, reason: toWriteFailure(error) };
        }

        const createdInsight = parseInsightRow(data, userId);

        return createdInsight
          ? { insight: createdInsight, ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
    async update(insight) {
      try {
        const { data, error } = await client
          .from('insights')
          .update(toUpdateRow(insight))
          .eq('id', insight.id)
          .eq('user_id', userId)
          .select(INSIGHT_COLUMNS)
          .maybeSingle();

        if (error) {
          return { ok: false, reason: toWriteFailure(error) };
        }

        if (!data) {
          return { ok: false, reason: 'not-found' };
        }

        const updatedInsight = parseInsightRow(data, userId);

        return updatedInsight
          ? { insight: updatedInsight, ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
    async delete(insightId) {
      try {
        const { data, error } = await client
          .from('insights')
          .delete()
          .eq('id', insightId)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();

        if (error) {
          return { ok: false, reason: toDeleteFailure(error) };
        }

        return data ? { ok: true } : { ok: false, reason: 'not-found' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
  };
}

function toInsertRow(insight: Insight, userId: string) {
  return {
    category_id: insight.categoryId,
    domain: insight.domain,
    id: insight.id,
    memo: insight.memo,
    normalized_url: insight.normalizedUrl,
    original_url: insight.originalUrl,
    schema_version: 1,
    title: insight.title,
    title_origin: insight.titleOrigin,
    user_id: userId,
  };
}

function toUpdateRow(insight: Insight) {
  return {
    category_id: insight.categoryId,
    memo: insight.memo,
    title: insight.title,
    title_origin: insight.titleOrigin,
  };
}

function parseInsightRow(row: unknown, userId: string) {
  if (!isRecord(row)) {
    return null;
  }

  if (row.user_id !== userId || row.schema_version !== 1) {
    return null;
  }

  return parseInsight({
    categoryId: row.category_id,
    createdAt: row.created_at,
    domain: row.domain,
    id: row.id,
    memo: row.memo,
    normalizedUrl: row.normalized_url,
    originalUrl: row.original_url,
    title: row.title,
    titleOrigin: row.title_origin,
    updatedAt: row.updated_at,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toReadWarning(error: PostgrestError): InsightRepositoryWarning {
  return error.code === '42501' ? 'permission-denied' : 'read-failed';
}

function toWriteFailure(
  error: PostgrestError
): InsightRepositoryWriteFailureReason {
  if (error.code === '23505') {
    return 'duplicate';
  }

  if (error.code === '42501') {
    return 'permission-denied';
  }

  return 'write-failed';
}

function toDeleteFailure(
  error: PostgrestError
): Exclude<InsightRepositoryWriteFailureReason, 'duplicate'> {
  const reason = toWriteFailure(error);
  return reason === 'duplicate' ? 'write-failed' : reason;
}
