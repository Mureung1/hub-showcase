/**
 * Leaderboard / progress read-model functions — design.md → "Realtime & 게임화
 * (Requirement 13)" and 컴포넌트-요구사항 매핑 "Realtime/게임화 → read model 뷰".
 *
 * This module owns the READ-ONLY game-ification surfaces (Requirement 13.1,
 * 13.2). It never writes, opens no transaction, and holds no locks — every
 * function is a plain query over the read model:
 *
 *   - {@link getLeaderboard}      — a challenge's ranked participants + the live
 *                                   survivor (alive) count, sourced from the
 *                                   `v_leaderboard` view (Requirement 13.2).
 *   - {@link getParticipantProgress} — one Participant's own progress card:
 *                                   `survival_status`, `current_streak`, and the
 *                                   days remaining until the challenge ends,
 *                                   evaluated in the challenge's timezone
 *                                   (Requirement 13.1).
 *
 * Conventions (mirroring {@link file://./points.ts} read helpers):
 *   - Functions accept an injected {@link DbExecutor} (the top-level `db` or a
 *     `tx`) rather than importing the module-level `db`, so they run standalone
 *     or inside a surrounding transaction and stay testable against any client.
 *   - They never mutate state. In production the same read model is also exposed
 *     to the Supabase JS client via RLS (design.md → "RLS 전략"); these server
 *     functions provide the typed server-side path the web spec consumes.
 *
 * The `v_leaderboard` view (created in the raw-SQL migration for Task 2.8) is
 * NOT part of the Drizzle schema, so {@link getLeaderboard} reads it with a raw
 * `sql` query via `executor.execute(...)`. Its columns (design.md):
 *   challenge_id, user_id, display_name, survival_status, current_streak,
 *   rank (per-challenge, by current_streak desc), alive_count (per-challenge).
 *
 * Requirements traceability: 13.1, 13.2.
 */

import { eq, sql } from 'drizzle-orm';
import { participations, challenges } from '../db/schema';
import type { DbExecutor } from '../db/index';
import { DomainErr } from './errors';

/** A participant's survival state (`survival_status` enum). */
export type SurvivalStatus =
  (typeof participations.$inferSelect)['survivalStatus'];

/**
 * One ranked row of a challenge's leaderboard, projected from `v_leaderboard`.
 * design.md → "Realtime & 게임화".
 */
export interface LeaderboardEntry {
  /** The participant's user id (`profiles.id`). */
  userId: string;
  /** The participant's public display name. */
  displayName: string;
  /** Alive / eliminated / completed. */
  survivalStatus: SurvivalStatus;
  /** Consecutive verified-day count driving the rank. */
  currentStreak: number;
  /**
   * 1-based rank within the challenge, ordered by `current_streak` descending.
   * Ties share a rank (SQL `rank()`), so ranks may skip (1, 1, 3, ...).
   */
  rank: number;
}

/**
 * A challenge's leaderboard: the live survivor count plus the ranked entries
 * (Requirement 13.2 — 현재 생존자 수와 참가자 순위).
 */
export interface Leaderboard {
  /** The challenge the leaderboard belongs to. */
  challengeId: string;
  /** How many participants are currently `alive` (Requirement 13.2). */
  survivorCount: number;
  /** Ranked participants, best rank first, ties broken by display name. */
  entries: LeaderboardEntry[];
}

/**
 * One Participant's progress card (Requirement 13.1 — 본인 Survival_Status,
 * Streak, 남은 기간).
 */
export interface ParticipantProgress {
  /** The participation this progress belongs to. */
  participationId: string;
  /** The Participant's current survival state. */
  survivalStatus: SurvivalStatus;
  /** The Participant's consecutive verified-day count. */
  currentStreak: number;
  /**
   * Whole days remaining until the challenge's end date, evaluated against the
   * current date in the challenge's OWN `timezone`: `end_date − today_local`,
   * clamped at 0. It is 0 on the final day and stays 0 after the challenge has
   * ended (never negative).
   */
  daysRemaining: number;
}

/** Raw `v_leaderboard` row shape. Declared as a `type` to satisfy the
 * `Record<string, unknown>` constraint on `executor.execute<TRow>()`. */
type LeaderboardRow = {
  user_id: string;
  display_name: string;
  survival_status: SurvivalStatus;
  current_streak: number;
  rank: number;
  alive_count: number;
};

/**
 * Read a challenge's leaderboard from the `v_leaderboard` read model
 * (Requirement 13.2).
 *
 * Returns every participant of the challenge ranked by `current_streak`
 * (descending), together with the challenge-wide survivor (alive) count. The
 * `bigint` window results (`rank`, `alive_count`) are cast to `int` in SQL so
 * they come back as JS numbers rather than driver strings. Rows are ordered by
 * `rank` then `display_name` for a stable, presentation-ready order.
 *
 * A challenge with no participants yields an empty leaderboard (no entries,
 * `survivorCount = 0`); this is a valid state and not an error.
 *
 * @param executor    top-level `db` or a transaction handle (read-only)
 * @param challengeId the challenge whose leaderboard to read
 * @returns the survivor count and ranked entries for the challenge
 */
export async function getLeaderboard(
  executor: DbExecutor,
  challengeId: string,
): Promise<Leaderboard> {
  const rows = await executor.execute<LeaderboardRow>(sql`
    SELECT
      user_id,
      display_name,
      survival_status,
      current_streak,
      rank::int        AS rank,
      alive_count::int AS alive_count
    FROM v_leaderboard
    WHERE challenge_id = ${challengeId}
    ORDER BY rank ASC, display_name ASC
  `);

  const entries: LeaderboardEntry[] = [...rows].map((r) => ({
    userId: r.user_id,
    displayName: r.display_name,
    survivalStatus: r.survival_status,
    currentStreak: r.current_streak,
    rank: r.rank,
  }));

  // `alive_count` is a per-challenge window aggregate, identical on every row,
  // so any row carries the survivor count; an empty challenge has none → 0.
  const survivorCount = entries.length > 0 ? rows[0].alive_count : 0;

  return { challengeId, survivorCount, entries };
}

/**
 * Read a single Participant's progress card (Requirement 13.1).
 *
 * Returns the Participant's `survival_status`, `current_streak`, and the whole
 * days remaining until the challenge ends. "Days remaining" is computed in
 * Postgres against the challenge's own `timezone` — `end_date −
 * (now() AT TIME ZONE timezone)::date`, clamped at 0 — matching the timezone
 * pattern used by the verification/elimination deadline logic, so the count is
 * correct regardless of the server's local time.
 *
 * @param executor        top-level `db` or a transaction handle (read-only)
 * @param participationId the participation to read progress for
 * @returns the Participant's survival status, streak, and days remaining
 * @throws {DomainErr} `INVALID_CONFIG` if the participation does not exist.
 */
export async function getParticipantProgress(
  executor: DbExecutor,
  participationId: string,
): Promise<ParticipantProgress> {
  const [row] = await executor
    .select({
      survivalStatus: participations.survivalStatus,
      currentStreak: participations.currentStreak,
      // date − date yields an integer number of days; GREATEST clamps a
      // past-end challenge to 0. Cast ::int so the driver returns a number.
      daysRemaining: sql<number>`GREATEST((${challenges.endDate} - (now() AT TIME ZONE ${challenges.timezone})::date), 0)::int`,
    })
    .from(participations)
    .innerJoin(challenges, eq(participations.challengeId, challenges.id))
    .where(eq(participations.id, participationId));

  // Unknown participation → clean domain error (mirrors verifications.ts).
  if (!row) {
    throw new DomainErr(
      'INVALID_CONFIG',
      `Participation not found: ${participationId}`,
    );
  }

  return {
    participationId,
    survivalStatus: row.survivalStatus,
    currentStreak: row.currentStreak,
    daysRemaining: row.daysRemaining,
  };
}
