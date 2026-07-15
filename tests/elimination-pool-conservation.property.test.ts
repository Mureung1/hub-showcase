import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import { createServiceRoleClient } from './helpers/supabaseClient';
import {
  challenges,
  participations,
  rewardPools,
  dailyVerifications,
} from '../src/db/schema';
import { processDailyEliminations } from '../src/domain/eliminations';

/**
 * Feature: survival-study-challenge
 * Property 7: 탈락 예치금의 Reward_Pool 보존 (forfeited-deposit pool conservation)
 *
 * *For any* 탈락 처리 실행에 대해, `reward_pools.pool_amount` 의 증가분은 이번에
 * 탈락한 참가자들의 `deposit_amount` 합과 정확히 일치한다. (design.md →
 * "Correctness Properties" / Property 7)
 *
 * This exercises the REAL batch function `processDailyEliminations`
 * (src/domain/eliminations.ts) against the REMOTE Supabase Postgres via the
 * Drizzle write path. Each iteration builds a fresh `in_progress` challenge
 * whose single day's Verification_Deadline is already in the past relative to a
 * fixed `runTime`, populates it with an arbitrary set of `alive` participants
 * (arbitrary deposits, arbitrary verified/unverified), then:
 *   1. records `reward_pools.pool_amount` BEFORE,
 *   2. runs `processDailyEliminations(db, runTime)`,
 *   3. asserts (pool_after − pool_before) equals EXACTLY the sum of the
 *      deposits of the participants whose `survival_status` transitioned
 *      `alive → eliminated` in this run (the transitioned set is derived from
 *      the actual before/after DB snapshots, not from the generator's intent,
 *      so the property stands on its own), and
 *   4. asserts idempotency: a second run against the same `runTime` folds
 *      nothing further into the pool (delta == 0).
 *
 * The assertion is scoped to THIS challenge's pool + participations, so
 * unrelated challenges that may exist in the shared remote DB cannot perturb it.
 *
 * Money is compared in exact minor units (integer cents) to avoid any
 * floating-point ambiguity on the `numeric(14,2)` columns.
 *
 * **Validates: Requirements 8.2**
 */

// A single past day keeps the elimination selection unambiguous: the ONLY day
// in [start_date, end_date] is TARGET_DATE, whose deadline (23:59 UTC) is well
// before RUN_TIME — so an `alive` participant is eliminated iff they have no
// `completed` verification for that one day.
const TARGET_DATE = '2020-06-15';
const DEADLINE_TIME = '23:59:00';
const TZ = 'UTC';
const RUN_TIME = new Date('2020-06-16T12:00:00.000Z');

// Reuse a fixed pool of real auth users across iterations (user creation is the
// only heavy per-fixture cost). Each iteration uses a FRESH challenge, so
// reusing users never trips uq_participation(challenge_id, user_id).
const MAX_PARTICIPANTS = 5;

/** cents (exact integer minor units) → `numeric(14,2)` string, e.g. 123456 → "1234.56". */
function centsToNumeric(cents: number): string {
  const whole = Math.floor(cents / 100);
  const frac = cents % 100;
  return `${whole}.${String(frac).padStart(2, '0')}`;
}

/** `numeric(14,2)` value (string/number) → exact integer cents. */
function numericToCents(v: string | number): number {
  return Math.round(Number(v) * 100);
}

/** One generated participant: an exact-cents deposit and whether they verify. */
type ParticipantSpec = { depositCents: number; verified: boolean };

/**
 * Smart generator: an arbitrary starting pool balance plus 1..MAX_PARTICIPANTS
 * participants, each with an arbitrary deposit (0..1,000,000.00, in exact cents)
 * and an arbitrary verified flag. A non-zero starting pool means the property
 * genuinely tests that the function ADDS to the pool rather than overwrites it.
 * Deposits are bounded so that even a full field plus the seeded pool stays well
 * inside numeric(14,2).
 */
const arbScenario = fc.record({
  initialPoolCents: fc.integer({ min: 0, max: 100_000_000 }),
  participants: fc.array(
    fc.record({
      depositCents: fc.integer({ min: 0, max: 100_000_000 }),
      verified: fc.boolean(),
    }),
    { minLength: 1, maxLength: MAX_PARTICIPANTS },
  ),
});

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Property 7: 탈락 예치금의 Reward_Pool 보존 (forfeited-deposit pool conservation)',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;
    const userIds: string[] = [];

    beforeAll(async () => {
      harness = createTestDb();
      admin = createServiceRoleClient();

      // Provision a fixed pool of real auth users. The handle_new_user trigger
      // atomically creates each profile (+ zero-balance wallet) that
      // participations.user_id -> profiles.id requires.
      for (let i = 0; i < MAX_PARTICIPANTS; i++) {
        const email = `pbt-elim-pool-${Date.now()}-${i}-${Math.random()
          .toString(36)
          .slice(2)}@example.com`;
        const { data, error } = await admin.auth.admin.createUser({
          email,
          password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
          email_confirm: true,
          user_metadata: { display_name: `PBT Elim Pool User ${i}` },
        });
        if (error || !data.user) {
          throw new Error(
            `failed to create test auth user #${i}: ${error?.message ?? 'no user returned'}`,
          );
        }
        userIds.push(data.user.id);
      }
    }, 120_000);

    afterAll(async () => {
      // Deleting each auth user cascades profile -> wallet (and any stray
      // participation, though each iteration already drops its own challenge).
      if (admin) {
        for (const id of userIds) {
          await admin.auth.admin.deleteUser(id).catch(() => {});
        }
      }
      await harness?.close();
    });

    it(
      'pool_amount increase == Σ(deposit) of exactly the participants that transitioned alive→eliminated; a repeat run folds nothing further',
      async () => {
        const { db } = harness;

        await fc.assert(
          fc.asyncProperty(arbScenario, async ({ initialPoolCents, participants }) => {
            const specs: ParticipantSpec[] = participants.slice(0, userIds.length);
            const challengeId = randomUUID();

            try {
              // --- Arrange: a fresh in_progress challenge whose one day's
              // deadline is already past relative to RUN_TIME ----------------
              await db.insert(challenges).values({
                id: challengeId,
                kind: 'official', // official + cash needs no host row
                title: `PBT elim-pool ${challengeId}`,
                status: 'in_progress',
                startDate: TARGET_DATE,
                endDate: TARGET_DATE,
                dailyStudyMinutes: 60,
                verificationDeadlineTime: DEADLINE_TIME,
                timezone: TZ,
                capacity: 100,
                depositKind: 'cash',
                entryAmount: '0',
              });

              // Seed the pool at an arbitrary non-zero baseline so the property
              // tests an INCREASE, not an overwrite.
              await db.insert(rewardPools).values({
                challengeId,
                depositKind: 'cash',
                totalDeposit: '0',
                poolAmount: centsToNumeric(initialPoolCents),
                serviceFee: '0',
              });

              // One alive participant per spec, each on a distinct pooled user.
              const partRows = specs.map((s, i) => ({
                id: randomUUID(),
                challengeId,
                userId: userIds[i],
                survivalStatus: 'alive' as const,
                depositKind: 'cash' as const,
                depositAmount: centsToNumeric(s.depositCents),
              }));
              await db.insert(participations).values(partRows);

              // Verified participants get a `completed` verification for the
              // target day -> they must survive. Unverified ones have none ->
              // they must be eliminated (their deposit folded into the pool).
              const verifRows = partRows
                .filter((_, i) => specs[i].verified)
                .map((row) => ({
                  participationId: row.id,
                  verifyDate: TARGET_DATE,
                  state: 'completed' as const,
                }));
              if (verifRows.length > 0) {
                await db.insert(dailyVerifications).values(verifRows);
              }

              // --- Snapshot BEFORE --------------------------------------------
              const [poolBeforeRow] = await db
                .select({ poolAmount: rewardPools.poolAmount })
                .from(rewardPools)
                .where(eq(rewardPools.challengeId, challengeId));
              const beforeParts = await db
                .select({
                  id: participations.id,
                  status: participations.survivalStatus,
                })
                .from(participations)
                .where(eq(participations.challengeId, challengeId));
              const beforeStatus = new Map(
                beforeParts.map((p) => [p.id, p.status]),
              );

              // --- Act --------------------------------------------------------
              await processDailyEliminations(db, RUN_TIME);

              // --- Snapshot AFTER ---------------------------------------------
              const [poolAfterRow] = await db
                .select({ poolAmount: rewardPools.poolAmount })
                .from(rewardPools)
                .where(eq(rewardPools.challengeId, challengeId));
              const afterParts = await db
                .select({
                  id: participations.id,
                  status: participations.survivalStatus,
                  deposit: participations.depositAmount,
                })
                .from(participations)
                .where(eq(participations.challengeId, challengeId));

              // Transitioned set = alive (before) -> eliminated (after), derived
              // straight from the DB so the property does not lean on fixture
              // intent.
              const transitioned = afterParts.filter(
                (p) =>
                  beforeStatus.get(p.id) === 'alive' && p.status === 'eliminated',
              );
              const expectedDeltaCents = transitioned.reduce(
                (sum, p) => sum + numericToCents(p.deposit),
                0,
              );

              const poolBefore = numericToCents(poolBeforeRow.poolAmount);
              const poolAfter = numericToCents(poolAfterRow.poolAmount);

              // THE property: pool increase == Σ deposits of the transitioned.
              expect(poolAfter - poolBefore).toBe(expectedDeltaCents);

              // Fixture completeness cross-check: the participants that
              // transitioned are EXACTLY the unverified ones (Req 8.1/8.2 tie).
              const expectedEliminatedIds = new Set(
                partRows.filter((_, i) => !specs[i].verified).map((r) => r.id),
              );
              const actualEliminatedIds = new Set(transitioned.map((p) => p.id));
              expect(actualEliminatedIds).toEqual(expectedEliminatedIds);

              // --- Idempotency: a repeat run folds nothing further ------------
              await processDailyEliminations(db, RUN_TIME);
              const [poolAfter2Row] = await db
                .select({ poolAmount: rewardPools.poolAmount })
                .from(rewardPools)
                .where(eq(rewardPools.challengeId, challengeId));
              const poolAfter2 = numericToCents(poolAfter2Row.poolAmount);
              expect(poolAfter2 - poolAfter).toBe(0);
            } finally {
              // Per-iteration cleanup: dropping the challenge cascades its
              // participations -> daily_verifications and its reward_pool. Runs
              // even on assertion failure so the shared remote DB stays clean.
              await db
                .delete(challenges)
                .where(eq(challenges.id, challengeId))
                .catch(() => {});
            }
          }),
          fcParams,
        );
      },
      600_000,
    );
  },
);
