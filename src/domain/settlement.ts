/**
 * Challenge settlement domain function — design.md → "Challenge_Service"
 * (`settleChallenge`) and "서버 트랜잭션 도메인 함수" / "정산과 보존식 검증".
 *
 * This module owns the money-critical end-of-challenge settlement write path
 * (Task 9.1, Requirements 8.4, 9, 10, 14). It is the LAST place resources move
 * for a challenge, so it is where resource-conservation integrity (Requirement
 * 14.1) is finally proven: right before commit it asserts
 *
 *     Σ(refund) + Σ(reward) + service_fee == Σ(deposit)
 *
 * and, if that identity does not hold to the exact minor unit, it throws
 * `CONSERVATION_VIOLATED` so the WHOLE transaction rolls back and NOTHING is
 * distributed. A settlement that would not conserve deposits never commits.
 *
 * ── What settlement does (all inside ONE `db.transaction(...)`) ─────────────
 *   1. Lock the `challenges` row `FOR UPDATE` (serializes settlement; the status
 *      flip to `settled` + this lock make re-settlement impossible — Req: the
 *      `ALREADY_SETTLED` guard).
 *   2. Confirm finishers (Req 8.4): every Participant still `alive` at the end is
 *      transitioned `alive → completed`. After this step every Participant is
 *      either `completed` (a finisher) or `eliminated`.
 *   3. Derive the money figures from `participations` — NOT from the
 *      `reward_pools` running tracker (see the conservation note below):
 *        - `totalDeposit` = Σ `deposit_amount` over ALL participants,
 *        - `pool`         = Σ `deposit_amount` over ELIMINATED participants
 *                           (the redistributable Reward_Pool),
 *        - `service_fee`  = round(pool × `service_fee_rate`).
 *   4. Distribute to each finisher: a Refund of their OWN deposit plus an even
 *      split of `pool − service_fee` (the additional reward). Point challenges
 *      pay out via {@link creditPoints}; cash challenges queue a
 *      `payment_transactions` refund row (`direction='refund'`, `status='pending'`).
 *      A `settlements` row records each finisher's refund + reward.
 *   5. Handle the no-finisher case per the challenge's `no_winner_policy`
 *      (Req 10.3): `refund` returns every deposit to its owner; anything else
 *      (default `forfeit`) retains the whole pool as service fee.
 *   6. Enforce the reward cap (Req 9.4 / 10.2 / Property 4): total additional
 *      reward must not exceed `pool − service_fee`.
 *   7. Verify the conservation identity (Req 14.1) and, on success, persist the
 *      pool figures and flip the challenge to `settled`.
 *
 * ── Why deriving from `participations` conserves across revivals ────────────
 * (design note echoed from revival.ts.) Settlement computes `totalDeposit` and
 * `pool` by SUMMING `participations.deposit_amount`, so the two figures always
 * agree with the CURRENT survival set: a revived Participant is `alive`
 * (→ becomes a finisher, refunded their deposit) and is no longer counted in the
 * eliminated/pool sum. The conservation identity therefore holds automatically
 * regardless of how many revivals happened, whereas trusting the `reward_pools`
 * running `pool_amount` tracker would drift if any adjustment were ever missed.
 *
 * ── Exact money math (no float drift) ───────────────────────────────────────
 * All arithmetic is done in integer MINOR units — cents for cash
 * (`numeric(14,2)`), whole points for point challenges (points are integer
 * units and pay out through the `bigint` point ledger). Even splitting uses
 * floor division; the un-distributable remainder ("dust") is folded into the
 * service fee so it is retained rather than lost, which keeps BOTH the reward
 * cap (reward == pool − fee exactly) and the conservation identity exact.
 *
 * Conventions (mirroring {@link file://./points.ts}, {@link file://./challenges.ts},
 * {@link file://./verifications.ts}, {@link file://./revival.ts}):
 *   - The Drizzle handle is INJECTED (first argument) so the function is testable
 *     against any client.
 *   - Inner logic THROWS a {@link DomainErr}; Drizzle's `db.transaction()` rolls
 *     back on throw and the outer Server Action / Route Handler (web spec)
 *     converts it into a `Result<T>` (design.md → "오류 전파 원칙").
 *   - DB declarative constraints backstop the app checks: `settle_non_negative`
 *     / `pool_non_negative` (no negative payout or pool), `balance_after_non_
 *     negative` (point payouts), `amount_non_negative` / `direction_check`
 *     (cash refunds).
 *
 * ── Completion perks: Badges, Learning_Reports, completion-reward points ────
 * (Task 9.2, Requirements 9.3 / 10.4 / 11.1.) AFTER the conservation identity
 * is proven, each confirmed finisher is additionally granted, inside this SAME
 * transaction: a completion `badges` row (idempotent via `uq_badge` +
 * `onConflictDoNothing`), a `learning_reports` row of aggregated study stats
 * (total study time, completed-day count, final Streak — one per participation
 * via the `participation_id` unique constraint), and {@link COMPLETION_REWARD_
 * POINTS} credited via {@link creditPoints} under the `challenge_complete`
 * ledger type. These are point/record ACQUISITIONS, NOT part of the deposit-
 * conservation equation (see the conservation note below), so they are issued
 * to every finisher regardless of the challenge's `deposit_kind` and do not
 * touch the `distributedMinor` / `finalFeeMinor` / `totalDepositMinor` figures
 * the identity is checked against.
 *
 * Requirements traceability: 8.4, 9.1, 9.2, 9.3, 9.4, 10.1, 10.2, 10.3, 10.4,
 * 11.1, 14.1.
 */

import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  challenges,
  participations,
  rewardPools,
  settlements,
  paymentTransactions,
  badges,
  learningReports,
  dailyVerifications,
} from '../db/schema';
import type { Database } from '../db/index';
import { creditPoints } from './points';
import { COMPLETION_REWARD_POINTS } from './rewards';
import { DomainErr } from './errors';

/** Deposit kind of a challenge (`deposit_kind` enum). */
type DepositKind = (typeof challenges.$inferSelect)['depositKind'];

/**
 * Summary of a completed settlement, returned to the (protected) caller.
 * design.md → `SettlementSummary`. All amounts are in MAJOR units (currency for
 * cash, whole points for point challenges).
 */
export interface SettlementSummary {
  /** The settled challenge. */
  challengeId: string;
  /** Whether the challenge settled in cash or points. */
  depositKind: DepositKind;
  /** How many Participants were confirmed as finishers (`completed`). */
  finisherCount: number;
  /** How many Participants were `eliminated`. */
  eliminatedCount: number;
  /** Σ of ALL participants' deposits. */
  totalDeposit: number;
  /** Σ of ELIMINATED participants' deposits (the redistributable pool). */
  pool: number;
  /** Service fee actually retained (base fee + any un-distributable dust). */
  serviceFee: number;
  /** Total additional reward distributed to finishers (excludes refunds). */
  totalReward: number;
  /** Even-split additional reward paid to EACH finisher (0 when none). */
  rewardPerFinisher: number;
}

/** No-finisher handling policy (Req 10.3). */
type NoWinnerPolicy = 'forfeit' | 'refund';

/**
 * Resolve the challenge's `no_winner_policy` text into a recognized policy.
 * Unknown / absent values default to `forfeit` (retain the pool as service
 * fee) — the conservative, conservation-preserving default.
 */
function resolveNoWinnerPolicy(raw: string | null): NoWinnerPolicy {
  return (raw ?? '').trim().toLowerCase() === 'refund' ? 'refund' : 'forfeit';
}

/** Clamp `n` into the inclusive range `[lo, hi]`. */
function clamp(n: number, lo: number, hi: number): number {
  return Math.min(Math.max(n, lo), hi);
}

/**
 * A resolved payout for one Participant, expressed in integer minor units so
 * all settlement arithmetic stays exact.
 */
interface Payout {
  participationId: string;
  userId: string;
  /** Refund of the Participant's own deposit, in minor units. */
  refundMinor: number;
  /** Additional reward, in minor units. */
  rewardMinor: number;
}

/**
 * Settle a challenge: confirm finishers, distribute refunds + rewards, and
 * verify resource conservation (Requirements 8.4, 9, 10, 14.1).
 *
 * @param db          injected Drizzle client (production `db`, or a test client)
 * @param challengeId the challenge to settle
 * @returns a {@link SettlementSummary} of the distribution (major units)
 * @throws {DomainErr}
 *   `ALREADY_SETTLED` — the challenge is already `settled` (re-settlement guard);
 *   `INVALID_CONFIG` — the challenge does not exist or is `cancelled`;
 *   `CONSERVATION_VIOLATED` — the reward cap or the conservation identity does
 *     not hold → the whole transaction rolls back (Req 14.1).
 */
export async function settleChallenge(
  db: Database,
  challengeId: string,
): Promise<SettlementSummary> {
  return db.transaction(async (tx) => {
    // 1) Lock the challenge row. This serializes settlement and, together with
    //    the status flip to 'settled' at the end, makes re-settlement impossible.
    const [ch] = await tx
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .for('update');

    if (!ch) {
      throw new DomainErr('INVALID_CONFIG', `Challenge not found: ${challengeId}`);
    }
    // Re-settlement guard (Req: ALREADY_SETTLED).
    if (ch.status === 'settled') throw new DomainErr('ALREADY_SETTLED');
    // A cancelled challenge is not settled through this path.
    if (ch.status === 'cancelled') {
      throw new DomainErr('INVALID_CONFIG', 'Cannot settle a cancelled challenge');
    }

    const isCash = ch.depositKind === 'cash';
    // Minor-unit converters: cents for cash (scale 2), whole points otherwise.
    const toMinor = (amount: string): number =>
      isCash ? Math.round(Number(amount) * 100) : Math.round(Number(amount));
    const toAmountStr = (minor: number): string =>
      isCash ? (minor / 100).toFixed(2) : minor.toFixed(2);
    const toMajor = (minor: number): number => (isCash ? minor / 100 : minor);

    // 2) Req 8.4: confirm finishers — everyone still alive at the end becomes a
    //    finisher. After this, every Participant is 'completed' or 'eliminated'.
    await tx
      .update(participations)
      .set({ survivalStatus: 'completed' })
      .where(
        and(
          eq(participations.challengeId, challengeId),
          eq(participations.survivalStatus, 'alive'),
        ),
      );

    // 3) Derive money figures from participations (NOT the reward_pools tracker),
    //    so the totals always agree with the current survival set (revival-safe).
    const parts = await tx
      .select({
        id: participations.id,
        userId: participations.userId,
        survivalStatus: participations.survivalStatus,
        depositAmount: participations.depositAmount,
        // Carried onto finishers for their Learning_Report (Task 9.2). The
        // finisher-confirmation UPDATE above does not touch current_streak, so
        // this reflects the Participant's final Streak.
        currentStreak: participations.currentStreak,
      })
      .from(participations)
      .where(eq(participations.challengeId, challengeId));

    const winners = parts.filter((p) => p.survivalStatus === 'completed');

    let totalDepositMinor = 0;
    let poolMinor = 0;
    for (const p of parts) {
      const dep = toMinor(p.depositAmount);
      totalDepositMinor += dep;
      if (p.survivalStatus === 'eliminated') poolMinor += dep;
    }

    const rate = Number(ch.serviceFeeRate);

    // 4/5) Resolve per-participant payouts + the final retained service fee.
    const payouts: Payout[] = [];
    let finalFeeMinor: number;
    let totalRewardMinor = 0;
    let rewardEachMinor = 0;

    if (winners.length > 0) {
      // Base service fee, clamped defensively into [0, pool] (a rate outside
      // [0,1] must never make the distributable amount negative).
      const feeMinor = clamp(Math.round(poolMinor * rate), 0, poolMinor);
      const distributableMinor = poolMinor - feeMinor; // Req 9.4/10.2 ceiling
      // Even split (Req 9.2/10.1) via floor division; the remainder is dust.
      rewardEachMinor = Math.floor(distributableMinor / winners.length);
      totalRewardMinor = rewardEachMinor * winners.length;
      const dustMinor = distributableMinor - totalRewardMinor;
      // Fold un-distributable dust into the fee so nothing is lost and the
      // conservation identity stays exact.
      finalFeeMinor = feeMinor + dustMinor;

      for (const w of winners) {
        payouts.push({
          participationId: w.id,
          userId: w.userId,
          refundMinor: toMinor(w.depositAmount), // Req 9.1/10.1: refund own deposit
          rewardMinor: rewardEachMinor,
        });
      }
    } else if (resolveNoWinnerPolicy(ch.noWinnerPolicy) === 'refund') {
      // Req 10.3 (policy 'refund'): no finishers → return every deposit to its
      // owner. No reward, no fee. (All parts are eliminated here.)
      finalFeeMinor = 0;
      for (const p of parts) {
        payouts.push({
          participationId: p.id,
          userId: p.userId,
          refundMinor: toMinor(p.depositAmount),
          rewardMinor: 0,
        });
      }
    } else {
      // Req 10.3 (default 'forfeit'): no finishers → the whole pool is retained
      // as service fee. No payouts.
      finalFeeMinor = poolMinor;
    }

    // 6) Reward cap (Req 9.4 / 10.2 / Property 4): additional reward total must
    //    not exceed pool − service_fee. Money-integrity backstop → rollback.
    if (totalRewardMinor > poolMinor - finalFeeMinor) {
      throw new DomainErr('CONSERVATION_VIOLATED');
    }

    // Distribute: record each settlement + issue the payout, accumulating the
    // distributed total for the conservation check.
    let distributedMinor = 0;
    for (const p of payouts) {
      const payoutMinor = p.refundMinor + p.rewardMinor;

      await tx.insert(settlements).values({
        challengeId,
        participationId: p.participationId,
        refundAmount: toAmountStr(p.refundMinor),
        rewardAmount: toAmountStr(p.rewardMinor),
      });

      // A zero payout needs no money movement (creditPoints rejects amount<=0).
      if (payoutMinor > 0) {
        if (isCash) {
          // Cash: queue a refund for the Payment_Service to process (Req 9).
          await tx.insert(paymentTransactions).values({
            userId: p.userId,
            challengeId,
            participationId: p.participationId,
            direction: 'refund',
            amount: toAmountStr(payoutMinor),
            status: 'pending',
          });
        } else {
          // Points: credit refund + reward to the wallet in this same tx (Req 10.1).
          await creditPoints(
            tx,
            p.userId,
            payoutMinor,
            'reward_distribution',
            '완주 정산 분배 (환급 + 추가 보상)',
            challengeId,
          );
        }
      }

      distributedMinor += payoutMinor;
    }

    // 7) Conservation identity (Req 14.1): Σ(refund+reward) + service_fee must
    //    equal Σ(deposit) to the exact minor unit, else roll everything back.
    if (distributedMinor + finalFeeMinor !== totalDepositMinor) {
      throw new DomainErr('CONSERVATION_VIOLATED');
    }

    // 8) Task 9.2 — completion perks for each confirmed finisher (Req 9.3 /
    //    10.4 / 11.1). Issued only AFTER conservation is proven and inside this
    //    SAME transaction. These are point/record ACQUISITIONS separate from the
    //    deposit-conservation equation: they do NOT modify distributedMinor /
    //    finalFeeMinor / totalDepositMinor (already asserted above), so the
    //    identity is preserved. Skipped entirely when there are no finishers.
    if (winners.length > 0) {
      // Aggregate each finisher's study stats from their daily_verifications in
      // ONE grouped query (finishers are few; avoids N round-trips). count()/
      // sum() come back as strings from the driver, so coerce with Number().
      const winnerPartIds = winners.map((w) => w.id);
      const aggregates = await tx
        .select({
          participationId: dailyVerifications.participationId,
          totalStudySeconds: sql<string>`coalesce(sum(${dailyVerifications.accumulatedSeconds}), 0)`,
          completedDays: sql<string>`count(*) filter (where ${dailyVerifications.state} = 'completed')`,
        })
        .from(dailyVerifications)
        .where(inArray(dailyVerifications.participationId, winnerPartIds))
        .groupBy(dailyVerifications.participationId);

      const aggByPart = new Map(
        aggregates.map((a) => [
          a.participationId,
          {
            totalStudySeconds: Number(a.totalStudySeconds),
            completedDays: Number(a.completedDays),
          },
        ]),
      );

      for (const w of winners) {
        const agg = aggByPart.get(w.id) ?? {
          totalStudySeconds: 0,
          completedDays: 0,
        };

        // Req 9.3 / 10.4: completion Badge. Idempotent via uq_badge
        // (user_id, challenge_id, badge_type) + onConflictDoNothing so a repeat
        // issue is a no-op.
        await tx
          .insert(badges)
          .values({ userId: w.userId, challengeId, badgeType: 'completion' })
          .onConflictDoNothing();

        // Req 9.3: Learning_Report of aggregated study stats. One row per
        // participation (participation_id UNIQUE); onConflictDoNothing keeps it
        // idempotent.
        await tx
          .insert(learningReports)
          .values({
            participationId: w.id,
            reportData: {
              challengeId,
              totalStudySeconds: agg.totalStudySeconds,
              completedDays: agg.completedDays,
              finalStreak: w.currentStreak,
            },
          })
          .onConflictDoNothing();

        // Req 11.1: credit the completion-reward Point (challenge_complete) to
        // the finisher's wallet in this same transaction. Separate from the
        // deposit settlement above; recorded on the append-only ledger (Req 11.5).
        await creditPoints(
          tx,
          w.userId,
          COMPLETION_REWARD_POINTS,
          'challenge_complete',
          '챌린지 완주 보상 포인트',
          challengeId,
        );
      }
    }

    // Persist the settled pool figures (tracker now reflects the final split)
    // and flip the challenge to 'settled'. The reward_pools row exists for any
    // challenge with a pool (created at challenge creation / first join).
    await tx
      .update(rewardPools)
      .set({
        totalDeposit: toAmountStr(totalDepositMinor),
        poolAmount: toAmountStr(poolMinor),
        serviceFee: toAmountStr(finalFeeMinor),
      })
      .where(eq(rewardPools.challengeId, challengeId));

    await tx
      .update(challenges)
      .set({ status: 'settled' })
      .where(eq(challenges.id, challengeId));

    return {
      challengeId,
      depositKind: ch.depositKind,
      finisherCount: winners.length,
      eliminatedCount: parts.length - winners.length,
      totalDeposit: toMajor(totalDepositMinor),
      pool: toMajor(poolMinor),
      serviceFee: toMajor(finalFeeMinor),
      totalReward: toMajor(totalRewardMinor),
      rewardPerFinisher: toMajor(rewardEachMinor),
    };
  });
}
