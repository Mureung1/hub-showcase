import { createApp } from './app.js';
import { readSupabaseServerConfig } from './supabase_config.js';
import { createSupabaseInsightCaptureService } from './supabase_insight_capture.js';
import { createSupabaseInsightMemoService } from './supabase_insight_memo.js';

export function createOperatingApp(
  environment: NodeJS.ProcessEnv = process.env
) {
  const supabaseConfig = readSupabaseServerConfig(environment);

  return createApp({
    captureService: createSupabaseInsightCaptureService(supabaseConfig),
    memoService: createSupabaseInsightMemoService(supabaseConfig),
  });
}
