import type { SupabaseClient } from '@supabase/supabase-js';

import {
  createSupabaseInsightRepository,
  type InsightRepository,
} from '@/entities/insight';
import { getSupabaseClient } from '@/shared/api';

export function createBrowserInsightRepository(
  userId: string,
  client: SupabaseClient = getSupabaseClient()
): InsightRepository {
  return createSupabaseInsightRepository(client, userId);
}
