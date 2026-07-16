/**
 * Reward-point tuning knobs — the single, shared home for the point-acquisition
 * amounts and the Streak-milestone rule (Requirement 11 / design.md → "Point
 * system" — 포인트 획득: 완주/스트릭/회고/초대).
 *
 * Requirements 11.2 (Streak 보상) and 11.3 (회고 작성 보상) define *when* points
 * are credited but leave the concrete amounts/thresholds to the implementation.
 * Centralising them here keeps the crediting call sites (verification success
 * path — Task 6.3; and later settlement completion rewards — Task 9) free of
 * magic numbers and gives operators one place to tune reward economics.
 *
 * These values feed {@link file://./points.ts} `creditPoints`, whose ledger row
 * records the signed amount + reason (Requirement 11.5).
 *
 * Requirements traceability: 11.1, 11.2, 11.3, 11.4.
 */

/**
 * Points credited to a Participant when they are confirmed as a finisher at
 * challenge settlement (Requirement 11.1 — 완주 보상 Point). Awarded once per
 * completed challenge, recorded on the ledger under the `challenge_complete`
 * transaction type (see {@link file://./settlement.ts} `settleChallenge`).
 *
 * This is a point ACQUISITION separate from the deposit-conservation settlement:
 * it is not part of the `Σ(refund + reward) + service_fee == Σ(deposit)`
 * identity, so it is credited to every finisher regardless of whether the
 * challenge settled in cash or points. It is the largest of the reward knobs,
 * sitting above the streak-milestone and retrospective bonuses, because it
 * rewards seeing the whole challenge through.
 */
export const COMPLETION_REWARD_POINTS = 100;

/**
 * Points credited every time a Participant submits a Retrospective on a
 * successful survival verification (Requirement 11.3). Recorded on the ledger
 * under the `retrospective_bonus` transaction type.
 */
export const RETROSPECTIVE_BONUS_POINTS = 10;

/**
 * A Streak milestone is reached on every Nth consecutive verified day
 * (Requirement 11.2). A milestone lands when the Participant's `current_streak`
 * is a positive whole multiple of this interval.
 */
export const STREAK_MILESTONE_INTERVAL = 7;

/**
 * Points credited when a Participant's Streak reaches a milestone
 * (Requirement 11.2). Recorded on the ledger under the `streak_bonus`
 * transaction type.
 */
export const STREAK_MILESTONE_BONUS_POINTS = 50;

/**
 * Points credited to the INVITER when a user they invited creates a new account
 * through the invite link (Requirement 11.4 — 친구 초대 보상 Point). The invitee
 * relationship is recorded on `profiles.invited_by` by the `handle_new_user`
 * trigger; the bonus is granted once per invitee (see
 * {@link file://./invites.ts} `grantInviteReward`) and recorded on the ledger
 * under the `invite_bonus` transaction type (Requirement 11.5).
 *
 * Sized between the retrospective and completion bonuses: bringing a new user in
 * is worth more than a single retrospective but less than seeing a whole
 * challenge through.
 */
export const INVITE_BONUS_POINTS = 30;

/**
 * True when `streak` lands exactly on a Streak milestone — i.e. it is a
 * positive whole multiple of {@link STREAK_MILESTONE_INTERVAL} (Requirement
 * 11.2). A non-positive streak is never a milestone.
 *
 * @param streak the Participant's `current_streak` AFTER incrementing it for
 *   the day's successful verification.
 */
export function isStreakMilestone(streak: number): boolean {
  return (
    Number.isInteger(streak) &&
    streak > 0 &&
    streak % STREAK_MILESTONE_INTERVAL === 0
  );
}
