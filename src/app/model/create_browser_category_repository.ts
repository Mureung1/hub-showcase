import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createSupabaseCategoryRepository,
  type CategoryRepository,
} from '@/entities/category';
import { getSupabaseClient } from '@/shared/api';

export function createBrowserCategoryRepository(
  userId: string,
  client: SupabaseClient = getSupabaseClient()
): CategoryRepository {
  return createSupabaseCategoryRepository(client, userId);
}
