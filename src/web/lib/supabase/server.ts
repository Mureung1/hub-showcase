import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getClientEnv } from '../../config/client-env';
export async function getServerSupabaseClient() {
  const env = getClientEnv();
  if (!env.supabaseUrl || !env.supabaseAnonKey) return null;
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, { cookies: { getAll: () => store.getAll(), setAll: (values) => { try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Server Components cannot mutate cookies. */ } } } });
}
