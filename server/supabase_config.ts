import type { SupabaseInsightCaptureConfig } from './supabase_insight_capture';

export function readSupabaseServerConfig(
  env: Record<string, string | undefined>
): SupabaseInsightCaptureConfig {
  const url = env.VITE_SUPABASE_URL?.trim();
  const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

  if (!url || !publishableKey) {
    throw new Error(
      'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required'
    );
  }

  return { publishableKey, url };
}
