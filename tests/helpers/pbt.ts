import fc from 'fast-check';

/**
 * Property-based testing (fast-check) configuration + shared arbitraries
 * scaffolding (Task 1.3).
 *
 * design.md → "Testing Strategy" requires each Correctness Property test to run
 * at least 100 iterations. `DEFAULT_NUM_RUNS` encodes that floor; it can be
 * overridden per-run via the `FC_NUM_RUNS` env var (e.g. to crank it up in CI
 * or dial it down for a quick local smoke run).
 *
 * `configureFastCheck()` is invoked once from `tests/setup.ts` so every
 * property test inherits the run count globally without per-test boilerplate.
 *
 * Requirements traceability: 14.1, 14.2, 14.3
 */

/** Minimum property-based test iterations per design.md Testing Strategy. */
export const DEFAULT_NUM_RUNS = 100;

/** Resolve the effective run count (env override, else the >=100 default). */
export function resolveNumRuns(): number {
  const raw = process.env.FC_NUM_RUNS;
  if (raw !== undefined) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_NUM_RUNS;
}

/** Shared fast-check parameters. Spread into `fc.assert(prop, fcParams)`. */
export const fcParams: fc.Parameters<unknown> = {
  numRuns: resolveNumRuns(),
};

/** Apply the shared run count globally. Called from tests/setup.ts. */
export function configureFastCheck(): void {
  fc.configureGlobal({ numRuns: resolveNumRuns() });
}

/* ---------------------------------------------------------------------------
 * Shared arbitraries scaffolding.
 *
 * A small, domain-agnostic starter set. Task-specific generators (wallet
 * balances, operation sequences, participant compositions, timer sessions,
 * webhook replays, ...) are added alongside the property tests they support in
 * later tasks, and should be constrained to their real input space.
 * ------------------------------------------------------------------------- */

/** Random UUID (v4-shaped) — useful for user/challenge/participation ids. */
export const arbUuid = fc.uuid();

/** Non-negative integer point/amount (0..1,000,000). */
export const arbNonNegativeAmount = fc.integer({ min: 0, max: 1_000_000 });

/** Strictly positive integer point/amount (1..1,000,000). */
export const arbPositiveAmount = fc.integer({ min: 1, max: 1_000_000 });

export { fc };
