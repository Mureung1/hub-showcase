import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { ImportCleanupService } from '../app.js';

const SERVER_AUTH_OPTIONS = {
  autoRefreshToken: false,
  detectSessionInUrl: false,
  persistSession: false,
} as const;

const CLEANUP_FAILURE_MESSAGE = '가져오기 만료 정리에 실패했습니다.';

export type SupabaseImportCleanupConfig = {
  serviceRoleKey: string;
  url: string;
};

export function createSupabaseImportCleanupService(
  config: SupabaseImportCleanupConfig
): ImportCleanupService {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createImportCleanupService(client);
}

export function createImportCleanupService(
  client: Pick<SupabaseClient, 'rpc'>
): ImportCleanupService {
  return {
    async cleanup() {
      try {
        const { data, error } = await client.rpc(
          'cleanup_expired_insight_imports'
        );

        if (
          error ||
          typeof data !== 'number' ||
          !Number.isInteger(data) ||
          data < 0
        ) {
          throw new Error(CLEANUP_FAILURE_MESSAGE);
        }

        return { deletedJobCount: data };
      } catch {
        throw new Error(CLEANUP_FAILURE_MESSAGE);
      }
    },
  };
}
