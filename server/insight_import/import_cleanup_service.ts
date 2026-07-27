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
  config: SupabaseImportCleanupConfig,
  revokeExpiredConnections?: () => Promise<void>
): ImportCleanupService {
  const client = createClient(config.url, config.serviceRoleKey, {
    auth: SERVER_AUTH_OPTIONS,
  });

  return createImportCleanupService(client, revokeExpiredConnections);
}

export function createImportCleanupService(
  client: Pick<SupabaseClient, 'rpc'>,
  revokeExpiredConnections?: () => Promise<void>
): ImportCleanupService {
  return {
    async cleanup() {
      try {
        try {
          await revokeExpiredConnections?.();
        } catch {
          // Provider 철회 실패와 무관하게 24시간 보존 한도 정리는 계속한다.
        }

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
