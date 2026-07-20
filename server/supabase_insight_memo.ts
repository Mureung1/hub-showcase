import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  createInsightMemoService,
  type InsightMemoStore,
} from './insight_memo_service.js';
import {
  createSupabaseInsightCaptureAuthenticator,
  type SupabaseInsightCaptureConfig,
} from './supabase_insight_capture.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

export function createSupabaseInsightMemoService(
  config: SupabaseInsightCaptureConfig
) {
  const authClient = createClient(config.url, config.publishableKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createInsightMemoService(
    createSupabaseInsightCaptureAuthenticator(authClient),
    (accessToken) => {
      const userClient = createClient(config.url, config.publishableKey, {
        auth: SERVER_AUTH_OPTIONS,
        global: {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      });

      return createSupabaseInsightMemoStore(userClient);
    }
  );
}

export function createSupabaseInsightMemoStore(
  client: SupabaseClient
): InsightMemoStore {
  return {
    async updateMemo(userId, insightId, memo) {
      try {
        const { data, error } = await client
          .from('insights')
          .update({ memo })
          .eq('id', insightId)
          .eq('user_id', userId)
          .select('id')
          .maybeSingle();

        if (error) {
          return {
            status:
              error.code === '42501' ? 'permission-denied' : 'write-failed',
          };
        }

        return { status: data ? 'updated' : 'not-found' };
      } catch {
        return { status: 'write-failed' };
      }
    },
  };
}
