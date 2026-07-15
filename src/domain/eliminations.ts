/**
 * Daily elimination domain function — design.md → "Verification_Service"
 * (`processDailyEliminations`) and "서버 트랜잭션 도메인 함수" / "일일 탈락 처리".
 *
 * This module owns the batch survival-elimination write path (Requirement 8).
 * Once a date's Verification_Deadline has passed, any Participant who is still
 * `alive` but did NOT complete that day's survival verification must be
 * eliminated: their `survival_status` flips to `eliminated` (with the
 * `eliminated_on` date recorded — Requirement 8.1), their forfeited Deposit is
 * folded into the challenge's `reward_pools.pool_amount` (Requirement 8.2), and
 * the missed day is recorded as `daily_verifications.state = 'missed'`.
 *
 * ── Entry-point contract (consumed by the web spec) ────────────────────────
 * {@link processDailyEliminations} is the CONTRACT boundary between this core
 * spec and the separate "survival-study-web" spec. The web spec wires a
 * **Vercel Cron** schedule to a **protected Route Handler** (e.g.
 * `GET /api/cron/eliminations`) that calls this function on a fine-grained
 * cadence (design.md → "Scheduling 전략": 예: 10분). This module does NOT build
 * that Route Handler.
 *
 *   IMPORTANT — the caller MUST be protected. The invoking Route Handler runs
 *   with a privileged server connection (service role) and MUST verify the
 *   Vercel Cron secret (header) BEFORE calling this function, so an
 *   unauthenticated external request can never trigger eliminations
 *   (design.md → "Scheduling 전략": "Cron Route Handler는 Vercel Cron
 *   시크릿(헤더) 검증으로 외부 호출을 차단한다"). This function performs no
 *   session/permission check of its own — that is the protected caller's job.
 *
 * Conventions (mirroring {@link file://./points.ts}, {@link file://./challenges.ts},
 * {@link file://./verifications.ts}):
 *   - The whole batch runs inside ONE `db.transaction(...)` so every
 *     elimination in a run is all-or-nothing (Requirement 14.3). A throw
 *     anywhere rolls the entire run back — no partial pool folds, no orphaned
 *     status changes.
 *   - The Drizzle handle is INJECTED (first argument) rather than importing the
 *     module-level `db`, keeping the function testable against any client.
 *   - DB declarative constraints backstop the writes: `elim_date_consistency`
 *     (an `eliminated` row must carry `eliminated_on` — Requirement 8.1),
 *     `pool_non_negative` (Requirement 14), `uq_daily` (one verification row per
 *     date — Requirement 7.4).
 *
 * Deadline / timezone computation matches the pattern established in
 * verifications.ts: a date `d`'s deadline instant is
 * `(d::date + verification_deadline_time) AT TIME ZONE timezone`, and the
 * deadline has PASSED when that instant is `<=` the run's "now". Each
 * challenge is therefore evaluated in ITS OWN `timezone`.
 *
 * Requirements traceability: 7.4, 8.1, 8.2.
 */

import { eq, sql } from 'drizzle-orm';
import { participations, rewardPools, dailyVerifications } from '../db/schema';
import type { Database } from '../db/index';

/**
 * Summary returned to the (protected) caller. design.md →
 * `processDailyEliminations` return (`{ eliminated: number }`). The web spec's
 * Route Handler serializes this back to the Cron invoker.
 */
export interface DailyEliminationSummary {
  /** How many Participants were transitioned to `eliminated` in this run. */
  eliminated: number;
}

/**
 * One elimination target resolved by the selection query below: an `alive`
 * Participant in an `in_progress` challenge together with the EARLIEST day they
 * failed (a past-deadline date within the challenge window that has no
 * `completed` verification). Locked `FOR UPDATE` so concurrent runs cannot
 * process the same Participant twice.
 *
 * Declared as a `type` (not `interface`) so it satisfies the
 * `Record<string, unknown>` constraint on `tx.execute<TRow>()`.
 */
type EliminationTargetRow = {
  /** `participations.id` of the Participant to eliminate. */
  part_id: string;
  /** `participations.challenge_id` — which challenge's pool to credit. */
  challenge_id: string;
  /** `participations.deposit_amount` as a `numeric` string (e.g. "1000.00"). */
  deposit_amount: string;
  /** The earliest missed date, ISO `YYYY-MM-DD` — becomes `eliminated_on`. */
  miss_date: string;
};

/**
 * Eliminate every Participant who has fallen out of survival, folding each
 * forfeited Deposit into its challenge's Reward_Pool (Requirement 8).
 *
 * Selection (single locking query): for each `alive` Participant in an
 * `in_progress` challenge, the query finds — evaluated in the challenge's own
 * `timezone` — the EARLIEST date `d` within `[start_date, end_date]` whose
 * Verification_Deadline has already passed (`(d + deadline_time) AT TIME ZONE tz
 * <= runTime`) and for which the Participant has NO `completed` verification. If
 * such a `d` exists, the Participant is a target and `d` is their
 * `eliminated_on`. Choosing the earliest missed day makes the result correct
 * regardless of how long the Cron has been idle (Property 6 — "탈락 완전성":
 * after this runs, no `alive` Participant has a passed-deadline, unverified
 * day). The rows are locked `FOR UPDATE OF participations`, so a concurrent run
 * blocks and then sees them already `eliminated`, preventing a double fold
 * (Property 7).
 *
 * Per target, all inside the one transaction:
 *   1. `participations` → `survival_status = 'eliminated'`, `eliminated_on =
 *      miss_date` (Requirement 8.1; `elim_date_consistency` CHECK backstops).
 *   2. `reward_pools.pool_amount += deposit_amount` for the challenge — the
 *      forfeited Deposit is folded into the pool (Requirement 8.2). The pool row
 *      exists for any challenge with participants (created at challenge
 *      creation / first join), and `reward_pools.challenge_id` is UNIQUE, so
 *      exactly one row is updated. The increase equals the sum of eliminated
 *      Deposits (Property 7).
 *   3. `daily_verifications` for `(participation, miss_date)` is UPSERTED to
 *      `state = 'missed'` on `uq_daily` — recording the missed day without
 *      duplicating the date's row (Requirement 7.4).
 *
 * @param db      injected Drizzle client (production `db`, or a test client)
 * @param runTime the instant to evaluate deadlines against. Defaults to the DB
 *   clock (`now()`), matching verifications.ts. An explicit value (e.g. for the
 *   Cron trigger or deterministic tests) is compared as a `timestamptz`.
 * @returns how many Participants were eliminated in this run
 */
export async function processDailyEliminations(
  db: Database,
  runTime?: Date,
): Promise<DailyEliminationSummary> {
  // Evaluate deadlines against the DB clock by default (design/verifications.ts
  // convention); when an explicit runTime is supplied, compare against it.
  const asOf = runTime ? sql`${runTime.toISOString()}::timestamptz` : sql`now()`;

  return db.transaction(async (tx) => {
    // Resolve + lock every elimination target. The LATERAL subquery walks each
    // challenge's day range in ITS timezone and returns the earliest
    // past-deadline day the Participant did not complete. `FOR UPDATE OF p`
    // locks only the participation rows so concurrent runs serialize on them.
    const targets = await tx.execute<EliminationTargetRow>(sql`
      SELECT
        p.id            AS part_id,
        p.challenge_id  AS challenge_id,
        p.deposit_amount AS deposit_amount,
        missed.miss_date::text AS miss_date
      FROM participations p
      JOIN challenges c ON c.id = p.challenge_id
      JOIN LATERAL (
        SELECT gs::date AS miss_date
        FROM generate_series(
          c.start_date::timestamp,
          c.end_date::timestamp,
          interval '1 day'
        ) AS gs
        WHERE ((gs::date + c.verification_deadline_time) AT TIME ZONE c.timezone) <= ${asOf}
          AND NOT EXISTS (
            SELECT 1
            FROM daily_verifications dv
            WHERE dv.participation_id = p.id
              AND dv.verify_date = gs::date
              AND dv.state = 'completed'
          )
        ORDER BY gs::date ASC
        LIMIT 1
      ) missed ON true
      WHERE p.survival_status = 'alive'
        AND c.status = 'in_progress'
      FOR UPDATE OF p
    `);

    let eliminated = 0;
    for (const t of targets) {
      // Req 8.1: transition to eliminated and record the failed date. The
      // elim_date_consistency CHECK guarantees eliminated_on is set.
      await tx
        .update(participations)
        .set({ survivalStatus: 'eliminated', eliminatedOn: t.miss_date })
        .where(eq(participations.id, t.part_id));

      // Req 8.2: fold the forfeited Deposit into the challenge's Reward_Pool.
      // Exactly one reward_pools row per challenge (challenge_id UNIQUE).
      await tx
        .update(rewardPools)
        .set({ poolAmount: sql`${rewardPools.poolAmount} + ${t.deposit_amount}` })
        .where(eq(rewardPools.challengeId, t.challenge_id));

      // Req 7.4: record the missed day. Upsert on uq_daily so a pre-existing
      // (e.g. pending) row for the date is flipped to 'missed' rather than
      // duplicated.
      await tx
        .insert(dailyVerifications)
        .values({
          participationId: t.part_id,
          verifyDate: t.miss_date,
          state: 'missed',
        })
        .onConflictDoUpdate({
          target: [dailyVerifications.participationId, dailyVerifications.verifyDate],
          set: { state: 'missed' },
        });

      eliminated += 1;
    }

    return { eliminated };
  });
}
