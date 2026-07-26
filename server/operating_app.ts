import { createApp } from './app.js';
import { createSupabaseImportCleanupService } from './insight_import/import_cleanup_service.js';
import { readImportServerConfig } from './insight_import/import_server_config.js';
import { readSupabaseServerConfig } from './supabase_config.js';
import { createSupabaseInsightCaptureService } from './supabase_insight_capture.js';
import { createSupabaseInsightMemoService } from './supabase_insight_memo.js';

export function createOperatingApp(
  environment: NodeJS.ProcessEnv = process.env
) {
  const supabaseConfig = readSupabaseServerConfig(environment);
  const importServerConfig = readImportServerConfig(environment);
  const cleanupOptions = importServerConfig
    ? {
        cleanupService: createSupabaseImportCleanupService({
          serviceRoleKey: importServerConfig.serviceRoleKey,
          url: supabaseConfig.url,
        }),
        cronSecret: importServerConfig.cronSecret,
      }
    : {};

  return createApp({
    captureService: createSupabaseInsightCaptureService(supabaseConfig),
    ...cleanupOptions,
    memoService: createSupabaseInsightMemoService(supabaseConfig),
  });
}
