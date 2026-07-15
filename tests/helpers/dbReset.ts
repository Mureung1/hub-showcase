import type { TestClient, TestDatabase, TestTransaction } from './testDb';

/**
 * Database reset / isolation utilities for tests (Task 1.3).
 *
 * Property-based and integration tests must start from a clean, deterministic
 * state. Two complementary strategies are provided:
 *
 *   1. `truncateAllTables` — schema-driven wipe of every base table in the
 *      `public` schema. It enumerates tables dynamically from the catalog, so
 *      it needs no hard-coded table list and already works once Task 2 defines
 *      the domain schema (today it is a safe no-op because no domain tables
 *      exist yet). Prefer this between tests that exercise real interactive
 *      transactions / `FOR UPDATE` locking (e.g. concurrency properties), where
 *      an outer wrapping transaction would distort locking semantics.
 *
 *   2. `withRollback` — runs a test body inside a transaction that is always
 *      rolled back. Lightweight and fast for single-transaction assertions, but
 *      note that domain functions which open their own `db.transaction()` will
 *      nest as savepoints under the wrapper, which does not reproduce true
 *      top-level commit/lock behaviour. Use `truncateAllTables` for those.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */

/**
 * List every base table (not views) in the `public` schema. Drizzle's own
 * migration journal lives in the `drizzle` schema and Supabase's migration
 * history in `supabase_migrations`, so neither is returned here.
 */
export async function listPublicTables(client: TestClient): Promise<string[]> {
  const rows = await client<Array<{ tablename: string }>>`
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
    order by tablename
  `;
  return rows.map((r) => r.tablename);
}

/**
 * Truncate all `public` base tables, restarting identities and cascading FKs so
 * ordering never matters. Returns the list of truncated table names (empty when
 * the schema has no tables yet — a safe no-op before Task 2).
 */
export async function truncateAllTables(client: TestClient): Promise<string[]> {
  const tables = await listPublicTables(client);
  if (tables.length === 0) return [];

  // Identifiers come from the system catalog (trusted), but quote + escape them
  // anyway so unusual table names can never break the statement.
  const quoted = tables
    .map((t) => `"public"."${t.replace(/"/g, '""')}"`)
    .join(', ');

  await client.unsafe(`truncate table ${quoted} restart identity cascade`);
  return tables;
}

/** Internal sentinel used to force a transaction rollback without leaking. */
class RollbackSignal extends Error {
  constructor() {
    super('withRollback: intentional rollback');
    this.name = 'RollbackSignal';
  }
}

/**
 * Run `fn` inside a transaction and always roll it back, returning whatever the
 * body produced. Any real error from the body is re-thrown unchanged.
 */
export async function withRollback<T>(
  db: TestDatabase,
  fn: (tx: TestTransaction) => Promise<T>,
): Promise<T> {
  let captured: { value: T } | undefined;
  try {
    await db.transaction(async (tx) => {
      captured = { value: await fn(tx as TestTransaction) };
      // Throwing rolls back the transaction; we swallow this specific signal.
      throw new RollbackSignal();
    });
  } catch (err) {
    if (!(err instanceof RollbackSignal)) throw err;
  }
  if (!captured) {
    throw new Error('withRollback: transaction body did not run');
  }
  return captured.value;
}
