/**
 * Verification / timer domain functions — design.md → "Verification_Service"
 * and "서버 트랜잭션 도메인 함수".
 *
 * This module owns the day-to-day verification write path for a Participant.
 * Task 6.1 implements the two pre-verification steps:
 *
 *   - {@link submitDailyGoal}    — record the Participant's Daily_Goal for a
 *                                  date (Requirement 6.1).
 *   - {@link recordTimerSession} — fold a Study_Timer session's elapsed seconds
 *                                  into that date's `accumulated_seconds`, and
 *                                  flip `study_goal_met` once the challenge's
 *                                  required daily study time is reached
 *                                  (Requirements 6.2–6.4).
 *
 * Task 6.2 adds the gated survival verification alongside these:
 *
 *   - {@link submitVerification} — complete a date's survival verification only
 *                                  when ALL gates pass: the study-time condition
 *                                  is met, retrospective + evidence are supplied,
 *                                  the Verification_Deadline has not passed, and
 *                                  the Participant is still `alive` (Requirements
 *                                  7.1–7.4, 8.3).
 *
 * Task 6.3 credits reward points inside that SAME success transaction — on a
 * newly-completed verification the retrospective-writing bonus (Requirement
 * 11.3) is credited, `current_streak` is incremented, and a Streak-milestone
 * bonus (Requirement 11.2) is credited when the streak lands on a milestone.
 * The reward and its verification therefore commit (or roll back) atomically,
 * and re-submitting an already-completed date does not double-credit.
 *
 * Conventions (mirroring {@link file://./points.ts} and
 * {@link file://./challenges.ts}):
 *   - Inner domain functions THROW a {@link DomainErr} on failure and return the
 *     raw success value. Drizzle's `db.transaction()` rolls back on throw, and
 *     the outer Server Action / Route Handler (web spec) converts the throw into
 *     a `Result<T>` (design.md → "Error Handling" / "오류 전파 원칙").
 *   - The Drizzle handle is INJECTED (first argument) rather than importing the
 *     module-level `db`, keeping the functions testable against any client.
 *   - Both operations key on the `daily_verifications` daily unique constraint
 *     `uq_daily` (participation_id, verify_date) so re-submitting the same date
 *     UPSERTS (updates the existing row) rather than creating a duplicate
 *     (Requirement 7.4). The `accum_non_negative` CHECK is the DB-level last
 *     line of defence against a negative accumulated total (Requirement 6.3).
 *
 * Requirements traceability: 6.1, 6.2, 6.3, 6.4, 7.1–7.4, 8.3, 11.2, 11.3, 11.5.
 */

import { and, eq, sql } from 'drizzle-orm';
import { dailyVerifications, participations, challenges } from '../db/schema';
import type { Database } from '../db/index';
import { DomainErr } from './errors';
import { creditPoints } from './points';
import {
  RETROSPECTIVE_BONUS_POINTS,
  STREAK_MILESTONE_BONUS_POINTS,
  isStreakMilestone,
} from './rewards';

/** Seconds in one minute — converts the challenge's daily minutes to seconds. */
const SECONDS_PER_MINUTE = 60;

/**
 * The result of accumulating a timer session into a date's total. design.md →
 * `AccumulatedTime` (return of `recordTimerSession`).
 */
export interface AccumulatedTime {
  /** The date's accumulated study seconds AFTER this session was folded in. */
  accumulatedSeconds: number;
  /**
   * Whether the accumulated total has reached the challenge's required daily
   * study time (Requirement 6.4). Monotonic: once true it stays true, since
   * sessions only ever add non-negative seconds.
   */
  studyGoalMet: boolean;
}

/** True for a whole, finite, non-negative number (rejects NaN/Infinity/floats). */
function isNonNegativeInteger(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0;
}

/** Validate an ISO calendar date `YYYY-MM-DD` (rejects e.g. `2025-02-30`). */
function isValidDateStr(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/**
 * Record (or overwrite) a Participant's Daily_Goal for a date (Requirement 6.1).
 *
 * Keyed on `uq_daily` (participation_id, verify_date): the first submission for
 * a date INSERTS the row, and a re-submission UPDATES the same row's
 * `daily_goal` rather than creating a duplicate (Requirement 7.4). Only the
 * goal text is touched — accumulated time / verification state are left intact.
 *
 * The `daily_verifications.participation_id → participations.id` FK backstops
 * the participation-existence check.
 *
 * @param db              injected Drizzle client (production `db`, or a test client)
 * @param participationId the Participant's participation row id
 * @param date            the goal's date, ISO `YYYY-MM-DD`
 * @param goal            the Daily_Goal text (non-empty)
 * @throws {DomainErr} `INVALID_CONFIG` if the date is malformed, the goal is
 *   blank, or the participation does not exist.
 */
export async function submitDailyGoal(
  db: Database,
  participationId: string,
  date: string,
  goal: string,
): Promise<void> {
  // Req 6.1: reject bad input before touching the DB.
  if (!isValidDateStr(date)) {
    throw new DomainErr('INVALID_CONFIG', 'date must be an ISO YYYY-MM-DD string');
  }
  const trimmedGoal = typeof goal === 'string' ? goal.trim() : '';
  if (trimmedGoal === '') {
    throw new DomainErr('INVALID_CONFIG', 'goal must be a non-empty string');
  }

  await db.transaction(async (tx) => {
    // Clean domain error for an unknown participation; the FK is the backstop.
    const [part] = await tx
      .select({ id: participations.id })
      .from(participations)
      .where(eq(participations.id, participationId));
    if (!part) {
      throw new DomainErr(
        'INVALID_CONFIG',
        `Participation not found: ${participationId}`,
      );
    }

    // Upsert on uq_daily: insert on first goal for the date, else update the
    // existing row's goal (Req 7.4 — one row per date).
    await tx
      .insert(dailyVerifications)
      .values({
        participationId,
        verifyDate: date,
        dailyGoal: trimmedGoal,
      })
      .onConflictDoUpdate({
        target: [dailyVerifications.participationId, dailyVerifications.verifyDate],
        set: { dailyGoal: trimmedGoal },
      });
  });
}

/**
 * Fold a Study_Timer session's elapsed seconds into a date's accumulated study
 * time, and mark the study-time condition met once the challenge's required
 * daily study time is reached (Requirements 6.2–6.4).
 *
 * Steps:
 *   1. Reject a negative / non-integer / non-finite `elapsedSeconds` at the app
 *      level (Requirement 6.3) — the `accum_non_negative` CHECK is the DB
 *      backstop.
 *   2. Resolve the challenge's required daily study time via the participation
 *      → challenge join (`daily_study_minutes * 60` seconds).
 *   3. UPSERT the date's `daily_verifications` row on `uq_daily`: on first
 *      session INSERT with `accumulated_seconds = elapsed`, else atomically add
 *      the elapsed seconds to the existing total. `study_goal_met` is
 *      (re)computed from the resulting total vs. the required seconds so it
 *      flips true exactly when the total first reaches the requirement
 *      (Requirement 6.4).
 *
 * The single UPSERT statement is race-safe: concurrent sessions for the same
 * date serialize on the `uq_daily` unique index, so the `accumulated_seconds`
 * read-modify-write cannot lose an update.
 *
 * @param db              injected Drizzle client (production `db`, or a test client)
 * @param participationId the Participant's participation row id
 * @param date            the session's date, ISO `YYYY-MM-DD`
 * @param elapsedSeconds  whole, non-negative seconds elapsed in this session
 * @returns the date's accumulated seconds and study-goal-met flag after folding
 *   in this session
 * @throws {DomainErr} `INVALID_CONFIG` if the date is malformed, the elapsed
 *   seconds are negative / non-integer / non-finite, or the participation does
 *   not exist.
 */
export async function recordTimerSession(
  db: Database,
  participationId: string,
  date: string,
  elapsedSeconds: number,
): Promise<AccumulatedTime> {
  // Req 6.3: reject bad input before touching the DB. `accum_non_negative`
  // CHECK backstops a negative accumulated total if this is ever bypassed.
  if (!isValidDateStr(date)) {
    throw new DomainErr('INVALID_CONFIG', 'date must be an ISO YYYY-MM-DD string');
  }
  if (!isNonNegativeInteger(elapsedSeconds)) {
    throw new DomainErr(
      'INVALID_CONFIG',
      'elapsedSeconds must be a whole, non-negative number',
    );
  }

  return db.transaction(async (tx) => {
    // Resolve the challenge's daily requirement via the participation join.
    // A missing row means an unknown participation (clean domain error; the
    // participation_id FK is the backstop).
    const [row] = await tx
      .select({ dailyStudyMinutes: challenges.dailyStudyMinutes })
      .from(participations)
      .innerJoin(challenges, eq(participations.challengeId, challenges.id))
      .where(eq(participations.id, participationId));
    if (!row) {
      throw new DomainErr(
        'INVALID_CONFIG',
        `Participation not found: ${participationId}`,
      );
    }

    const requiredSeconds = row.dailyStudyMinutes * SECONDS_PER_MINUTE;

    // Upsert on uq_daily. On INSERT the total is just this session; on conflict
    // add the elapsed seconds to the existing total (atomic under the row lock
    // Postgres holds during the ON CONFLICT UPDATE). study_goal_met is derived
    // from the resulting total vs. the requirement (Req 6.4).
    const [result] = await tx
      .insert(dailyVerifications)
      .values({
        participationId,
        verifyDate: date,
        accumulatedSeconds: elapsedSeconds,
        studyGoalMet: elapsedSeconds >= requiredSeconds,
      })
      .onConflictDoUpdate({
        target: [dailyVerifications.participationId, dailyVerifications.verifyDate],
        set: {
          accumulatedSeconds: sql`${dailyVerifications.accumulatedSeconds} + ${elapsedSeconds}`,
          studyGoalMet: sql`(${dailyVerifications.accumulatedSeconds} + ${elapsedSeconds}) >= ${requiredSeconds}`,
        },
      })
      .returning({
        accumulatedSeconds: dailyVerifications.accumulatedSeconds,
        studyGoalMet: dailyVerifications.studyGoalMet,
      });

    if (!result) {
      // Unreachable: a successful INSERT ... ON CONFLICT ... RETURNING yields a row.
      throw new Error('recordTimerSession: upsert returned no row');
    }

    return {
      accumulatedSeconds: result.accumulatedSeconds,
      studyGoalMet: result.studyGoalMet,
    };
  });
}

/** Verification state enum value (`daily_verifications.state`). */
type VerificationState = (typeof dailyVerifications.$inferSelect)['state'];

/**
 * Input for {@link submitVerification}. Mirrors design.md →
 * `VerificationService.submitVerification`.
 */
export interface SubmitVerificationInput {
  /** The Participant's participation row id. */
  participationId: string;
  /** The verification's date, ISO `YYYY-MM-DD`. */
  date: string;
  /** The Retrospective text (Requirement 7.1, non-empty). */
  retrospective: string;
  /**
   * The Verification_Evidence Storage path
   * `{user_id}/{challenge_id}/{date}` (Requirement 7.1, non-empty).
   */
  evidencePath: string;
}

/**
 * The recorded status of a completed survival verification. design.md →
 * `VerificationStatus` (return of `submitVerification`).
 */
export interface VerificationStatus {
  /** The participation the verification belongs to. */
  participationId: string;
  /** The verification's date, ISO `YYYY-MM-DD`. */
  date: string;
  /** Always `'completed'` on the success path (Requirement 7.4). */
  state: VerificationState;
  /** When the verification was recorded as completed (DB `now()`). */
  completedAt: Date;
}

/**
 * Complete a Participant's daily survival verification for a date, but ONLY
 * when every gate passes (Requirements 7.1–7.4, 8.3).
 *
 * The gate is the conjunction of four conditions; each unmet condition maps to a
 * specific rejection:
 *   1. Retrospective + Verification_Evidence supplied (Requirement 7.1) — blank
 *      input is rejected with `INVALID_CONFIG` BEFORE any DB work, mirroring the
 *      input validation in {@link submitDailyGoal}.
 *   2. `survival_status = 'alive'` (Requirement 8.3) — an eliminated/completed
 *      Participant may not submit, rejected with `NOT_ALIVE`. Checked first so an
 *      ineligible Participant is always turned away regardless of the other gates
 *      (Property 8 — "탈락 후 인증 불가").
 *   3. `study_goal_met = true` for the date (Requirement 7.2) — the accumulated
 *      study time reached the challenge's daily requirement; otherwise
 *      `STUDY_TIME_NOT_MET`. A date with no verification row yet has not met the
 *      requirement (the `LEFT JOIN` yields `null`), so it is treated as unmet.
 *   4. `now() <= Verification_Deadline` (Requirement 7.3) — the effective
 *      deadline is the date's `verification_deadline_time` interpreted in the
 *      challenge's `timezone`; a late submission is rejected with
 *      `DEADLINE_EXCEEDED`. The comparison is evaluated in Postgres so the
 *      timezone math and the "now" clock are both the database's.
 *
 * Concurrency & atomicity: the participation row is locked `FOR UPDATE` (via
 * `FOR UPDATE OF participations`, valid alongside the nullable `LEFT JOIN` to
 * `daily_verifications`) so concurrent submissions for the same participation
 * serialize; the read-gate-then-upsert therefore cannot race. On success the
 * date's `daily_verifications` row is UPSERTED on `uq_daily`
 * (participation_id, verify_date) — one row per date (Requirement 7.4) — setting
 * `retrospective`, `evidence_path`, `state='completed'`, and `completed_at`. On
 * any thrown gate the surrounding transaction rolls back and nothing is written.
 *
 * Reward crediting (Task 6.3): on a NEWLY completed verification, and inside
 * this SAME transaction, `current_streak` is incremented by one (Req 11.2), the
 * retrospective-writing bonus is credited (Req 11.3), and — when the extended
 * streak lands on a milestone — the streak-milestone bonus is credited (Req
 * 11.2). Each credit records its reason + amount on the append-only point
 * ledger (Req 11.5) via {@link creditPoints}. Re-submitting an already-completed
 * date credits nothing and leaves the streak unchanged (idempotent — Req 7.4).
 *
 * @param db    injected Drizzle client (production `db`, or a test client)
 * @param input the participation, date, retrospective, and evidence path
 * @returns the recorded {@link VerificationStatus} on success
 * @throws {DomainErr}
 *   `INVALID_CONFIG` — malformed date, blank retrospective/evidence, or unknown
 *     participation;
 *   `NOT_ALIVE` — the Participant is not `alive` (Req 8.3);
 *   `STUDY_TIME_NOT_MET` — the study-time condition is not met (Req 7.2);
 *   `DEADLINE_EXCEEDED` — submitted after the Verification_Deadline (Req 7.3).
 */
export async function submitVerification(
  db: Database,
  input: SubmitVerificationInput,
): Promise<VerificationStatus> {
  const { participationId, date } = input;

  // Req 7.1 (input presence): reject bad input before touching the DB.
  if (!isValidDateStr(date)) {
    throw new DomainErr('INVALID_CONFIG', 'date must be an ISO YYYY-MM-DD string');
  }
  const retrospective =
    typeof input.retrospective === 'string' ? input.retrospective.trim() : '';
  if (retrospective === '') {
    throw new DomainErr('INVALID_CONFIG', 'retrospective must be a non-empty string');
  }
  const evidencePath =
    typeof input.evidencePath === 'string' ? input.evidencePath.trim() : '';
  if (evidencePath === '') {
    throw new DomainErr('INVALID_CONFIG', 'evidencePath must be a non-empty string');
  }

  return db.transaction(async (tx) => {
    // Lock the participation row (`FOR UPDATE OF participations`) and read the
    // gate inputs in one shot: survival status, the date's study_goal_met (via a
    // nullable LEFT JOIN — no row yet means "not met"), and whether the effective
    // Verification_Deadline (date's deadline time in the challenge timezone) is
    // still in the future. The deadline comparison runs in Postgres so both the
    // timezone conversion and `now()` come from the database.
    const [row] = await tx
      .select({
        userId: participations.userId,
        currentStreak: participations.currentStreak,
        survivalStatus: participations.survivalStatus,
        studyGoalMet: dailyVerifications.studyGoalMet,
        // Prior state of the date's verification row (null when none exists yet)
        // — used to make reward crediting idempotent on re-submission (Req 7.4).
        priorState: dailyVerifications.state,
        withinDeadline: sql<boolean>`now() <= ((${date}::date + ${challenges.verificationDeadlineTime}) AT TIME ZONE ${challenges.timezone})`,
      })
      .from(participations)
      .innerJoin(challenges, eq(participations.challengeId, challenges.id))
      .leftJoin(
        dailyVerifications,
        and(
          eq(dailyVerifications.participationId, participations.id),
          eq(dailyVerifications.verifyDate, date),
        ),
      )
      .where(eq(participations.id, participationId))
      .for('update', { of: participations });

    // Unknown participation → clean domain error (the participation_id FK on
    // daily_verifications is the backstop).
    if (!row) {
      throw new DomainErr(
        'INVALID_CONFIG',
        `Participation not found: ${participationId}`,
      );
    }

    // Req 8.3: an eliminated / completed Participant may not verify. Checked
    // first so ineligibility always wins over the other gates (Property 8).
    if (row.survivalStatus !== 'alive') {
      throw new DomainErr('NOT_ALIVE');
    }
    // Req 7.2: the study-time condition must be met for the date. A missing
    // daily row (LEFT JOIN → null) counts as "not met".
    if (!row.studyGoalMet) {
      throw new DomainErr('STUDY_TIME_NOT_MET');
    }
    // Req 7.3: the submission must be at/before the Verification_Deadline.
    if (!row.withinDeadline) {
      throw new DomainErr('DEADLINE_EXCEEDED');
    }

    // Was this date ALREADY completed before this call? Re-submitting an
    // already-completed date (Req 7.4 — one row per date) is idempotent for
    // rewards: it must NOT re-increment the streak or re-credit the bonuses.
    // Read before the upsert, safe under the `FOR UPDATE` participation lock.
    const alreadyCompleted = row.priorState === 'completed';

    // All gates passed — record the completed verification. Upsert on uq_daily
    // (Req 7.4): the date's row already exists (study_goal_met=true implies a
    // prior timer session created it), so this updates it; the insert branch is
    // a defensive fallback. `completed_at` uses the DB clock.
    const [result] = await tx
      .insert(dailyVerifications)
      .values({
        participationId,
        verifyDate: date,
        retrospective,
        evidencePath,
        state: 'completed',
        completedAt: sql`now()`,
      })
      .onConflictDoUpdate({
        target: [dailyVerifications.participationId, dailyVerifications.verifyDate],
        set: {
          retrospective,
          evidencePath,
          state: 'completed',
          completedAt: sql`now()`,
        },
      })
      .returning({
        state: dailyVerifications.state,
        completedAt: dailyVerifications.completedAt,
      });

    if (!result || result.completedAt === null) {
      // Unreachable: the success upsert always writes a completed row with
      // completed_at set and RETURNING yields it.
      throw new Error('submitVerification: upsert returned no completed row');
    }

    // Task 6.3 — credit reward points in THIS same transaction, so a reward and
    // its verification commit (or roll back) atomically. Only on a NEWLY
    // completed verification: re-submitting an already-completed date leaves the
    // streak and wallet untouched (idempotent — Req 7.4).
    if (!alreadyCompleted) {
      // Req 11.2: this successful verification extends the Streak by one day.
      const newStreak = row.currentStreak + 1;
      await tx
        .update(participations)
        .set({ currentStreak: newStreak })
        .where(eq(participations.id, participationId));

      // Req 11.3 / 11.5: credit the retrospective-writing bonus, recording the
      // reason + amount on the append-only ledger (via creditPoints).
      await creditPoints(
        tx,
        row.userId,
        RETROSPECTIVE_BONUS_POINTS,
        'retrospective_bonus',
        `Retrospective bonus for ${date}`,
        participationId,
      );

      // Req 11.2 / 11.5: when the extended Streak lands on a milestone, credit
      // the streak-milestone bonus in the same transaction.
      if (isStreakMilestone(newStreak)) {
        await creditPoints(
          tx,
          row.userId,
          STREAK_MILESTONE_BONUS_POINTS,
          'streak_bonus',
          `Streak milestone bonus (${newStreak}-day streak) for ${date}`,
          participationId,
        );
      }
    }

    return {
      participationId,
      date,
      state: result.state,
      completedAt: result.completedAt,
    };
  });
}
