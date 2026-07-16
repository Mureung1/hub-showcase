import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import { createServiceRoleClient } from './helpers/supabaseClient';
import { pointWallets, pointTransactions } from '../src/db/schema';
import {
  creditPoints,
  debitPoints,
  getWalletBalance,
  getTransactionHistory,
  type PointTransaction,
} from '../src/domain/points';
import { isDomainErr } from '../src/domain/errors';

/**
 * Feature: survival-study-challenge
 * Property 2: 차감 원자성 (롤백 불변) — debit atomicity / rollback invariance
 *
 * *For any* 지갑과 잔액을 초과하는 차감 금액, 또는 트랜잭션 도중 발생하는 임의의
 * 오류에 대해, 트랜잭션은 롤백되어 지갑 잔액과 관련 상태(append-only 원장 포함)가
 * 거래 이전과 완전히 동일하게 유지된다 — 전부 아니면 전무(all-or-nothing).
 * (design.md → "Correctness Properties" / Property 2. Drizzle 트랜잭션 롤백 +
 * `INSUFFICIENT_POINTS` 예외가 강제)
 *
 * This exercises the REAL transaction function `debitPoints`
 * (src/domain/points.ts) against the REMOTE Supabase Postgres via the Drizzle
 * write path — each scenario runs inside its own `db.transaction()` so the
 * `SELECT ... FOR UPDATE` wallet lock + wallet UPDATE + ledger INSERT compose
 * exactly as production callers use them, and the rollback behaviour is the
 * genuine Postgres transaction rollback (no mocks).
 *
 * Two rollback triggers cover the full "either / or" of the property text via a
 * single discriminated-union arbitrary:
 *   1. `insufficient`  — a debit strictly greater than the balance. `debitPoints`
 *      must throw `INSUFFICIENT_POINTS` before writing anything (Req 5.2 / 12.2).
 *   2. `inject-error`  — a VALID debit (which DOES perform the wallet UPDATE +
 *      ledger INSERT inside the tx) followed by an arbitrary error thrown mid
 *      transaction, forcing Drizzle/Postgres to roll the in-tx writes back
 *      (Req 14.3). This is the strong all-or-nothing case: even a write that
 *      already succeeded inside the tx must leave no trace once it aborts.
 *
 * To make "관련 상태가 거래 이전과 완전히 동일" a meaningful assertion, each run
 * seeds a committed baseline (a real `creditPoints` credit) so the pre-op ledger
 * is non-empty whenever the balance is positive: the after-snapshot must equal
 * that baseline exactly (no pre-existing row wiped, no orphan row appended).
 *
 * **Validates: Requirements 5.2, 12.2, 14.3**
 */

/** A snapshot of the user's mutable point state, for before/after comparison. */
interface WalletSnapshot {
  balance: number;
  ledger: PointTransaction[];
}

/** The two ways a debit transaction is forced to roll back. */
type Scenario =
  | { kind: 'insufficient'; initialBalance: number; debitAmount: number }
  | { kind: 'inject-error'; initialBalance: number; validDebit: number };

/** Sentinel error injected mid-transaction to force a rollback (Req 14.3). */
class InjectedError extends Error {
  constructor() {
    super('injected mid-transaction failure');
    this.name = 'InjectedError';
  }
}

/**
 * A debit that strictly exceeds the balance: `initial` in [0, 1e6], the debit is
 * `initial + excess` with `excess >= 1`, so it always overshoots (and is > 0, so
 * the non-positive-amount guard never short-circuits before the balance check).
 */
const arbInsufficient: fc.Arbitrary<Scenario> = fc
  .record({
    initialBalance: fc.integer({ min: 0, max: 1_000_000 }),
    excess: fc.integer({ min: 1, max: 1_000_000 }),
  })
  .map(({ initialBalance, excess }) => ({
    kind: 'insufficient' as const,
    initialBalance,
    debitAmount: initialBalance + excess,
  }));

/**
 * A valid debit (1..balance) that SUCCEEDS inside the tx, then an error is
 * thrown. `initial` in [1, 1e6] so at least one affordable debit always exists.
 */
const arbInjectError: fc.Arbitrary<Scenario> = fc
  .integer({ min: 1, max: 1_000_000 })
  .chain((initialBalance) =>
    fc.integer({ min: 1, max: initialBalance }).map((validDebit) => ({
      kind: 'inject-error' as const,
      initialBalance,
      validDebit,
    })),
  );

const arbScenario: fc.Arbitrary<Scenario> = fc.oneof(
  arbInsufficient,
  arbInjectError,
);

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Property 2: 차감 원자성 (롤백 불변) — debit atomicity / rollback invariance',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;
    let userId: string;
    const email = `pbt-debit-atomicity-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    beforeAll(async () => {
      harness = createTestDb();
      admin = createServiceRoleClient();

      // Create a real auth user: profiles.id -> auth.users(id) is a FK, and the
      // handle_new_user trigger provisions the profile + zero-balance wallet.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
        email_confirm: true,
        user_metadata: { display_name: 'PBT Debit Atomicity User' },
      });
      if (error || !data.user) {
        throw new Error(
          `failed to create test auth user: ${error?.message ?? 'no user returned'}`,
        );
      }
      userId = data.user.id;

      // Confirm the trigger provisioned the wallet the property depends on.
      const [wallet] = await harness.db
        .select()
        .from(pointWallets)
        .where(eq(pointWallets.userId, userId));
      if (!wallet) {
        throw new Error(
          'handle_new_user trigger did not provision a point_wallet for the test user',
        );
      }
    }, 60_000);

    afterAll(async () => {
      // Deleting the auth user cascades to profile -> wallet; clear the ledger
      // first since point_transactions.user_id has no ON DELETE cascade.
      if (admin && userId) {
        await harness?.db
          .delete(pointTransactions)
          .where(eq(pointTransactions.userId, userId))
          .catch(() => {});
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      await harness?.close();
    });

    /** Read the user's balance + full ledger for an all-or-nothing comparison. */
    async function snapshot(db: TestDb['db']): Promise<WalletSnapshot> {
      const balance = await getWalletBalance(db, userId);
      const ledger = await getTransactionHistory(db, userId);
      return { balance, ledger };
    }

    it(
      'leaves wallet balance + point_transactions ledger completely identical when a debit tx aborts (over-debit throws INSUFFICIENT_POINTS)',
      async () => {
        const { db } = harness;

        await fc.assert(
          fc.asyncProperty(arbScenario, async (scenario) => {
            // --- Arrange: build a known, committed pre-op state -------------
            // Clean slate, then seed the balance with a REAL committed credit so
            // the baseline ledger is non-empty whenever initialBalance > 0. This
            // makes the "identical ledger" assertion prove two things at once:
            // no pre-existing row is disturbed AND no orphan row is appended.
            await db
              .delete(pointTransactions)
              .where(eq(pointTransactions.userId, userId));
            await db
              .update(pointWallets)
              .set({ balance: 0, updatedAt: new Date() })
              .where(eq(pointWallets.userId, userId));

            if (scenario.initialBalance > 0) {
              await db.transaction((tx) =>
                creditPoints(
                  tx,
                  userId,
                  scenario.initialBalance,
                  'streak_bonus',
                  'PBT baseline credit',
                ),
              );
            }

            const before = await snapshot(db);
            // Sanity: the committed baseline is exactly what we expect.
            expect(before.balance).toBe(scenario.initialBalance);
            expect(before.ledger).toHaveLength(
              scenario.initialBalance > 0 ? 1 : 0,
            );

            // --- Act: run the aborting transaction, capturing the throw -----
            let caught: unknown;
            try {
              if (scenario.kind === 'insufficient') {
                await db.transaction(async (tx) => {
                  await debitPoints(
                    tx,
                    userId,
                    scenario.debitAmount,
                    'challenge_join',
                    'PBT: debit exceeding balance',
                  );
                });
              } else {
                await db.transaction(async (tx) => {
                  // A VALID debit: performs wallet UPDATE + ledger INSERT in-tx.
                  await debitPoints(
                    tx,
                    userId,
                    scenario.validDebit,
                    'challenge_join',
                    'PBT: valid debit then injected error',
                  );
                  // ...then fail mid-transaction, forcing a FULL rollback.
                  throw new InjectedError();
                });
              }
            } catch (error) {
              caught = error;
            }

            // --- Assert 1: the operation must have failed (never silent) ----
            expect(caught).toBeDefined();
            if (scenario.kind === 'insufficient') {
              // Req 5.2 / 12.2: a shortfall raises INSUFFICIENT_POINTS.
              expect(isDomainErr(caught) && caught.code).toBe(
                'INSUFFICIENT_POINTS',
              );
            } else {
              // Req 14.3: the arbitrary mid-tx error propagates out unchanged.
              expect(caught).toBeInstanceOf(InjectedError);
            }

            // --- Assert 2: all-or-nothing — state identical to pre-op -------
            const after = await snapshot(db);
            expect(after.balance).toBe(before.balance);
            expect(after.balance).toBe(scenario.initialBalance);
            // No partial UPDATE, no orphan ledger row: the ledger is unchanged
            // both in length and row-for-row content.
            expect(after.ledger).toHaveLength(before.ledger.length);
            expect(after.ledger).toEqual(before.ledger);
          }),
          fcParams,
        );
      },
      300_000,
    );
  },
);
