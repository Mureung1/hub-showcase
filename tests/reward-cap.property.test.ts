import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq, inArray } from 'drizzle-orm';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import {
  challenges,
  participations,
  pointTransactions,
  pointWallets,
  rewardPools,
  settlements,
  badges,
} from '../src/db/schema';
import { createUserChallenge } from '../src/domain/challenges';
import { settleChallenge } from '../src/domain/settlement';

/**
 * Feature: survival-study-challenge
 * Property 4: 보상 상한 (reward cap)
 *
 * *For any* 챌린지 구성(임의의 완주자/탈락자, 임의의 예치금, [0,1] 범위의
 * service_fee_rate)에 대해, 완주자에게 분배되는 추가 보상 총액은
 * `pool_amount − service_fee` 를 초과하지 않는다.
 * (design.md → "Correctness Properties" / Property 4)
 *
 * This exercises the REAL settlement transaction function `settleChallenge`
 * (src/domain/settlement.ts) against the REMOTE Supabase Postgres via the
 * Drizzle write path. Each iteration seeds an arbitrary participant composition
 * directly into `participations` (finishers as `alive` — settlement confirms
 * them to `completed`; losers as `eliminated`, whose deposits form the
 * redistributable pool), varies the challenge's `service_fee_rate` across the
 * whole [0,1] range to hit the cap boundary, runs the genuine
 * `db.transaction()` settlement, then reads the persisted `settlements` +
 * `reward_pools` rows back to check the cap.
 *
 * All amounts are whole POINTS (this is a point-based User_Challenge), so the
 * settlement's minor unit is the whole point and every stored `numeric(14,2)`
 * value round-trips to an integer — the comparisons below are exact.
 *
 * Assertions per iteration:
 *   1. Reward cap (the property):   Σ(settlements.reward_amount) ≤ pool − fee.
 *   2. Non-negativity:              every reward_amount ≥ 0 (Req 14 backstop).
 *   3. Even-split invariant:        all finisher rewards are equal (dust is
 *                                   folded into the fee, so the split is exact).
 *   4. Cross-check the returned SettlementSummary agrees with the DB.
 *
 * **Validates: Requirements 9.4, 10.2**
 */

/** Max distinct participants per challenge (needs one distinct user each). */
const MAX_PARTICIPANTS = 5;

/** One generated participant: an integer point deposit + finisher/loser flag. */
interface GenParticipant {
  deposit: number;
  isFinisher: boolean;
}

/** A whole challenge composition: a service-fee rate + a participant set. */
interface Composition {
  /** service_fee_rate in [0,1] with numeric(5,4) precision (n / 10_000). */
  feeRate: number;
  participants: GenParticipant[];
}

/**
 * Smart generator constrained to the real settlement input space:
 *   - `feeRate` is `n / 10_000` for n in [0, 10_000], i.e. every 4-decimal value
 *     in [0.0000, 1.0000] — this sweeps the cap boundary (0 fee → whole pool
 *     distributable; 1.0 fee → nothing distributable) that Req 9.4/10.2 guard.
 *   - each deposit is a whole point in [0, 1_000_000] (points are integer units;
 *     0 exercises the empty-pool edge), and each participant is independently a
 *     finisher or a loser — so compositions range over all-finishers (pool = 0),
 *     all-eliminated (no-winner policy path), and every mix in between.
 */
const arbComposition: fc.Arbitrary<Composition> = fc.record({
  feeRate: fc.integer({ min: 0, max: 10_000 }).map((n) => n / 10_000),
  participants: fc.array(
    fc.record({
      deposit: fc.integer({ min: 0, max: 1_000_000 }),
      isFinisher: fc.boolean(),
    }),
    { minLength: 1, maxLength: MAX_PARTICIPANTS },
  ),
});

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)('Property 4: 보상 상한 (reward cap)', () => {
  let harness: TestDb;
  // A run-unique tag keeps this suite's fixtures disjoint from any other
  // settlement suite exercising settleChallenge concurrently (e.g. Task 9.3).
  const tag = `reward-cap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let hostId: string;
  const userIds: string[] = [];
  let challengeId: string;

  beforeAll(async () => {
    harness = createTestDb();

    // Provision the Host + a pool of distinct participants. Inserting into
    // auth.users fires the handle_new_user trigger, which atomically creates
    // each profile + zero-balance point_wallet the settlement pays out to.
    hostId = randomUUID();
    await harness.client`
      insert into auth.users (id, email, raw_user_meta_data)
      values (${hostId}, ${`${tag}-host@example.test`}, '{}'::jsonb)
    `;
    for (let i = 0; i < MAX_PARTICIPANTS; i++) {
      const id = randomUUID();
      userIds.push(id);
      await harness.client`
        insert into auth.users (id, email, raw_user_meta_data)
        values (${id}, ${`${tag}-user-${i}@example.test`}, '{}'::jsonb)
      `;
    }

    // One point-based User_Challenge, reused across iterations (its
    // reward_pools row is initialized here). Per-iteration state is reset in
    // the property body; the challenge/user fixtures are stable.
    challengeId = await createUserChallenge(harness.db, hostId, {
      title: 'Reward Cap PBT Challenge',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      dailyStudyMinutes: 60,
      verificationDeadlineTime: '23:59',
      capacity: MAX_PARTICIPANTS,
      entryPoints: 100,
    });
  }, 60_000);

  afterAll(async () => {
    if (harness) {
      // Tear down in FK-safe order: settlements/badges (no cascade to
      // challenge), ledger rows (no cascade to user), participations (cascades
      // learning_reports/daily_verifications), then the challenge (cascades
      // reward_pools) and finally the auth users (cascade → profiles → wallets).
      if (challengeId) {
        await harness.db
          .delete(settlements)
          .where(eq(settlements.challengeId, challengeId))
          .catch(() => {});
        await harness.db
          .delete(badges)
          .where(eq(badges.challengeId, challengeId))
          .catch(() => {});
      }
      if (userIds.length > 0) {
        await harness.db
          .delete(pointTransactions)
          .where(inArray(pointTransactions.userId, userIds))
          .catch(() => {});
      }
      if (challengeId) {
        await harness.db
          .delete(participations)
          .where(eq(participations.challengeId, challengeId))
          .catch(() => {});
        await harness.client`delete from challenges where id = ${challengeId}`.catch(
          () => {},
        );
      }
      for (const id of [...userIds, hostId]) {
        if (id) {
          await harness.client`delete from auth.users where id = ${id}`.catch(
            () => {},
          );
        }
      }
      await harness.close();
    }
  });

  /**
   * Reset all per-iteration settlement state so the challenge can be settled
   * afresh: clear settlements/badges/ledger/participations, zero the pool, and
   * reset the participants' wallets to a known 0 baseline.
   */
  async function resetIterationState(): Promise<void> {
    const { db } = harness;
    await db.delete(settlements).where(eq(settlements.challengeId, challengeId));
    await db.delete(badges).where(eq(badges.challengeId, challengeId));
    await db
      .delete(pointTransactions)
      .where(inArray(pointTransactions.userId, userIds));
    // Cascades learning_reports + daily_verifications for these participations.
    await db
      .delete(participations)
      .where(eq(participations.challengeId, challengeId));
    await db
      .update(rewardPools)
      .set({ totalDeposit: '0', poolAmount: '0', serviceFee: '0' })
      .where(eq(rewardPools.challengeId, challengeId));
    await db
      .update(pointWallets)
      .set({ balance: 0, updatedAt: new Date() })
      .where(inArray(pointWallets.userId, userIds));
  }

  it(
    'total additional reward never exceeds pool_amount − service_fee, rewards are non-negative, and the finisher split is even',
    async () => {
      const { db } = harness;

      await fc.assert(
        fc.asyncProperty(arbComposition, async (comp) => {
          const n = comp.participants.length;

          // --- Arrange: reset state, set the fee rate, seed participants -----
          await resetIterationState();

          // Re-open the challenge with the generated service_fee_rate (numeric
          // (5,4)); the prior iteration left it 'settled'.
          await db
            .update(challenges)
            .set({
              status: 'recruiting',
              serviceFeeRate: comp.feeRate.toFixed(4),
            })
            .where(eq(challenges.id, challengeId));

          for (let i = 0; i < n; i++) {
            const p = comp.participants[i];
            await db.insert(participations).values({
              challengeId,
              userId: userIds[i],
              // Finishers seed as 'alive' (settlement confirms → 'completed');
              // losers seed as 'eliminated' with the required eliminated_on.
              survivalStatus: p.isFinisher ? 'alive' : 'eliminated',
              depositKind: 'point',
              depositAmount: p.deposit.toFixed(2),
              eliminatedOn: p.isFinisher ? null : '2025-01-15',
            });
          }

          // --- Act: run the genuine settlement transaction -------------------
          const summary = await settleChallenge(db, challengeId);

          // --- Assert: read the persisted rows back and check the cap --------
          const settleRows = await db
            .select({ rewardAmount: settlements.rewardAmount })
            .from(settlements)
            .where(eq(settlements.challengeId, challengeId));
          const [pool] = await db
            .select({
              poolAmount: rewardPools.poolAmount,
              serviceFee: rewardPools.serviceFee,
            })
            .from(rewardPools)
            .where(eq(rewardPools.challengeId, challengeId));

          // Points → whole-point minor units; numeric(14,2) round-trips exactly.
          const rewards = settleRows.map((r) => Math.round(Number(r.rewardAmount)));
          const sumReward = rewards.reduce((s, x) => s + x, 0);
          const poolMinor = Math.round(Number(pool.poolAmount));
          const feeMinor = Math.round(Number(pool.serviceFee));

          // 1) Reward cap (Req 9.4 / 10.2 / Property 4).
          expect(sumReward).toBeLessThanOrEqual(poolMinor - feeMinor);

          // 2) Every additional reward is non-negative (Req 14 backstop).
          expect(rewards.every((x) => x >= 0)).toBe(true);

          // 3) Even split: the un-distributable dust is folded into the fee, so
          //    every finisher receives an identical additional reward.
          expect(new Set(rewards).size).toBeLessThanOrEqual(1);

          // 4) The returned summary must agree with the persisted DB figures.
          expect(summary.totalReward).toBe(sumReward);
          expect(summary.pool).toBe(poolMinor);
          expect(summary.serviceFee).toBe(feeMinor);
          expect(summary.totalReward).toBeLessThanOrEqual(
            summary.pool - summary.serviceFee,
          );
          if (rewards.length > 0) {
            // rewardPerFinisher is the single per-head reward the split produced.
            expect(rewards[0]).toBe(summary.rewardPerFinisher);
          }
        }),
        fcParams,
      );
    },
    300_000,
  );
});
