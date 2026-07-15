/**
 * Friend-invite reward domain function — design.md → "Point system" (포인트 획득:
 * 완주/스트릭/회고/초대) and "서버 트랜잭션 도메인 함수".
 *
 * This module owns the invite-reward write path (Task 10.3, Requirements 11.4 /
 * 11.5): when a user who was invited creates a new account, the person who
 * invited them earns a friend-invite bonus.
 *
 * ── Where the invite relationship comes from ────────────────────────────────
 * Account provisioning happens OUTSIDE application control — Supabase Auth
 * inserts into `auth.users`, and the `handle_new_user` trigger (migration
 * 20250101000001) copies `raw_user_meta_data->>'invited_by'` into
 * `profiles.invited_by` (a self-FK → `profiles.id`, Req 11.4). By the time this
 * function runs, the invitee's profile already exists with `invited_by` set (or
 * NULL if they signed up without an invite). This function does NOT set the
 * relationship; it only ACTS on the one the trigger recorded.
 *
 * ── Idempotency (no double-crediting) ───────────────────────────────────────
 * There is no boolean "reward granted" flag on `profiles`, and adding one would
 * require a schema migration. Instead the invite bonus is keyed on the INVITEE:
 * the `point_transactions` ledger row written for the bonus stores the invitee
 * id in `ref_id` under `txn_type='invite_bonus'`. That existing ledger row IS
 * the idempotency marker — before crediting, we check for it and skip if
 * present. So the inviter is credited AT MOST ONCE per invitee, no matter how
 * many times this function is invoked (e.g. a retried signup hook). This reuses
 * the append-only ledger the point system already maintains (Req 11.5) rather
 * than introducing new state.
 *
 * Race-safety: the invitee's `profiles` row is locked `FOR UPDATE` at the top,
 * so concurrent invocations for the SAME invitee serialize — the second one
 * blocks until the first commits, then sees the committed `invite_bonus` ledger
 * row and skips. This makes the check-then-credit sequence atomic without a DB
 * unique constraint (design.md → 행 잠금을 통한 경합 제어).
 *
 * ── Graceful no-ops ─────────────────────────────────────────────────────────
 * If the invitee has no `invited_by` (organic signup), there is simply nothing
 * to reward and the function returns without writing. A self-referential
 * `invited_by` (a profile pointing at itself) is likewise ignored so a user can
 * never farm the bonus by "inviting" themselves.
 *
 * Conventions (mirroring {@link file://./points.ts}, {@link file://./challenges.ts},
 * {@link file://./settlement.ts}):
 *   - The Drizzle handle is INJECTED (first argument) so the function is testable
 *     against any client, and everything runs inside ONE `db.transaction(...)`
 *     so the ledger check + wallet UPDATE + ledger INSERT are all-or-nothing
 *     (Requirement 14.3).
 *   - Inner logic THROWS a {@link DomainErr}; Drizzle's `db.transaction()` rolls
 *     back on throw and the outer Server Action / Route Handler (web spec)
 *     converts it into a `Result<T>` (design.md → "오류 전파 원칙").
 *   - The point credit goes through {@link creditPoints}, which locks the
 *     inviter's wallet `FOR UPDATE`, records the signed ledger row with
 *     `balance_after`, and is backstopped by the `balance_after_non_negative`
 *     CHECK (Req 14.2).
 *
 * Requirements traceability: 11.4, 11.5.
 */

import { and, eq } from 'drizzle-orm';
import { profiles, pointTransactions } from '../db/schema';
import type { Database } from '../db/index';
import { creditPoints, type Balance } from './points';
import { INVITE_BONUS_POINTS } from './rewards';
import { DomainErr } from './errors';

/**
 * Outcome of a {@link grantInviteReward} call. design.md → point-acquisition
 * return shape. `credited` distinguishes the "bonus granted just now" case from
 * the several graceful no-op cases (no inviter, already granted, self-invite).
 */
export interface InviteRewardResult {
  /** True only when the inviter was credited on THIS call. */
  credited: boolean;
  /**
   * The inviter recorded on the invitee's `invited_by`, or `null` when the
   * invitee has no (valid) inviter. Present even when `credited` is false due to
   * a prior grant, so callers can see who the invite belonged to.
   */
  inviterId: string | null;
  /** The inviter's wallet balance after the credit, or `null` when not credited. */
  inviterBalance: Balance | null;
}

/**
 * Grant the friend-invite bonus to the user who invited `inviteeId`, if any
 * (Requirements 11.4, 11.5).
 *
 * Steps (all inside ONE `db.transaction(...)`):
 *   1. Lock the invitee's `profiles` row `FOR UPDATE` — serializes concurrent
 *      invocations for the same invitee (idempotency race guard) and reads the
 *      `invited_by` the `handle_new_user` trigger recorded.
 *   2. No inviter recorded (organic signup) or a self-referential invite →
 *      graceful no-op (nothing to reward).
 *   3. Idempotency: if an `invite_bonus` ledger row already references this
 *      invitee (`ref_id = inviteeId`), the bonus was already granted → skip.
 *   4. Otherwise credit {@link INVITE_BONUS_POINTS} to the inviter via
 *      {@link creditPoints} under the `invite_bonus` ledger type, storing the
 *      invitee id in `ref_id` (which doubles as the idempotency key) — Req 11.5.
 *
 * @param db        injected Drizzle client (production `db`, or a test client)
 * @param inviteeId the newly-created user whose signup may trigger the bonus
 * @returns an {@link InviteRewardResult} describing what happened
 * @throws {DomainErr} `UNAUTHENTICATED` if `inviteeId` is empty or has no profile.
 */
export async function grantInviteReward(
  db: Database,
  inviteeId: string,
): Promise<InviteRewardResult> {
  if (!inviteeId) throw new DomainErr('UNAUTHENTICATED');

  return db.transaction(async (tx) => {
    // 1) Lock the invitee's profile row. This both reads `invited_by` (set by
    //    the handle_new_user trigger — Req 11.4) and serializes concurrent
    //    grants for the same invitee so the ledger check below is race-free.
    const [invitee] = await tx
      .select({ id: profiles.id, invitedBy: profiles.invitedBy })
      .from(profiles)
      .where(eq(profiles.id, inviteeId))
      .for('update');

    // An unknown invitee id is not a valid request. There is no dedicated
    // "not found" code in the domain union, so surface it as unauthenticated
    // (the invitee must be a real, provisioned account).
    if (!invitee) throw new DomainErr('UNAUTHENTICATED');

    const inviterId = invitee.invitedBy;

    // 2) No inviter, or a self-referential invite → nothing to reward.
    //    (`invited_by` is a self-FK; a self-invite must never earn a bonus.)
    if (!inviterId || inviterId === inviteeId) {
      return { credited: false, inviterId: null, inviterBalance: null };
    }

    // 3) Idempotency backstop: a prior invite_bonus ledger row keyed on this
    //    invitee means the inviter was already rewarded for this invite. Skip
    //    to prevent double-crediting (e.g. a retried signup hook).
    const [alreadyGranted] = await tx
      .select({ id: pointTransactions.id })
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.txnType, 'invite_bonus'),
          eq(pointTransactions.refId, inviteeId),
        ),
      );
    if (alreadyGranted) {
      return { credited: false, inviterId, inviterBalance: null };
    }

    // 4) Credit the inviter and record the ledger row (Req 11.4 / 11.5). The
    //    invitee id in `ref_id` is the idempotency key checked in step 3. The
    //    inviter is a real profile (invited_by is an FK → profiles.id), so
    //    handle_new_user guarantees they have a wallet.
    const inviterBalance = await creditPoints(
      tx,
      inviterId,
      INVITE_BONUS_POINTS,
      'invite_bonus',
      '친구 초대 보상',
      inviteeId,
    );

    return { credited: true, inviterId, inviterBalance };
  });
}
