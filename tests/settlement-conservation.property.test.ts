import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import { createServiceRoleClient } from './helpers/supabaseClient';
import {
  challenges,
  participations,
  rewardPools,
  settlements,
  paymentTransactions,
  badges,
  pointWallets,
  pointTransactions,
} from '../src/db/schema';
import { settleChallenge } from '../src/domain/settlement';

/**
 * Feature: survival-study-challenge
 * Property 3: 정산 보존식 (settlement conservation identity)
 *
 * *For any* 완주자·탈락자 구성에 대해, 정산 후
 *   `Σ(refund) + Σ(reward) + service_fee == Σ(deposit)`
 * 이 성립한다. (design.md → "Correctness Properties" / Property 3.
 * `settleChallenge` 커밋 직전 애플리케이션 보존식 검증 + 불일치 시
 * `CONSERVATION_VIOLATED` 예외 → 롤백이 강제)
 *
 * This exercises the REAL settlement write path `settleChallenge`
 * (src/domain/settlement.ts) against the REMOTE Supabase Postgres via the
 * Drizzle transaction client — the whole finisher-confirmation + refund/reward
 * distribution + conservation check runs inside ONE `db.transaction()`, exactly
 * as production callers use it (no mocks).
 *
 * Rather than trust settlement's OWN in-transaction `CONSERVATION_VIOLATED`
 * guard, this test INDEPENDENTLY re-proves the identity from persisted state
 * after the fact: it reads back every `settlements` row (refund + reward per
 * finisher) and the retained `reward_pools.service_fee`, then asserts
 *   round(Σrefund) + round(Σreward) + round(service_fee) == round(Σdeposit)
 * to the exact whole-point unit.
 *
 * Coverage across the generated composition:
 *   - all challenge refunds + rewards flow through creditPoints;
 *   - arbitrary finisher/eliminated split, arbitrary deposits, arbitrary
 *     service-fee rate (incl. 0 and 100%), dust folded into the fee;
 *   - the no-finisher case (all eliminated) under BOTH no_winner_policy values
 *     (`forfeit` → whole pool retained as fee; `refund` → every deposit returned).
 *
 * **Validates: Requirements 9.1, 9.2, 10.1, 14.1**
 */

/** Upper bound on participants per challenge (== size of the reusable user pool). */
const MAX_PARTICIPANTS = 5;

/** One generated participant: a finisher or an eliminee, plus an integer deposit. */
interface GenParticipant {
  isFinisher: boolean;
  /** Deposit in whole points. */
  depositMinor: number;
}

/** A generated challenge composition to settle. */
interface Composition {
  depositKind: 'point';
  /** Service-fee rate in basis points (0..10000 == 0%..100%). */
  feeRateBps: number;
  noWinnerPolicy: 'forfeit' | 'refund';
  participants: GenParticipant[];
}

const arbParticipant: fc.Arbitrary<GenParticipant> = fc.record({
  isFinisher: fc.boolean(),
  depositMinor: fc.integer({ min: 1, max: 100_000 }),
});

const arbComposition: fc.Arbitrary<Composition> = fc.record({
  depositKind: fc.constant('point' as const),
  feeRateBps: fc.integer({ min: 0, max: 10_000 }),
  noWinnerPolicy: fc.constantFrom('forfeit' as const, 'refund' as const),
  participants: fc.array(arbParticipant, {
    minLength: 1,
    maxLength: MAX_PARTICIPANTS,
  }),
});

/**
 * Explicit corner cases, always run in addition to the random search, so the
 * hard-to-hit branches (all-eliminated under each policy, dust folding and a
 * zero pool) are deterministically covered every run.
 */
const compositionExamples: [Composition][] = [
  // No finishers + forfeit: whole pool retained as service fee.
  [
    {
      depositKind: 'point',
      feeRateBps: 1000,
      noWinnerPolicy: 'forfeit',
      participants: [
        { isFinisher: false, depositMinor: 100 },
        { isFinisher: false, depositMinor: 250 },
      ],
    },
  ],
  // No finishers + refund: every deposit returned to its owner, fee 0.
  [
    {
      depositKind: 'point',
      feeRateBps: 1000,
      noWinnerPolicy: 'refund',
      participants: [
        { isFinisher: false, depositMinor: 100 },
        { isFinisher: false, depositMinor: 250 },
      ],
    },
  ],
  // Single finisher among eliminees (point): forces dust folding into the fee.
  [
    {
      depositKind: 'point',
      feeRateBps: 1000,
      noWinnerPolicy: 'forfeit',
      participants: [
        { isFinisher: true, depositMinor: 333 },
        { isFinisher: false, depositMinor: 667 },
        { isFinisher: false, depositMinor: 1000 },
      ],
    },
  ],
  // All finishers: pool 0, fee 0, refunds == own deposits.
  [
    {
      depositKind: 'point',
      feeRateBps: 1000,
      noWinnerPolicy: 'forfeit',
      participants: [
        { isFinisher: true, depositMinor: 12_345 },
        { isFinisher: true, depositMinor: 6_789 },
      ],
    },
  ],
  // Finishers + one eliminee: exercises point reward distribution.
  [
    {
      depositKind: 'point',
      feeRateBps: 2500,
      noWinnerPolicy: 'forfeit',
      participants: [
        { isFinisher: true, depositMinor: 10_000 },
        { isFinisher: true, depositMinor: 10_000 },
        { isFinisher: true, depositMinor: 10_000 },
        { isFinisher: false, depositMinor: 10_000 },
      ],
    },
  ],
];

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Property 3: 정산 보존식 (settlement conservation identity)',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;
    /** Reusable pool of real auth users → distinct participants per challenge. */
    let userPool: string[] = [];
    /** A separate Host for point (user) challenges. */
    let hostId: string;
    /** Challenges created this run, cleaned in afterAll even if an iteration throws. */
    const createdChallengeIds: string[] = [];

    /** Create a real auth user (fires handle_new_user → profile + zero wallet). */
    async function createUser(tag: string): Promise<string> {
      const email = `pbt-settle-${tag}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
        email_confirm: true,
        user_metadata: { display_name: `PBT Settle ${tag}` },
      });
      if (error || !data.user) {
        throw new Error(
          `failed to create test auth user: ${error?.message ?? 'no user returned'}`,
        );
      }
      return data.user.id;
    }

    beforeAll(async () => {
      harness = createTestDb();
      admin = createServiceRoleClient();

      hostId = await createUser('host');
      userPool = [];
      for (let i = 0; i < MAX_PARTICIPANTS; i++) {
        userPool.push(await createUser(`p${i}`));
      }

      // Confirm the trigger provisioned wallets the point payouts depend on.
      for (const uid of [hostId, ...userPool]) {
        const [wallet] = await harness.db
          .select()
          .from(pointWallets)
          .where(eq(pointWallets.userId, uid));
        if (!wallet) {
          throw new Error(
            `handle_new_user trigger did not provision a wallet for ${uid}`,
          );
        }
      }
    }, 120_000);

    afterAll(async () => {
      const { db } = harness ?? {};
      if (db) {
        // Remove any leaked challenges (from a failing iteration) in FK-safe
        // order so the users below can then be deleted cleanly.
        for (const cid of createdChallengeIds) {
          await cleanupChallenge(cid).catch(() => {});
        }
        // point_transactions has no ON DELETE cascade to profiles/wallets, so
        // clear each user's ledger before deleting the users.
        for (const uid of [hostId, ...userPool]) {
          if (uid) {
            await db
              .delete(pointTransactions)
              .where(eq(pointTransactions.userId, uid))
              .catch(() => {});
          }
        }
      }
      if (admin) {
        for (const uid of [hostId, ...userPool]) {
          if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {});
        }
      }
      await harness?.close();
    });

    /**
     * Delete everything tied to a challenge in FK-safe order. `settlements`,
     * `payment_transactions`, and `badges` reference `challenges` without an
     * ON DELETE cascade, so they must go first; deleting the challenge then
     * cascades participations → (daily_verifications, learning_reports) and the
     * reward_pool. Point ledger rows carry the challenge id as `ref_id`.
     */
    async function cleanupChallenge(cid: string): Promise<void> {
      const { db } = harness;
      await db.delete(settlements).where(eq(settlements.challengeId, cid));
      await db
        .delete(paymentTransactions)
        .where(eq(paymentTransactions.challengeId, cid));
      await db.delete(badges).where(eq(badges.challengeId, cid));
      await db.delete(pointTransactions).where(eq(pointTransactions.refId, cid));
      await db.delete(challenges).where(eq(challenges.id, cid));
    }

    it(
      'round(Σrefund) + round(Σreward) + round(service_fee) == round(Σdeposit) for any finisher/eliminated composition',
      async () => {
        const { db } = harness;

        // Build the run options explicitly typed to THIS property's argument
        // tuple (`[Composition]`). Spreading `fcParams` (typed
        // `fc.Parameters<unknown>`) directly would surface an overload error:
        // `Parameters<unknown>.reporter` is invariant in its type parameter, so
        // it is not assignable to `Parameters<[Composition]>`. Pulling only the
        // concrete `numRuns` and annotating the tuple type keeps the
        // deterministic `examples` while satisfying the async-property overload.
        const runOptions: fc.Parameters<[Composition]> = {
          numRuns: fcParams.numRuns,
          examples: compositionExamples,
        };

        await fc.assert(
          fc.asyncProperty(arbComposition, async (comp) => {
            // Point-unit helpers mirroring settleChallenge's convention.
            const toMinor = (v: string): number => Math.round(Number(v));
            const depositStr = (m: number): string => String(m);

            const n = comp.participants.length;
            const finisherCount = comp.participants.filter(
              (p) => p.isFinisher,
            ).length;
            const eliminatedCount = n - finisherCount;
            const totalDepositMinor = comp.participants.reduce(
              (s, p) => s + p.depositMinor,
              0,
            );

            // --- Arrange: a fresh challenge reflecting the composition -------
            // Point challenge with a host. status='ended' (settleable).
            const [{ id: cid }] = await db
              .insert(challenges)
              .values({
                kind: 'user',
                title: 'PBT settlement conservation',
                hostId,
                status: 'ended',
                startDate: '2025-01-01',
                endDate: '2025-01-31',
                dailyStudyMinutes: 60,
                verificationDeadlineTime: '23:59',
                capacity: 100,
                depositKind: comp.depositKind,
                entryAmount: '0',
                serviceFeeRate: (comp.feeRateBps / 10_000).toFixed(4),
                noWinnerPolicy: comp.noWinnerPolicy,
              })
              .returning({ id: challenges.id });
            createdChallengeIds.push(cid);

            // The reward pool row settlement finalizes (exists in production
            // from challenge creation / first join).
            await db.insert(rewardPools).values({
              challengeId: cid,
              depositKind: comp.depositKind,
            });

            // Participations: finishers left 'alive' (settlement confirms them
            // alive → completed per Req 8.4); eliminees 'eliminated' + a date
            // (elim_date_consistency CHECK). Distinct users from the pool.
            await db.insert(participations).values(
              comp.participants.map((p, i) => ({
                challengeId: cid,
                userId: userPool[i],
                survivalStatus: p.isFinisher
                  ? ('alive' as const)
                  : ('eliminated' as const),
                depositKind: comp.depositKind,
                depositAmount: depositStr(p.depositMinor),
                eliminatedOn: p.isFinisher ? null : '2025-01-15',
              })),
            );

            // --- Act: settle for real (its own tx + conservation guard) ------
            const summary = await settleChallenge(db, cid);

            // --- Assert: INDEPENDENTLY re-prove conservation from state ------
            const settleRows = await db
              .select({
                refundAmount: settlements.refundAmount,
                rewardAmount: settlements.rewardAmount,
              })
              .from(settlements)
              .where(eq(settlements.challengeId, cid));

            const [pool] = await db
              .select({ serviceFee: rewardPools.serviceFee })
              .from(rewardPools)
              .where(eq(rewardPools.challengeId, cid));

            const sumRefundMinor = settleRows.reduce(
              (s, r) => s + toMinor(r.refundAmount),
              0,
            );
            const sumRewardMinor = settleRows.reduce(
              (s, r) => s + toMinor(r.rewardAmount),
              0,
            );
            const serviceFeeMinor = toMinor(pool.serviceFee);

            // THE conservation identity (Req 14.1 / 9.1 / 9.2 / 10.1), exact to
            // the minor unit.
            expect(sumRefundMinor + sumRewardMinor + serviceFeeMinor).toBe(
              totalDepositMinor,
            );

            // Sanity: the summary agrees with the composition, and the number
            // of settlement rows matches the branch taken.
            expect(summary.finisherCount).toBe(finisherCount);
            expect(summary.eliminatedCount).toBe(eliminatedCount);
            const expectedSettleRows =
              finisherCount > 0
                ? finisherCount
                : comp.noWinnerPolicy === 'refund'
                  ? n
                  : 0;
            expect(settleRows).toHaveLength(expectedSettleRows);

            // --- Cleanup this iteration --------------------------------------
            await cleanupChallenge(cid);
            createdChallengeIds.splice(createdChallengeIds.indexOf(cid), 1);
          }),
          runOptions,
        );
      },
      600_000,
    );
  },
);
