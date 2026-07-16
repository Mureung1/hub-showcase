/**
 * Gamification domain functions — Surprise_Mission issuance + badge lookup.
 * design.md → "Realtime/게임화" and "Auth 전략" (Operator 권한 검증).
 *
 * This module owns the two server-side operations behind Requirement 13's
 * gamification surface that involve a WRITE or a permission check:
 *   - {@link issueSurpriseMission} — an Operator publishes a Surprise_Mission to
 *     a challenge (Requirement 13.3). Only a caller whose `profiles.role` is
 *     `'operator'` may issue one; design.md → "Auth 전략":
 *     "Operator 권한(공식 챌린지 개설, Surprise_Mission 발행)은
 *     `profiles.role = 'operator'` 를 서버 함수 내부에서 검증한다."
 *   - {@link getUserBadges} — read-only lookup of a profile's earned badges so
 *     they can be shown on the user's profile (Requirement 13.4).
 *
 * Conventions (mirroring {@link file://./challenges.ts} / {@link file://./points.ts}):
 *   - Domain functions THROW a {@link DomainErr} on failure and return the raw
 *     success value; the transaction boundary rolls back on throw and the outer
 *     Server Action / Route Handler (web spec) maps the throw to a `Result<T>`.
 *   - The write path runs inside ONE `db.transaction(...)` so the permission
 *     read and the INSERT are consistent, and the injected Drizzle handle is
 *     the first argument (testable against any client).
 *   - DB declarative constraints are the last line of defence: the
 *     `surprise_missions.challenge_id → challenges.id` FK backstops the
 *     challenge-existence check, and the `created_by → profiles.id` FK backstops
 *     the operator id.
 *   - Reads accept a {@link DbExecutor} (top-level `db` or a `tx`) and never
 *     mutate state.
 *
 * Requirements traceability: 13.3, 13.4.
 */

import { desc, eq } from 'drizzle-orm';
import { badges, profiles, surpriseMissions } from '../db/schema';
import type { Database, DbExecutor, DbTx } from '../db/index';
import { DomainErr } from './errors';

/** A freshly issued Surprise_Mission's id. */
export type SurpriseMissionId = string;

/** A `surprise_missions` row. */
export type SurpriseMission = typeof surpriseMissions.$inferSelect;

/** A `badges` row. */
export type Badge = typeof badges.$inferSelect;

/** The `profiles.role` value granting Operator permission. */
const OPERATOR_ROLE = 'operator';

/** Longest accepted mission title (mirrors challenges title bound). */
const MAX_TITLE_LENGTH = 200;

/**
 * Operator-supplied configuration for publishing a Surprise_Mission
 * (Requirement 13.3).
 *
 * `activeFrom` / `activeUntil` bound the window during which the mission is
 * shown to in-progress Participants; both are optional — the DB defaults
 * `active_from` to `now()` and leaves `active_until` open (NULL) when omitted.
 */
export interface SurpriseMissionInput {
  /** Challenge the mission is published to (required). */
  challengeId: string;
  /** Mission title (required, non-empty). */
  title: string;
  /** Optional free-text description of the mission. */
  description?: string | null;
  /** Optional start of the exposure window. Defaults to `now()` at the DB. */
  activeFrom?: Date;
  /** Optional end of the exposure window; open-ended (NULL) when omitted. */
  activeUntil?: Date | null;
}

/** True when a value counts as "not supplied" for a required text item. */
function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/**
 * Verify the caller holds Operator permission (`profiles.role = 'operator'`).
 * design.md → "Auth 전략": Operator-only actions re-check the role inside the
 * server function even though the DB connection runs with elevated privileges.
 *
 * @throws {DomainErr} `UNAUTHENTICATED` if `operatorId` is empty or has no
 *   profile; `FORBIDDEN` if the profile exists but is not an Operator.
 */
async function assertOperator(tx: DbTx, operatorId: string): Promise<void> {
  if (!operatorId) throw new DomainErr('UNAUTHENTICATED');

  const [profile] = await tx
    .select({ role: profiles.role })
    .from(profiles)
    .where(eq(profiles.id, operatorId));

  // No profile → the caller is not a known/authenticated user.
  if (!profile) throw new DomainErr('UNAUTHENTICATED');
  // Authenticated but lacking the Operator role → authorization failure.
  if (profile.role !== OPERATOR_ROLE) throw new DomainErr('FORBIDDEN');
}

/**
 * Publish a Surprise_Mission to a challenge on behalf of an Operator
 * (Requirement 13.3).
 *
 * Steps:
 *   1. In ONE transaction, verify the caller is an Operator
 *      ({@link assertOperator}) — a non-Operator is rejected with `FORBIDDEN`
 *      and nothing is written.
 *   2. Validate required items (challengeId, non-empty title) and a sane
 *      exposure window (`activeUntil` after `activeFrom` when both given).
 *   3. INSERT the `surprise_missions` row with `created_by` set to the Operator.
 *
 * The `surprise_missions.challenge_id → challenges.id` FK backstops an unknown
 * challenge id (the INSERT rolls back), and `created_by → profiles.id` backstops
 * the operator id.
 *
 * @param db         injected Drizzle client (production `db`, or a test client)
 * @param operatorId authenticated caller's user id (must be an Operator)
 * @param input      mission details
 * @returns the new mission's id
 * @throws {DomainErr} `UNAUTHENTICATED` (no/unknown caller), `FORBIDDEN`
 *   (caller is not an Operator), `INVALID_CONFIG` (missing/invalid input).
 */
export async function issueSurpriseMission(
  db: Database,
  operatorId: string,
  input: SurpriseMissionInput,
): Promise<SurpriseMissionId> {
  // Fail fast on obviously invalid input before opening the transaction.
  const invalid: string[] = [];
  if (isBlank(input.challengeId)) invalid.push('challengeId');
  if (isBlank(input.title)) invalid.push('title');
  if (!isBlank(input.title) && input.title.trim().length > MAX_TITLE_LENGTH) {
    invalid.push(`title (max ${MAX_TITLE_LENGTH} chars)`);
  }
  if (
    input.activeFrom instanceof Date &&
    input.activeUntil instanceof Date &&
    input.activeUntil.getTime() <= input.activeFrom.getTime()
  ) {
    invalid.push('activeUntil (must be after activeFrom)');
  }
  if (invalid.length > 0) {
    throw new DomainErr(
      'INVALID_CONFIG',
      `Invalid Surprise_Mission input: ${invalid.join(', ')}`,
    );
  }

  return db.transaction(async (tx) => {
    // Req 13.3 / design "Auth 전략": Operator-only publication.
    await assertOperator(tx, operatorId);

    const description =
      typeof input.description === 'string' && input.description.trim() !== ''
        ? input.description.trim()
        : null;

    const [created] = await tx
      .insert(surpriseMissions)
      .values({
        challengeId: input.challengeId,
        title: input.title.trim(),
        description,
        // Let the DB default `active_from` to now() when the Operator omits it.
        ...(input.activeFrom instanceof Date ? { activeFrom: input.activeFrom } : {}),
        activeUntil: input.activeUntil ?? null,
        createdBy: operatorId,
      })
      .returning({ id: surpriseMissions.id });

    if (!created) {
      // Unreachable: a successful INSERT ... RETURNING always yields one row.
      throw new Error('issueSurpriseMission: INSERT returned no row');
    }

    return created.id;
  });
}

/**
 * Read the badges a user has earned, for display on their profile
 * (Requirement 13.4). Read-only. Ordered most-recently-awarded first, tie-broken
 * by `id` for a stable order when multiple badges share a timestamp.
 *
 * @param executor top-level `db` or a transaction handle
 * @param userId   the profile whose badges to look up
 * @returns the user's badge rows (empty array when none)
 */
export async function getUserBadges(
  executor: DbExecutor,
  userId: string,
): Promise<Badge[]> {
  return executor
    .select()
    .from(badges)
    .where(eq(badges.userId, userId))
    .orderBy(desc(badges.awardedAt), desc(badges.id));
}
