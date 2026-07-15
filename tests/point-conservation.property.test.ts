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
} from '../src/domain/points';

/**
 * Feature: survival-study-challenge
 * Property 1: 포인트 보존 (point conservation)
 *
 * For any 지갑에 대한 적립/차감 연산 시퀀스에 대해, 최종 잔액은
 * `초기 잔액 + Σ(적립) − Σ(차감)` 과 일치하고, 모든 중간 시점에서 잔액은 0 이상이며,
 * 각 연산은 정확히 하나의 point_transactions 원장 행(부호 있는 amount, balance_after)을
 * 남긴다. (design.md → "Correctness Properties" / Property 1)
 *
 * This exercises the REAL transaction functions `creditPoints` / `debitPoints`
 * (src/domain/points.ts) against the REMOTE Supabase Postgres via the Drizzle
 * write path — each operation runs inside its own `db.transaction()` so the
 * `SELECT ... FOR UPDATE` wallet lock + wallet UPDATE + ledger INSERT are
 * applied atomically, exactly as production callers compose them.
 *
 * **Validates: Requirements 5.1, 11.5, 12.1, 12.5, 14.2**
 */

/** One measured wallet operation. */
type Op = { kind: 'credit' | 'debit'; amount: number };

/**
 * Smart generator: an arbitrary initial balance plus a sequence of operations
 * where every debit is affordable at the moment it runs (clamped to the running
 * balance). This constrains the input to the space the property describes —
 * every operation SUCCEEDS and therefore appends exactly one ledger row — so a
 * single failing operation (which would append zero rows and violate the
 * "one row per operation" invariant) is never generated. Insufficient-balance
 * rollback is covered separately by Property 2 (차감 원자성).
 */
const arbScenario = fc
  .record({
    initial: fc.integer({ min: 0, max: 1_000_000 }),
    raw: fc.array(
      fc.record({
        kind: fc.constantFrom('credit' as const, 'debit' as const),
        amount: fc.integer({ min: 1, max: 500_000 }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  })
  .map(({ initial, raw }) => {
    let running = initial;
    const ops: Op[] = [];
    for (const op of raw) {
      if (op.kind === 'credit') {
        ops.push({ kind: 'credit', amount: op.amount });
        running += op.amount;
      } else {
        // Clamp the debit to what is currently affordable; drop zero-amount
        // debits (nothing to withdraw) so every emitted op moves the balance.
        const amount = Math.min(op.amount, running);
        if (amount > 0) {
          ops.push({ kind: 'debit', amount });
          running -= amount;
        }
      }
    }
    return { initial, ops };
  })
  .filter((s) => s.ops.length > 0);

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)('Property 1: 포인트 보존 (point conservation)', () => {
  let harness: TestDb;
  let admin: SupabaseClient;
  let userId: string;
  const email = `pbt-points-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

  beforeAll(async () => {
    harness = createTestDb();
    admin = createServiceRoleClient();

    // Create a real auth user: profiles.id -> auth.users(id) is a FK, and the
    // handle_new_user trigger provisions the profile + zero-balance wallet.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
      email_confirm: true,
      user_metadata: { display_name: 'PBT Points User' },
    });
    if (error || !data.user) {
      throw new Error(`failed to create test auth user: ${error?.message ?? 'no user returned'}`);
    }
    userId = data.user.id;

    // Confirm the trigger provisioned the wallet the property depends on.
    const [wallet] = await harness.db
      .select()
      .from(pointWallets)
      .where(eq(pointWallets.userId, userId));
    if (!wallet) {
      throw new Error('handle_new_user trigger did not provision a point_wallet for the test user');
    }
  }, 60_000);

  afterAll(async () => {
    // Deleting the auth user cascades to profile -> wallet -> ledger rows.
    if (admin && userId) {
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    }
    await harness?.close();
  });

  it(
    'final balance == initial + Σcredit − Σdebit; every intermediate balance >= 0; exactly one ledger row per operation',
    async () => {
      const { db } = harness;

      await fc.assert(
        fc.asyncProperty(arbScenario, async ({ initial, ops }) => {
          // --- Arrange (setup, not a measured operation) -------------------
          // Clean the ledger and pin the wallet to the arbitrary initial
          // balance directly (no ledger row), so the row count below reflects
          // ONLY the measured operations.
          await db.delete(pointTransactions).where(eq(pointTransactions.userId, userId));
          await db
            .update(pointWallets)
            .set({ balance: initial, updatedAt: new Date() })
            .where(eq(pointWallets.userId, userId));

          // --- Act + assert intermediate invariants ------------------------
          let expected = initial;
          let sumCredit = 0;
          let sumDebit = 0;

          for (const op of ops) {
            const newBalance = await db.transaction((tx) =>
              op.kind === 'credit'
                ? creditPoints(tx, userId, op.amount, 'streak_bonus', 'pbt credit')
                : debitPoints(tx, userId, op.amount, 'challenge_join', 'pbt debit'),
            );

            if (op.kind === 'credit') {
              expected += op.amount;
              sumCredit += op.amount;
            } else {
              expected -= op.amount;
              sumDebit += op.amount;
            }

            // Intermediate balance is exactly the running model value and is
            // never negative (Req 12.1, 14.2).
            expect(newBalance).toBe(expected);
            expect(newBalance).toBeGreaterThanOrEqual(0);
          }

          // --- Assert final invariants -------------------------------------
          // Conservation: final == initial + Σcredit − Σdebit (Req 5.1, 14.2).
          const finalBalance = await getWalletBalance(db, userId);
          expect(finalBalance).toBe(initial + sumCredit - sumDebit);

          const history = await getTransactionHistory(db, userId);

          // Exactly one append-only ledger row per operation (Req 11.5, 12.5).
          expect(history).toHaveLength(ops.length);

          // Ledger is internally consistent: the signed amounts sum to the net
          // change, every balance_after is non-negative, and the most-recent
          // row snapshots the final balance.
          const ledgerNet = history.reduce((sum, row) => sum + row.amount, 0);
          expect(ledgerNet).toBe(finalBalance - initial);
          expect(history.every((row) => row.balanceAfter >= 0)).toBe(true);
          expect(history[0]?.balanceAfter).toBe(finalBalance);
        }),
        fcParams,
      );
    },
    300_000,
  );
});
