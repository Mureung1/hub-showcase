'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getClientEnv } from '../../config/client-env';
let client: ReturnType<typeof createBrowserClient> | undefined;
export function getBrowserSupabaseClient() {
  const env = getClientEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) throw new Error('Supabase public configuration is missing');
  client ??= createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
  return client;
}
