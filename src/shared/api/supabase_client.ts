import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getSupabaseEnv, type SupabaseEnv } from '@/shared/config';

const BROWSER_AUTH_OPTIONS = {
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flowType: 'pkce',
  persistSession: true,
} as const;

type BrowserClientFactory<TClient> = (
  url: string,
  publishableKey: string,
  options: { auth: typeof BROWSER_AUTH_OPTIONS }
) => TClient;

export function createSupabaseBrowserClient(env: SupabaseEnv): SupabaseClient;
export function createSupabaseBrowserClient<TClient>(
  env: SupabaseEnv,
  factory: BrowserClientFactory<TClient>
): TClient;
export function createSupabaseBrowserClient(
  env: SupabaseEnv,
  factory: BrowserClientFactory<unknown> = createClient
) {
  return factory(env.url, env.publishableKey, {
    auth: BROWSER_AUTH_OPTIONS,
  });
}

let browserClient: SupabaseClient | undefined;

export function getSupabaseClient() {
  browserClient ??= createSupabaseBrowserClient(getSupabaseEnv());

  return browserClient;
}
