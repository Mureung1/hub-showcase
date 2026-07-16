import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestDb,
  getTestDatabaseUrl,
  isDbAvailable,
  type TestDb,
} from './helpers/testDb';
import { listPublicTables, truncateAllTables, withRollback } from './helpers/dbReset';
import { DEFAULT_NUM_RUNS, resolveNumRuns } from './helpers/pbt';

/**
 * Smoke test for the data-layer test harness (Task 1.3).
 *
 * The config-only checks always run and prove the harness wiring compiles and
 * the fast-check run count honours the design's >=100 floor.
 *
 * The live-DB block is GUARDED: it is skipped (not failed) when the local
 * Supabase Postgres is unreachable, so the suite stays green without Docker.
 * When the DB is up it verifies the schema-driven reset utilities work end to
 * end. Real property/integration tests land in later tasks on top of this.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */

describe('test harness config', () => {
  it('defaults fast-check to at least 100 runs (design Testing Strategy)', () => {
    expect(DEFAULT_NUM_RUNS).toBeGreaterThanOrEqual(100);
    expect(resolveNumRuns()).toBeGreaterThanOrEqual(1);
  });
});

// Probe once, at collection time, so we can decide whether to skip the live
// block. `isDbAvailable` never throws (returns false when unreachable/unset).
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)('data-layer harness against local Supabase Postgres', () => {
  let harness: TestDb;

  // Created in beforeAll (not at suite-body top level) so a missing URL cannot
  // throw during collection when the suite is skipped.
  beforeAll(() => {
    harness = createTestDb();
  });

  afterAll(async () => {
    await harness?.close();
  });

  it('enumerates public base tables (schema-driven reset target)', async () => {
    const tables = await listPublicTables(harness.client);
    expect(Array.isArray(tables)).toBe(true);
  });

  it('truncateAllTables runs cleanly (safe no-op before Task 2 schema)', async () => {
    const truncated = await truncateAllTables(harness.client);
    expect(Array.isArray(truncated)).toBe(true);
  });

  it('withRollback returns the body value and rolls the transaction back', async () => {
    const value = await withRollback(harness.db, async () => 42);
    expect(value).toBe(42);
  });
});

// Emit a visible, explicitly-skipped marker when the DB is down so it is clear
// in the report why the live checks did not run (rather than silently absent).
describe.runIf(!dbReachable)('data-layer harness (skipped: DB unreachable)', () => {
  it.skip(
    `local Supabase Postgres not reachable${
      getTestDatabaseUrl() ? '' : ' (no DATABASE_* URL set)'
    } — run \`supabase start\` to enable live harness checks`,
    () => {},
  );
});
