/**
 * Drizzle database client (write / transaction path).
 *
 * Per design.md → "Connection & Pooling 전략", all writes (money, points, state
 * transitions) go through a direct Postgres connection so that Drizzle's
 * interactive transactions (`db.transaction()` + `SELECT ... FOR UPDATE`) can
 * hold row locks. To stay correct AND survive serverless connection fan-out,
 * this client connects through the Supabase Connection Pooler in **SESSION
 * mode** (Transaction-mode pooling cannot guarantee the session state that
 * explicit `FOR UPDATE` locks rely on).
 *
 * Connection-string separation (design.md):
 *   - Write / transaction path (this module) → SESSION-mode pooler:
 *       env var `DATABASE_SESSION_POOL_URL`
 *   - Migrations (drizzle-kit)               → direct, non-pooled connection:
 *       env var `DATABASE_DIRECT_URL` (see drizzle.config.ts)
 *
 * Reads of non-sensitive data (public challenge lists, leaderboard, ...) are
 * served by the Supabase JS client elsewhere and do NOT use this module.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** Read an env var, throwing a clear error when it is missing. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        'Set it to the Supabase SESSION-mode pooler connection string ' +
        '(see .env.example).',
    );
  }
  return value;
}

/**
 * Low-level postgres-js client. Tuned for serverless invocations talking to a
 * SESSION-mode pooler:
 *   - `max: 1`      → one connection per function instance; the pooler
 *                     multiplexes across instances.
 *   - `prepare: false` → avoid prepared-statement caching pitfalls across
 *                     pooled connections.
 * Exported so tests / graceful-shutdown code can call `queryClient.end()`.
 */
export const queryClient = postgres(requireEnv('DATABASE_SESSION_POOL_URL'), {
  max: 1,
  prepare: false,
});

/**
 * Drizzle instance bound to the schema. All domain transaction functions
 * (Task 3+) run their writes through `db.transaction(...)`.
 */
export const db: PostgresJsDatabase<typeof schema> = drizzle(queryClient, {
  schema,
});

export { schema };
export type Database = typeof db;
