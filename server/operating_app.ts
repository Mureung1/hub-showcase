import { createApp } from './app.js';
import { createSupabaseImportCleanupService } from './insight_import/import_cleanup_service.js';
import { readImportServerConfig } from './insight_import/import_server_config.js';
import {
  createSupabaseExpiredNotionConnectionRevoker,
  createSupabaseNotionImportService,
} from './insight_import/notion_import_service.js';
import { createSupabaseInsightRetrieveService } from './retrieve/supabase_insight_retrieve_service.js';
import { readOptionalRetrieveConfig } from './retrieve_config.js';
import { readSupabaseServerConfig } from './supabase_config.js';
import { createSupabaseInsightCaptureService } from './supabase_insight_capture.js';
import { createSupabaseInsightMemoService } from './supabase_insight_memo.js';

export function createOperatingApp(
  environment: NodeJS.ProcessEnv = process.env
) {
  const supabaseConfig = readSupabaseServerConfig(environment);
  const importServerConfig = readImportServerConfig(environment);
  const retrieveConfig = readOptionalRetrieveConfig(environment);
  const notionOptions = importServerConfig?.notion
    ? {
        notionImportService: createSupabaseNotionImportService({
          notion: importServerConfig.notion,
          publishableKey: supabaseConfig.publishableKey,
          serviceRoleKey: importServerConfig.serviceRoleKey,
          url: supabaseConfig.url,
        }),
      }
    : {};
  const revokeExpiredConnections = importServerConfig?.notion
    ? createSupabaseExpiredNotionConnectionRevoker({
        notion: importServerConfig.notion,
        serviceRoleKey: importServerConfig.serviceRoleKey,
        url: supabaseConfig.url,
      })
    : undefined;
  const cleanupOptions = importServerConfig
    ? {
        cleanupService: createSupabaseImportCleanupService(
          {
            serviceRoleKey: importServerConfig.serviceRoleKey,
            url: supabaseConfig.url,
          },
          revokeExpiredConnections
        ),
        cronSecret: importServerConfig.cronSecret,
      }
    : {};
  const retrieveOptions = retrieveConfig
    ? {
        retrieveService: createSupabaseInsightRetrieveService({
          geminiApiKey: retrieveConfig.geminiApiKey,
          publishableKey: supabaseConfig.publishableKey,
          serviceRoleKey: retrieveConfig.serviceRoleKey,
          url: retrieveConfig.supabaseUrl,
        }),
      }
    : {};

  return createApp({
    captureService: createSupabaseInsightCaptureService(supabaseConfig),
    ...cleanupOptions,
    memoService: createSupabaseInsightMemoService(supabaseConfig),
    ...notionOptions,
    ...retrieveOptions,
  });
}
