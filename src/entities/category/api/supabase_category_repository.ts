import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import {
  isCategoryColorKey,
  type CategoryColorKey,
} from '@/shared/config/design-system';

import {
  isValidCategoryName,
  normalizeCategoryInput,
  type Category,
  type CategoryInput,
} from '../model/category';
import type {
  CategoryRepository,
  CategoryRepositoryFailureReason,
  CategoryRepositoryWarning,
} from '../model/category_repository';

const CATEGORY_COLUMNS = [
  'id',
  'user_id',
  'name',
  'color_key',
  'sort_order',
  'created_at',
  'updated_at',
].join(',');

export function createSupabaseCategoryRepository(
  client: SupabaseClient,
  userId: string
): CategoryRepository {
  return {
    async list() {
      try {
        const { data, error } = await client
          .from('categories')
          .select(CATEGORY_COLUMNS)
          .eq('user_id', userId)
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: true })
          .order('id', { ascending: true });

        if (error) {
          return {
            categories: [],
            warnings: [toReadWarning(error)],
          };
        }

        const categories: Category[] = [];
        let hasCorruptedEntry = false;

        for (const row of data ?? []) {
          const category = parseCategoryRow(row, userId);

          if (category) {
            categories.push(category);
          } else {
            hasCorruptedEntry = true;
          }
        }

        return {
          categories,
          warnings: hasCorruptedEntry ? ['corrupted-entry'] : [],
        };
      } catch {
        return { categories: [], warnings: ['read-failed'] };
      }
    },
    async create(input, sortOrder) {
      const normalizedInput = normalizeCategoryInput(input);

      if (!normalizedInput || !isValidSortOrder(sortOrder)) {
        return { ok: false, reason: 'invalid-input' };
      }

      try {
        const { data, error } = await client
          .from('categories')
          .insert(toCategoryRow(normalizedInput, sortOrder, userId))
          .select(CATEGORY_COLUMNS)
          .single();

        if (error) {
          return { ok: false, reason: toWriteFailure(error) };
        }

        const category = parseCategoryRow(data, userId);

        return category
          ? { category, ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
    async update(categoryId, input) {
      const normalizedInput = normalizeCategoryInput(input);

      if (!isUuid(categoryId) || !normalizedInput) {
        return { ok: false, reason: 'invalid-input' };
      }

      try {
        const { data, error } = await client
          .from('categories')
          .update({
            color_key: normalizedInput.colorKey,
            name: normalizedInput.name,
          })
          .eq('id', categoryId)
          .eq('user_id', userId)
          .select(CATEGORY_COLUMNS)
          .maybeSingle();

        if (error) {
          return { ok: false, reason: toWriteFailure(error) };
        }

        if (!data) {
          return { ok: false, reason: 'not-found' };
        }

        const category = parseCategoryRow(data, userId);

        return category
          ? { category, ok: true }
          : { ok: false, reason: 'write-failed' };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
    async delete(categoryId) {
      if (!isUuid(categoryId)) {
        return { ok: false, reason: 'invalid-input' };
      }

      try {
        const { error } = await client.rpc('delete_user_category', {
          target_category_id: categoryId,
        });

        return error
          ? { ok: false, reason: toDeleteFailure(error) }
          : { ok: true };
      } catch {
        return { ok: false, reason: 'write-failed' };
      }
    },
  };
}

function toCategoryRow(
  input: CategoryInput,
  sortOrder: number,
  userId: string
) {
  return {
    color_key: input.colorKey,
    name: input.name,
    sort_order: sortOrder,
    user_id: userId,
  };
}

function parseCategoryRow(row: unknown, userId: string): Category | null {
  if (
    !isRecord(row) ||
    row.user_id !== userId ||
    !isUuid(row.id) ||
    typeof row.name !== 'string' ||
    !isValidCategoryName(row.name) ||
    !isCategoryColorKey(row.color_key) ||
    !isValidSortOrder(row.sort_order) ||
    !isIsoTimestamp(row.created_at) ||
    !isIsoTimestamp(row.updated_at)
  ) {
    return null;
  }

  return {
    colorKey: row.color_key as CategoryColorKey,
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    updatedAt: row.updated_at,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value
    )
  );
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(
      value
    ) &&
    Number.isFinite(Date.parse(value))
  );
}

function isValidSortOrder(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function toReadWarning(error: PostgrestError): CategoryRepositoryWarning {
  return error.code === '42501' ? 'permission-denied' : 'read-failed';
}

function toWriteFailure(
  error: PostgrestError
): CategoryRepositoryFailureReason {
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
): Exclude<CategoryRepositoryFailureReason, 'duplicate'> {
  const reason = toWriteFailure(error);
  return reason === 'duplicate' ? 'write-failed' : reason;
}
