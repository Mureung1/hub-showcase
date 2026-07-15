import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Enable global test APIs (describe/it/expect) without importing them.
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Load environment variables from .env.local (e.g. Supabase credentials).
    setupFiles: ['tests/setup.ts'],
    // Property-based tests can explore many inputs; give them room.
    testTimeout: 30_000,
    // Integration tests connect/reset the DB in before/after hooks — allow the
    // same headroom so connection setup/teardown does not time out.
    hookTimeout: 30_000,
    // Run test FILES one-at-a-time. Every integration/property suite here talks
    // to the SAME remote Supabase Postgres, inserting/deleting on shared tables
    // and (in the harness) TRUNCATE-ing them. Vitest's default parallel file
    // execution let those suites contend cross-file, which surfaced as
    // intermittent `deadlock detected` during truncate. Serialising files
    // removes the cross-file DB contention without touching any app logic.
    // (Tests within a file already run sequentially.)
    fileParallelism: false,
  },
});
