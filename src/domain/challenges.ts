/**
 * Challenge create/join domain functions — design.md → "Challenge_Service" and
 * "서버 트랜잭션 도메인 함수".
 *
 * This module owns the server-side challenge lifecycle logic. Task 4.1
 * implements {@link createUserChallenge} (User_Challenge 개설, Requirement 4);
 * later tasks (4.2, 4.3) append `joinUserChallenge` / `joinOfficialChallenge`
 * alongside it.
 *
 * Conventions (mirroring {@link file://./points.ts}):
 *   - Inner domain functions THROW a {@link DomainErr} on failure and return the
 *     raw success value. The transaction boundary rolls back on throw, and the
 *     outer Server Action / Route Handler (web spec) converts the throw into a
 *     `Result<T>` (see design.md → "Error Handling" / "오류 전파 원칙").
 *   - Every multi-write operation runs inside ONE `db.transaction(...)` so it is
 *     atomic (Requirement 14.3). The DB's declarative constraints
 *     (`kind_deposit_consistency`, `valid_dates`, `valid_capacity`,
 *     `valid_amount`, `reward_pools.challenge_id UNIQUE`) are the last line of
 *     defence behind the application-level validation here.
 *   - The Drizzle handle is INJECTED (first argument) rather than importing the
 *     module-level `db`, matching the injection style of `points.ts` and keeping
 *     the function testable against any client.
 *
 * Requirements traceability: 4.1, 4.2, 4.3, 4.4, 4.5.
 */

import { and, eq, sql } from 'drizzle-orm';
import { challenges, participations, rewardPools, profiles } from '../db/schema';
import type { Database } from '../db/index';
import { debitPoints } from './points';
import { DomainErr } from './errors';

/** A freshly created challenge's id. design.md → `ChallengeId`. */
export type ChallengeId = string;

/** A participation row's id. design.md → `ParticipationId`. */
export type ParticipationId = string;

/**
 * Host-supplied configuration for opening a User_Challenge (Requirement 4.1).
 *
 * Only the fields a Host controls are here; `kind`, `deposit_kind` and
 * `host_id` are NOT part of the config — {@link createUserChallenge} forces
 * them (Requirement 4.4) so a User_Challenge is always point-based with a Host.
 *
 * Required items (Requirement 4.2): `title`, `startDate`, `endDate`,
 * `dailyStudyMinutes`, `verificationDeadlineTime`, `capacity`, `entryPoints`.
 * The daily study minutes + verification deadline together define the
 * elimination condition (fail to verify enough study before the deadline →
 * eliminated), so there is no separate "elimination condition" field.
 */
export interface UserChallengeConfig {
  /** Challenge title (required, non-empty). */
  title: string;
  /** Optional free-text description. */
  description?: string | null;
  /** Inclusive start date, ISO `YYYY-MM-DD` (required). */
  startDate: string;
  /** Inclusive end date, ISO `YYYY-MM-DD`, on/after `startDate` (required). */
  endDate: string;
  /** Required daily study minutes to survive a day (required). */
  dailyStudyMinutes: number;
  /** Daily verification deadline, `HH:MM` or `HH:MM:SS` (required). */
  verificationDeadlineTime: string;
  /** IANA timezone the deadline is evaluated in. Default `Asia/Seoul`. */
  timezone?: string;
  /** Recruitment capacity, whole number of participants (required). */
  capacity: number;
  /**
   * Participation deposit in whole POINTS (required). Stored in the
   * `entry_amount` column; a User_Challenge never takes cash (Requirement 4.4).
   */
  entryPoints: number;
  /** Public listing scope (Requirement 4.5). Default `public`. */
  visibility?: 'public' | 'private';
  /** Service fee rate in `[0, 1]`. Default `0.10`. */
  serviceFeeRate?: number;
  /** Reward distribution rule (JSON object). Default `{}` (even split). */
  distributionRule?: Record<string, unknown>;
  /** Policy applied when a challenge ends with no finisher (Requirement 10.3). */
  noWinnerPolicy?: string | null;
}

/** Config values normalized into the exact shapes the `challenges` insert expects. */
interface NormalizedUserChallengeConfig {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  dailyStudyMinutes: number;
  verificationDeadlineTime: string;
  timezone: string;
  capacity: number;
  /** `numeric(14,2)` string derived from `entryPoints`. */
  entryAmount: string;
  visibility: 'public' | 'private';
  /** `numeric(5,4)` string. */
  serviceFeeRate: string;
  distributionRule: Record<string, unknown>;
  noWinnerPolicy: string | null;
}

// ---------------------------------------------------------------------------
// Allowed ranges (Requirement 4.3). Named + centralized so they are easy to
// find and adjust; the DB CHECK constraints backstop the ones they can express.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEZONE = 'Asia/Seoul';
const DEFAULT_SERVICE_FEE_RATE = 0.1;

const MAX_TITLE_LENGTH = 200;
const MIN_DAILY_STUDY_MINUTES = 1;
const MAX_DAILY_STUDY_MINUTES = 24 * 60; // one day
const MIN_CAPACITY = 1;
const MAX_CAPACITY = 1000; // User_Challenges are small-scale (Req 4 user story)
const MIN_ENTRY_POINTS = 0; // valid_amount CHECK allows 0
const MAX_ENTRY_POINTS = 1_000_000;
const MIN_SERVICE_FEE_RATE = 0;
const MAX_SERVICE_FEE_RATE = 1;

/** True for a strictly finite number (rejects NaN / Infinity / non-numbers). */
function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** True when a value counts as "not supplied" for a required item. */
function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

/** Validate an ISO calendar date `YYYY-MM-DD` (rejects e.g. `2025-02-30`). */
function isValidDateStr(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Validate a `HH:MM` or `HH:MM:SS` 24-hour clock time. */
function isValidTimeStr(v: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(v);
}

/**
 * Validate a {@link UserChallengeConfig} and return a normalized, insert-ready
 * copy. Pure (no DB access) so it is unit-testable in isolation and runs BEFORE
 * any write in {@link createUserChallenge}.
 *
 * Two-phase, so the error clearly says WHAT is wrong:
 *   1. Presence (Requirement 4.2): missing required items → `INVALID_CONFIG`
 *      whose message lists the missing item names.
 *   2. Range/format (Requirement 4.3): out-of-range/invalid values →
 *      `INVALID_CONFIG` whose message lists the offending items.
 *
 * @throws {DomainErr} `INVALID_CONFIG` with a descriptive message.
 */
export function assertValidUserChallengeConfig(
  config: UserChallengeConfig,
): NormalizedUserChallengeConfig {
  // --- Phase 1: required-item presence (Req 4.2) ---------------------------
  const missing: string[] = [];
  if (isBlank(config.title)) missing.push('title');
  if (isBlank(config.startDate)) missing.push('startDate');
  if (isBlank(config.endDate)) missing.push('endDate');
  if (!isFiniteNumber(config.dailyStudyMinutes)) missing.push('dailyStudyMinutes');
  if (isBlank(config.verificationDeadlineTime)) missing.push('verificationDeadlineTime');
  if (!isFiniteNumber(config.capacity)) missing.push('capacity');
  if (!isFiniteNumber(config.entryPoints)) missing.push('entryPoints');

  if (missing.length > 0) {
    throw new DomainErr(
      'INVALID_CONFIG',
      `Missing required config item(s): ${missing.join(', ')}`,
    );
  }

  // --- Phase 2: allowed ranges / formats (Req 4.3) -------------------------
  const invalid: string[] = [];

  if (config.title.trim().length > MAX_TITLE_LENGTH) {
    invalid.push(`title (max ${MAX_TITLE_LENGTH} chars)`);
  }
  if (!isValidDateStr(config.startDate)) {
    invalid.push('startDate (expected YYYY-MM-DD)');
  }
  if (!isValidDateStr(config.endDate)) {
    invalid.push('endDate (expected YYYY-MM-DD)');
  }
  // ISO dates compare correctly as strings; only check once both are well-formed.
  if (
    isValidDateStr(config.startDate) &&
    isValidDateStr(config.endDate) &&
    config.endDate < config.startDate
  ) {
    invalid.push('endDate (must be on or after startDate)');
  }
  if (
    !Number.isInteger(config.dailyStudyMinutes) ||
    config.dailyStudyMinutes < MIN_DAILY_STUDY_MINUTES ||
    config.dailyStudyMinutes > MAX_DAILY_STUDY_MINUTES
  ) {
    invalid.push(
      `dailyStudyMinutes (${MIN_DAILY_STUDY_MINUTES}..${MAX_DAILY_STUDY_MINUTES})`,
    );
  }
  if (!isValidTimeStr(config.verificationDeadlineTime)) {
    invalid.push('verificationDeadlineTime (expected HH:MM or HH:MM:SS)');
  }
  if (
    !Number.isInteger(config.capacity) ||
    config.capacity < MIN_CAPACITY ||
    config.capacity > MAX_CAPACITY
  ) {
    invalid.push(`capacity (${MIN_CAPACITY}..${MAX_CAPACITY})`);
  }
  if (
    !Number.isInteger(config.entryPoints) ||
    config.entryPoints < MIN_ENTRY_POINTS ||
    config.entryPoints > MAX_ENTRY_POINTS
  ) {
    invalid.push(
      `entryPoints (${MIN_ENTRY_POINTS}..${MAX_ENTRY_POINTS}, whole points)`,
    );
  }
  if (config.serviceFeeRate !== undefined) {
    if (
      !isFiniteNumber(config.serviceFeeRate) ||
      config.serviceFeeRate < MIN_SERVICE_FEE_RATE ||
      config.serviceFeeRate > MAX_SERVICE_FEE_RATE
    ) {
      invalid.push(`serviceFeeRate (${MIN_SERVICE_FEE_RATE}..${MAX_SERVICE_FEE_RATE})`);
    }
  }
  if (
    config.visibility !== undefined &&
    config.visibility !== 'public' &&
    config.visibility !== 'private'
  ) {
    invalid.push("visibility ('public' | 'private')");
  }
  if (
    config.timezone !== undefined &&
    (typeof config.timezone !== 'string' || config.timezone.trim() === '')
  ) {
    invalid.push('timezone (non-empty IANA string)');
  }
  if (
    config.distributionRule !== undefined &&
    (typeof config.distributionRule !== 'object' ||
      config.distributionRule === null ||
      Array.isArray(config.distributionRule))
  ) {
    invalid.push('distributionRule (JSON object)');
  }

  if (invalid.length > 0) {
    throw new DomainErr(
      'INVALID_CONFIG',
      `Config value(s) out of allowed range: ${invalid.join(', ')}`,
    );
  }

  return {
    title: config.title.trim(),
    description:
      typeof config.description === 'string' && config.description.trim() !== ''
        ? config.description.trim()
        : null,
    startDate: config.startDate,
    endDate: config.endDate,
    dailyStudyMinutes: config.dailyStudyMinutes,
    verificationDeadlineTime: config.verificationDeadlineTime,
    timezone: config.timezone?.trim() || DEFAULT_TIMEZONE,
    capacity: config.capacity,
    // Points are whole units; store as a numeric(14,2) string.
    entryAmount: config.entryPoints.toFixed(2),
    visibility: config.visibility ?? 'public',
    serviceFeeRate: (config.serviceFeeRate ?? DEFAULT_SERVICE_FEE_RATE).toString(),
    distributionRule: config.distributionRule ?? {},
    noWinnerPolicy:
      typeof config.noWinnerPolicy === 'string' && config.noWinnerPolicy.trim() !== ''
        ? config.noWinnerPolicy.trim()
        : null,
  };
}

/**
 * Open a User_Challenge on behalf of a Host (Requirement 4).
 *
 * Steps:
 *   1. Require an authenticated Host id (Requirement 1.5 / "Host 권한").
 *   2. Validate required items + allowed ranges (Requirement 4.2 / 4.3) BEFORE
 *      any write — {@link assertValidUserChallengeConfig}.
 *   3. In ONE transaction: confirm the Host profile exists, INSERT the
 *      challenge with `kind='user'` / `deposit_kind='point'` / `host_id` forced
 *      (Requirement 4.4) and the requested visibility (Requirement 4.5), then
 *      initialize the challenge's `reward_pools` row.
 *
 * The DB constraints `kind_deposit_consistency`, `valid_dates`,
 * `valid_capacity`, `valid_amount` backstop the application checks; the
 * `challenges.host_id → profiles.id` FK backstops the Host existence check.
 *
 * @param db     injected Drizzle client (production `db`, or a test client)
 * @param hostId authenticated Host's user id
 * @param config host-supplied challenge settings
 * @returns the new challenge's id
 * @throws {DomainErr} `UNAUTHENTICATED` if `hostId` is empty or the Host has no
 *   profile; `INVALID_CONFIG` (with a descriptive message) if the config is
 *   missing required items or has out-of-range values.
 */
export async function createUserChallenge(
  db: Database,
  hostId: string,
  config: UserChallengeConfig,
): Promise<ChallengeId> {
  // Req 1.5 / "Host 권한": an authenticated Host is required.
  if (!hostId) throw new DomainErr('UNAUTHENTICATED');

  // Req 4.2 / 4.3: fail fast on bad config, before touching the DB.
  const cfg = assertValidUserChallengeConfig(config);

  return db.transaction(async (tx) => {
    // Host permission backstop: the profile must exist. The challenges.host_id
    // FK would also reject an unknown host, but this yields a clean domain error.
    const [host] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, hostId));
    if (!host) throw new DomainErr('UNAUTHENTICATED');

    // Req 4.1 / 4.4: force kind='user', deposit_kind='point', host_id set;
    // Req 4.5: reflect the requested visibility scope.
    const [created] = await tx
      .insert(challenges)
      .values({
        kind: 'user',
        depositKind: 'point',
        hostId,
        title: cfg.title,
        description: cfg.description,
        status: 'recruiting',
        visibility: cfg.visibility,
        startDate: cfg.startDate,
        endDate: cfg.endDate,
        dailyStudyMinutes: cfg.dailyStudyMinutes,
        verificationDeadlineTime: cfg.verificationDeadlineTime,
        timezone: cfg.timezone,
        capacity: cfg.capacity,
        participantCount: 0,
        entryAmount: cfg.entryAmount,
        serviceFeeRate: cfg.serviceFeeRate,
        distributionRule: cfg.distributionRule,
        noWinnerPolicy: cfg.noWinnerPolicy,
      })
      .returning({ id: challenges.id });

    if (!created) {
      // Unreachable: a successful INSERT ... RETURNING always yields one row.
      throw new Error('createUserChallenge: challenge INSERT returned no row');
    }

    // Initialize the reward pool (Requirement 9/10/14): one pool per challenge
    // (reward_pools.challenge_id UNIQUE), starting empty.
    await tx.insert(rewardPools).values({
      challengeId: created.id,
      depositKind: 'point',
      totalDeposit: '0',
      poolAmount: '0',
      serviceFee: '0',
    });

    return created.id;
  });
}

/**
 * Join a User_Challenge by depositing points (Requirement 5).
 *
 * Everything below runs inside ONE `db.transaction(...)` so the point deposit,
 * the participation row, the recruitment count bump, and the reward-pool update
 * are all-or-nothing (Requirement 14.3). On any failure — insufficient balance,
 * recruitment closed / full, or duplicate participation — the transaction rolls
 * back and NOTHING is written (no points leave the wallet).
 *
 * Steps (design.md → "사용자 챌린지 참가"):
 *   1. Require an authenticated user id (Requirement 1.5).
 *   2. Lock the `challenges` row `FOR UPDATE` — serializes concurrent joins to
 *      the same challenge so the recruitment-count check/increment and the
 *      duplicate check are race-free (Property 12).
 *   3. Guard: this is the point/User_Challenge path only (`kind = 'user'`), the
 *      challenge must still be `recruiting`, the user must not already be a
 *      Participant (Requirement 5.4), and there must be room (Requirement 5.3).
 *   4. Deposit the entry points via {@link debitPoints} (locks the wallet
 *      `FOR UPDATE`, rejects insufficient balance with `INSUFFICIENT_POINTS`) —
 *      Requirement 5.1 / 5.2. A zero-point entry needs no wallet movement.
 *   5. INSERT the `participations` row (`survival_status='alive'`), increment
 *      `challenges.participant_count`, and add the deposit to
 *      `reward_pools.total_deposit`.
 *
 * DB constraints backstop the application checks: `uq_participation`
 * (duplicate — Requirement 5.4), `valid_capacity` (recruitment cap —
 * Requirement 5.3), `wallet_non_negative` / `balance_after_non_negative`
 * (balance — Requirement 14.2).
 *
 * @param db          injected Drizzle client (production `db`, or a test client)
 * @param userId      authenticated participant's user id
 * @param challengeId the User_Challenge to join
 * @returns the new participation's id
 * @throws {DomainErr} `UNAUTHENTICATED` (no user id / no wallet),
 *   `INVALID_CONFIG` (challenge missing or not a User_Challenge),
 *   `CAPACITY_FULL` (recruitment closed or full — Req 5.3),
 *   `DUPLICATE_PARTICIPATION` (already joined — Req 5.4),
 *   `INSUFFICIENT_POINTS` (balance below entry points — Req 5.2).
 */
export async function joinUserChallenge(
  db: Database,
  userId: string,
  challengeId: string,
): Promise<ParticipationId> {
  // Req 1.5: an authenticated user is required (Server Action verifies session).
  if (!userId) throw new DomainErr('UNAUTHENTICATED');

  return db.transaction(async (tx) => {
    // Recruitment-count concurrency control: lock the challenge row so all
    // joins to this challenge are serialized (Property 12 / Req 5.3).
    const [ch] = await tx
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId))
      .for('update');

    // A missing challenge cannot be joined. No dedicated "not found" code
    // exists in the domain union, so surface it as an invalid request.
    if (!ch) {
      throw new DomainErr('INVALID_CONFIG', `Challenge not found: ${challengeId}`);
    }
    // This path is for point-based User_Challenges only; Official_Challenges
    // join via joinOfficialChallenge (Task 4.3).
    if (ch.kind !== 'user') {
      throw new DomainErr('INVALID_CONFIG', 'Not a User_Challenge');
    }
    // Req 5.3: recruitment must be open.
    if (ch.status !== 'recruiting') throw new DomainErr('CAPACITY_FULL');

    // Req 5.4: reject a duplicate join. Under the challenge FOR UPDATE lock this
    // read is race-free; `uq_participation` UNIQUE is the last-line backstop.
    const [existing] = await tx
      .select({ id: participations.id })
      .from(participations)
      .where(
        and(
          eq(participations.challengeId, challengeId),
          eq(participations.userId, userId),
        ),
      );
    if (existing) throw new DomainErr('DUPLICATE_PARTICIPATION');

    // Req 5.3: recruitment must not be full. `valid_capacity` CHECK backstops.
    if (ch.participantCount >= ch.capacity) throw new DomainErr('CAPACITY_FULL');

    // Req 5.1 / 5.2: deposit the entry points (debitPoints locks the wallet and
    // throws INSUFFICIENT_POINTS on a shortfall → rollback). A free (0-point)
    // challenge moves no points, so skip the debit (debitPoints rejects 0).
    const depositPoints = Number(ch.entryAmount);
    if (depositPoints > 0) {
      await debitPoints(
        tx,
        userId,
        depositPoints,
        'challenge_join',
        'User_Challenge 참가 예치',
        challengeId,
      );
    }

    // Register the Participant as alive with the point deposit (Req 5.1).
    // A duplicate slipping past the check above trips `uq_participation`.
    const [part] = await tx
      .insert(participations)
      .values({
        challengeId,
        userId,
        survivalStatus: 'alive',
        depositKind: 'point',
        depositAmount: ch.entryAmount,
      })
      .returning({ id: participations.id });

    if (!part) {
      // Unreachable: a successful INSERT ... RETURNING always yields one row.
      throw new Error('joinUserChallenge: participation INSERT returned no row');
    }

    // Bump the recruitment count (valid_capacity CHECK guarantees the cap).
    await tx
      .update(challenges)
      .set({ participantCount: sql`${challenges.participantCount} + 1` })
      .where(eq(challenges.id, challengeId));

    // Fold the deposit into the challenge's reward pool total. createUserChallenge
    // (Task 4.1) initializes the row; onConflictDoUpdate keeps this idempotent.
    await tx
      .insert(rewardPools)
      .values({
        challengeId,
        depositKind: 'point',
        totalDeposit: ch.entryAmount,
      })
      .onConflictDoUpdate({
        target: rewardPools.challengeId,
        set: {
          totalDeposit: sql`${rewardPools.totalDeposit} + ${ch.entryAmount}`,
        },
      });

    return part.id;
  });
}
