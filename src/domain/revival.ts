/**
 * Revival-ticket domain function — design.md → "서버 트랜잭션 도메인 함수" /
 * "일일 탈락 처리" (the closing note on 부활권) and Requirement 12.4 / 12.5.
 *
 * This module owns the "buy + use a Revival_Ticket" write path (Task 7.2). It is
 * intentionally SEPARATE from the daily-elimination module (Task 7.1) so the two
 * concurrent tasks do not collide; revival is the logical inverse of the pool
 * side-effect that elimination applies.
 *
 * Background — what elimination did (design.md → "일일 탈락 처리"):
 *   When a Participant misses the Verification_Deadline they are set to
 *   `survival_status = 'eliminated'` (with `eliminated_on`), and their forfeited
 *   `deposit_amount` is folded into `reward_pools.pool_amount` — i.e. it moves
 *   from "this Participant's refundable stake" into the redistributable pool that
 *   finishers split at settlement (Requirement 8.2).
 *
 * What {@link reviveParticipation} does (Requirement 12.4 / 12.5), all inside ONE
 * `db.transaction(...)` so it is all-or-nothing (Requirement 14.3):
 *   1. Debit the Revival_Ticket cost from the buyer's wallet via
 *      {@link debitPoints} (reason `revival_purchase`). A shortfall throws
 *      `INSUFFICIENT_POINTS`, which rolls the whole thing back so NOTHING changes
 *      (Requirement 12.2 / 12.5). This charge is the price of the second chance;
 *      the business sets it so it "reflects the re-deposit policy" (design note
 *      "부활권 비용에 재예치 정책을 반영한다").
 *   2. Apply the re-deposit policy for the deposit already folded into the pool:
 *      undo elimination's pool side-effect with `reward_pools.pool_amount -=
 *      deposit_amount`. The Participant is no longer eliminated, so their deposit
 *      must leave the redistributable pool and become their live refundable stake
 *      again. The `pool_non_negative` CHECK backstops this (the amount was added
 *      to the pool at elimination, so the decrement cannot underflow).
 *   3. Restore `survival_status = 'alive'` and clear `eliminated_on`
 *      (Requirement 12.4). `deposit_amount` is left unchanged — it is once again
 *      the Participant's live stake.
 *   4. Record the Revival_Ticket row (purchased AND used in this one step:
 *      `used = true`, `used_at = now()`), with its `point_cost`.
 *
 * Why this conserves money (Requirement 14.1). Settlement (`settleChallenge`,
 * Task 9.1) derives its numbers from `participations` (Σ `deposit_amount` = total
 * deposit; Σ eliminated `deposit_amount` = pool), NOT from the running
 * `reward_pools` tracker. After a revival the Participant is `alive` (→ becomes a
 * finisher at settlement, refunded their `deposit_amount`) and no longer counted
 * in the eliminated/pool sum, so the conservation identity `Σ(refund) + Σ(reward)
 * + service_fee == Σ(deposit)` continues to hold automatically. Decrementing
 * `reward_pools.pool_amount` keeps that running tracker (and the leaderboard read
 * model / Property 7 invariant "pool == Σ currently-eliminated deposits")
 * consistent with the new eliminated set. The Revival_Ticket cost is a separate
 * point sink recorded on the append-only ledger (Property 1 still holds for the
 * wallet).
 *
 * Assumption (documented for traceability): Requirements 12.4/12.5 state only
 * that revival restores `survival_status` to alive and that point usage is
 * ledgered; they do not pin down the exact re-deposit mechanics. The revival
 * cost is therefore taken as a caller-supplied price (`revivalPointCost`) — there
 * is no per-challenge revival-cost column in the schema — and the re-deposit is
 * modelled as "pull the forfeited deposit back out of the pool" rather than a
 * second `deposit_amount` debit. The two are economically equivalent when the
 * business sets the cost to the deposit amount, and this variant keeps a single,
 * clearly-labelled charge on the ledger while leaving `participations` (the
 * settlement source of truth) untouched apart from the status flip.
 *
 * Conventions (mirroring {@link file://./points.ts},
 * {@link file://./challenges.ts}, {@link file://./verifications.ts}):
 *   - The Drizzle handle is INJECTED (first argument) so the function is testable
 *     against any client.
 *   - Inner logic THROWS a {@link DomainErr}; Drizzle's `db.transaction()` rolls
 *     back on throw and the outer Server Action / Route Handler (web spec)
 *     converts it into a `Result<T>` (design.md → "오류 전파 원칙").
 *   - The contended `participations` row is locked `FOR UPDATE` so a revival
 *     serializes against a concurrent elimination of the same Participant.
 *
 * Requirements traceability: 12.4, 12.5.
 */

import { eq, sql } from 'drizzle-orm';
import {
  participations,
  challenges,
  rewardPools,
  revivalTickets,
} from '../db/schema';
import type { Database } from '../db/index';
import { debitPoints, getWalletBalance, type Balance } from './points';
import { DomainErr } from './errors';

/** The outcome of a successful revival. */
export interface RevivalResult {
  /** The `revival_tickets` row recorded for this purchase/use. */
  revivalTicketId: string;
  /** The revived participation. */
  participationId: string;
  /** The buyer's wallet balance after the Revival_Ticket charge. */
  balance: Balance;
}

/** True for a whole, finite, non-negative number (rejects NaN/Infinity/floats). */
function isNonNegativeInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/**
 * Buy and use a Revival_Ticket to bring an eliminated Participant back to life
 * (Requirement 12.4 / 12.5).
 *
 * The buyer (`userId`) must own the participation being revived, and the
 * participation must currently be `eliminated` in a challenge that is still
 * `in_progress`. See the module header for the full money-flow / conservation
 * rationale.
 *
 * @param db               injected Drizzle client (production `db`, or a test client)
 * @param userId           authenticated buyer's user id (the participation owner)
 * @param participationId  the eliminated participation to revive
 * @param revivalPointCost the Revival_Ticket price in whole points (>= 0). The
 *   business sets this to reflect the re-deposit policy; `0` means a free revival
 *   (no wallet movement, but a ticket row is still recorded).
 * @returns the recorded ticket id, the participation id, and the buyer's balance
 *   after the charge
 * @throws {DomainErr}
 *   `UNAUTHENTICATED` — no `userId`, the buyer does not own the participation, or
 *     the buyer has no wallet;
 *   `INVALID_CONFIG` — `revivalPointCost` is not a whole non-negative number, the
 *     participation does not exist, or its challenge is not `in_progress`;
 *   `ALREADY_SETTLED` — the challenge is already settled;
 *   `NOT_ELIMINATED` — the participation is not in the `eliminated` state (only an
 *     eliminated Participant can revive);
 *   `INSUFFICIENT_POINTS` — the wallet balance is below `revivalPointCost`
 *     (→ rollback, nothing changes — Req 12.2).
 */
export async function reviveParticipation(
  db: Database,
  userId: string,
  participationId: string,
  revivalPointCost: number,
): Promise<RevivalResult> {
  // Req 1.5: an authenticated user is required (Server Action verifies session).
  if (!userId) throw new DomainErr('UNAUTHENTICATED');
  // Points are whole units; a negative / non-integer price is invalid config.
  if (!isNonNegativeInteger(revivalPointCost)) {
    throw new DomainErr(
      'INVALID_CONFIG',
      'revivalPointCost must be a whole, non-negative number',
    );
  }

  return db.transaction(async (tx) => {
    // Lock the participation row (`FOR UPDATE OF participations`) and read the
    // eligibility inputs + the deposit in one shot. Locking serializes a revival
    // against a concurrent elimination of the same Participant.
    const [row] = await tx
      .select({
        ownerId: participations.userId,
        survivalStatus: participations.survivalStatus,
        depositAmount: participations.depositAmount,
        challengeId: participations.challengeId,
        challengeStatus: challenges.status,
      })
      .from(participations)
      .innerJoin(challenges, eq(participations.challengeId, challenges.id))
      .where(eq(participations.id, participationId))
      .for('update', { of: participations });

    // Unknown participation → clean domain error (no dedicated "not found" code).
    if (!row) {
      throw new DomainErr(
        'INVALID_CONFIG',
        `Participation not found: ${participationId}`,
      );
    }
    // Only the owner may revive their own participation.
    if (row.ownerId !== userId) throw new DomainErr('UNAUTHENTICATED');

    // The challenge must still be running to revive into it.
    if (row.challengeStatus === 'settled') {
      throw new DomainErr('ALREADY_SETTLED');
    }
    if (row.challengeStatus !== 'in_progress') {
      throw new DomainErr(
        'INVALID_CONFIG',
        `Challenge is not in progress (status: ${row.challengeStatus})`,
      );
    }
    // Req 12.4: only an eliminated Participant can be revived.
    if (row.survivalStatus !== 'eliminated') {
      throw new DomainErr('NOT_ELIMINATED');
    }

    // 1) Charge the Revival_Ticket cost (Req 12.5). debitPoints locks the wallet
    //    and throws INSUFFICIENT_POINTS on a shortfall → rollback (Req 12.2). It
    //    rejects amount <= 0, so skip the debit for a free (0-point) revival.
    let balance: Balance;
    if (revivalPointCost > 0) {
      balance = await debitPoints(
        tx,
        userId,
        revivalPointCost,
        'revival_purchase',
        '부활권 구매/사용 (재예치)',
        row.challengeId,
      );
    } else {
      balance = await getWalletBalance(tx, userId);
    }

    // 2) Re-deposit policy: pull the forfeited deposit back out of the pool,
    //    undoing elimination's `pool_amount += deposit` side-effect (Req 8.2
    //    inverse). `pool_non_negative` CHECK backstops the decrement.
    await tx
      .update(rewardPools)
      .set({
        poolAmount: sql`${rewardPools.poolAmount} - ${row.depositAmount}`,
      })
      .where(eq(rewardPools.challengeId, row.challengeId));

    // 3) Restore the Participant to alive and clear the elimination date
    //    (Req 12.4). `elim_date_consistency` CHECK is satisfied (alive ⇒
    //    eliminated_on may be null). deposit_amount stays — it is the live stake
    //    again.
    await tx
      .update(participations)
      .set({ survivalStatus: 'alive', eliminatedOn: null })
      .where(eq(participations.id, participationId));

    // 4) Record the Revival_Ticket, purchased AND used in this one step.
    const [ticket] = await tx
      .insert(revivalTickets)
      .values({
        userId,
        participationId,
        pointCost: revivalPointCost,
        used: true,
        usedAt: sql`now()`,
      })
      .returning({ id: revivalTickets.id });

    if (!ticket) {
      // Unreachable: a successful INSERT ... RETURNING always yields one row.
      throw new Error('reviveParticipation: revival_tickets INSERT returned no row');
    }

    return {
      revivalTicketId: ticket.id,
      participationId,
      balance,
    };
  });
}
