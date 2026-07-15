import { config } from 'dotenv';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../src/db/schema';

/**
 * Test-only Drizzle client harness for the data layer (Task 1.3).
 *
 * This mirrors the production write-path client (`src/db/index.ts`) but is
 * tuned for integration / property-based tests that run against the **local
 * Supabase** Postgres (`supabase start`, default `127.0.0.1:54322`). Unlike the
 * production client it does not hard-require the SESSION-mode pooler URL at
 * import time — tests talk to a local, direct connection and must be able to
 * skip gracefully when the DB is not running (see `isDbAvailable`).
 *
 * Connection-string resolution (most specific wins):
 *   1. DATABASE_TEST_URL        — dedicated test DB, if you want isolation from dev.
 *   2. DATABASE_DIRECT_URL      — direct (non-pooled) connection used by migrations.
 *   3. DATABASE_SESSION_POOL_URL — write-path pooler URL, as a last resort.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */

// Defensive: `tests/setup.ts` already loads .env.local via Vitest setupFiles,
// but load again here (idempotent — dotenv never overrides already-set vars) so
// this module is usable from ad-hoc scripts / tooling too. Secrets are only
// read into process.env; they are never logged or echoed.
config({ path: '.env.local' });

/** Drizzle instance type bound to the (currently empty) project schema. */
export type TestDatabase = PostgresJsDatabase<typeof schema>;

/** Low-level postgres-js client type (used by the schema-driven reset util). */
export type TestClient = ReturnType<typeof postgres>;

/**
 * The interactive-transaction handle Drizzle passes to `db.transaction(cb)`.
 * Derived from the client type so it stays correct once Task 2 populates the
 * schema. Domain transaction functions (Task 3+) accept a value of this type.
 */
export type TestTransaction = Parameters<
  Parameters<TestDatabase['transaction']>[0]
>[0];

export interface TestDb {
  /** Drizzle instance bound to the schema. */
  db: TestDatabase;
  /** Underlying postgres-js client (for admin/reset queries + shutdown). */
  client: TestClient;
  /** Close the connection. Call in `afterAll` to avoid leaked handles. */
  close: () => Promise<void>;
}

export interface CreateTestDbOptions {
  /** Max connections in the pool. Default 1 (deterministic locking in tests). */
  max?: number;
  /** Connection timeout in seconds. Default 10. */
  connectTimeoutSeconds?: number;
}

/**
 * Resolve the connection string for tests, or `undefined` when none is set.
 * Kept non-throwing so callers (e.g. `isDbAvailable`) can decide to skip.
 */
export function getTestDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_TEST_URL ??
    process.env.DATABASE_DIRECT_URL ??
    process.env.DATABASE_SESSION_POOL_URL
  );
}

/** Resolve the test connection string, throwing a clear error when missing. */
export function requireTestDatabaseUrl(): string {
  const url = getTestDatabaseUrl();
  if (!url) {
    throw new Error(
      'Missing test database URL. Set one of DATABASE_TEST_URL, ' +
        'DATABASE_DIRECT_URL, or DATABASE_SESSION_POOL_URL in .env.local ' +
        '(see .env.example). For local tests, point it at the Supabase ' +
        'Postgres started by `supabase start` (default 127.0.0.1:54322).',
    );
  }
  return url;
}

/**
 * Create a fresh Drizzle test client bound to the local Supabase Postgres.
 *
 * `prepare: false` matches the production client and avoids prepared-statement
 * pitfalls; `onnotice` is silenced to keep test output clean.
 */
export function createTestDb(options: CreateTestDbOptions = {}): TestDb {
  const client = postgres(requireTestDatabaseUrl(), {
    max: options.max ?? 1,
    prepare: false,
    onnotice: () => {},
    connect_timeout: options.connectTimeoutSeconds ?? 10,
  });
  const db = drizzle(client, { schema });
  return {
    db,
    client,
    close: async () => {
      await client.end({ timeout: 5 });
    },
  };
}

/**
 * Probe whether the local test database is reachable. Returns `false` (never
 * throws) when no URL is configured or the connection fails, so DB-dependent
 * suites can `describe.skipIf(!(await isDbAvailable()))` instead of hard-failing
 * when Docker / `supabase start` is not running.
 */
export async function isDbAvailable(): Promise<boolean> {
  const url = getTestDatabaseUrl();
  if (!url) return false;

  const client = postgres(url, {
    max: 1,
    prepare: false,
    onnotice: () => {},
    connect_timeout: 3,
  });
  try {
    await client`select 1`;
    return true;
  } catch {
    return false;
  } finally {
    await client.end({ timeout: 2 }).catch(() => {});
  }
}

export { schema };
