import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase client helpers for the TypeScript test suite.
 *
 * Connection details come from environment variables so the same tests can run
 * against a local `supabase start` stack or a disposable CI database. When the
 * Supabase CLI is running locally it prints these values; copy them into a
 * `.env` file (see `.env.example`).
 *
 * Two client flavors are exposed:
 *   - anon client:         subject to Row Level Security, mirrors real clients.
 *   - service-role client: bypasses RLS, used to arrange/inspect test fixtures.
 */

/** Read an env var, throwing a clear error when it is missing. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Run `supabase start` and copy the printed values into a .env file ' +
        '(see .env.example).',
    );
  }
  return value;
}

/** Base URL of the local/remote Supabase API (e.g. http://127.0.0.1:54321). */
export function getSupabaseUrl(): string {
  return requireEnv('SUPABASE_URL');
}

/**
 * Anon-key client. Requests are constrained by RLS, so this represents what an
 * ordinary authenticated (or anonymous) end user can do.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), requireEnv('SUPABASE_ANON_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Service-role client. Bypasses RLS. Use only in tests to set up fixtures or
 * assert on state that end users cannot read directly. Never ship the
 * service-role key to a client application.
 */
export function createServiceRoleClient(): SupabaseClient {
  return createClient(getSupabaseUrl(), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
