import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import { createServiceRoleClient } from './helpers/supabaseClient';
import { challenges, rewardPools } from '../src/db/schema';
import {
  createUserChallenge,
  type UserChallengeConfig,
} from '../src/domain/challenges';

/**
 * Feature: survival-study-challenge
 * Property 13: 챌린지 종류-예치 정합성 (challenge kind ↔ deposit consistency)
 *
 * *For any* 생성되는 챌린지에 대해, `kind = 'user'` 이면 `deposit_kind = 'point'`
 * 이고 host가 존재하며, `kind = 'official'` 이면 `deposit_kind = 'cash'` 이다.
 * (design.md → "Correctness Properties" / Property 13. `kind_deposit_consistency`
 * CHECK가 강제)
 *
 * Two complementary halves cover the whole property against the REMOTE Supabase
 * Postgres (no mocks):
 *
 *   1. **user → point + host (application layer).** For an arbitrary VALID
 *      {@link UserChallengeConfig} — varied title/description/dates/study
 *      minutes/deadline/timezone/capacity/entryPoints/visibility/fee/rule — the
 *      REAL {@link createUserChallenge} always persists `kind='user'`,
 *      `deposit_kind='point'`, and `host_id == the caller`, regardless of what
 *      the config contained (those three fields are forced, never taken from the
 *      config). The freshly created row is read back and asserted; the reward
 *      pool it initializes is also point-kind.
 *
 *   2. **kind_deposit_consistency invariant (DB layer).** There is no
 *      Official_Challenge create function yet (that is a later spec), so the
 *      `official → cash` side of Property 13 — and the rejection of every
 *      inconsistent combination — is proven directly at the DB constraint by
 *      attempting raw INSERTs: `user+cash`, `official+point`, and
 *      `user+point` with a NULL host are each REJECTED by the CHECK, while a
 *      consistent `official+cash` row is ACCEPTED.
 *
 * Each created row is cleaned up immediately (per iteration for half 1, inline
 * for the control row in half 2) so the property leaves no residue.
 *
 * **Validates: Requirements 4.4**
 */

// --- Safe arbitraries constrained to the allowed input space ---------------

/** Printable-ASCII text (no NUL bytes) that always trims to something non-empty. */
const arbSafeText = fc
  .array(fc.integer({ min: 32, max: 126 }), { minLength: 1, maxLength: 60 })
  .map((codes) => String.fromCharCode(...codes))
  .map((s) => {
    const trimmed = s.trim();
    return trimmed.length > 0 ? trimmed : 'Challenge';
  });

const EPOCH_MS = Date.UTC(2024, 0, 1); // 2024-01-01
const DAY_MS = 86_400_000;

/** ISO `YYYY-MM-DD` for `EPOCH + offsetDays`. */
function isoDate(offsetDays: number): string {
  return new Date(EPOCH_MS + offsetDays * DAY_MS).toISOString().slice(0, 10);
}

/** A valid inclusive date range where `endDate >= startDate`. */
const arbDateRange = fc
  .record({
    startOffset: fc.integer({ min: 0, max: 3650 }),
    span: fc.integer({ min: 0, max: 365 }),
  })
  .map(({ startOffset, span }) => ({
    startDate: isoDate(startOffset),
    endDate: isoDate(startOffset + span),
  }));

/** A valid `HH:MM` or `HH:MM:SS` 24-hour clock time. */
const arbTime = fc
  .record({
    h: fc.integer({ min: 0, max: 23 }),
    m: fc.integer({ min: 0, max: 59 }),
    s: fc.option(fc.integer({ min: 0, max: 59 }), { nil: undefined }),
  })
  .map(({ h, m, s }) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return s === undefined
      ? `${pad(h)}:${pad(m)}`
      : `${pad(h)}:${pad(m)}:${pad(s)}`;
  });

/**
 * An arbitrary VALID host-supplied config. Every field stays inside the ranges
 * {@link createUserChallenge} accepts so creation always SUCCEEDS — the property
 * is about what gets FORCED on success, not about validation rejection.
 */
const arbConfig: fc.Arbitrary<UserChallengeConfig> = fc
  .record({
    title: arbSafeText,
    description: fc.option(arbSafeText, { nil: undefined }),
    dates: arbDateRange,
    dailyStudyMinutes: fc.integer({ min: 1, max: 1440 }),
    verificationDeadlineTime: arbTime,
    timezone: fc.option(
      fc.constantFrom('Asia/Seoul', 'UTC', 'America/New_York', 'Europe/London'),
      { nil: undefined },
    ),
    capacity: fc.integer({ min: 1, max: 1000 }),
    entryPoints: fc.integer({ min: 0, max: 1_000_000 }),
    visibility: fc.option(fc.constantFrom('public' as const, 'private' as const), {
      nil: undefined,
    }),
    serviceFeeRate: fc.option(fc.constantFrom(0, 0.05, 0.1, 0.5, 0.9999, 1), {
      nil: undefined,
    }),
    distributionRule: fc.option(
      fc.constantFrom<Record<string, unknown>>(
        {},
        { even: true },
        { weights: [1, 2, 3] },
      ),
      { nil: undefined },
    ),
    noWinnerPolicy: fc.option(
      fc.constantFrom('refund_all', 'roll_over', 'donate'),
      { nil: undefined },
    ),
  })
  .map((r) => ({
    title: r.title,
    description: r.description,
    startDate: r.dates.startDate,
    endDate: r.dates.endDate,
    dailyStudyMinutes: r.dailyStudyMinutes,
    verificationDeadlineTime: r.verificationDeadlineTime,
    timezone: r.timezone,
    capacity: r.capacity,
    entryPoints: r.entryPoints,
    visibility: r.visibility,
    serviceFeeRate: r.serviceFeeRate,
    distributionRule: r.distributionRule,
    noWinnerPolicy: r.noWinnerPolicy,
  }));

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Property 13: 챌린지 종류-예치 정합성 (challenge kind ↔ deposit consistency)',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;
    let hostId: string;
    const email = `pbt-kind-deposit-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    beforeAll(async () => {
      harness = createTestDb();
      admin = createServiceRoleClient();

      // Create a real auth user for the Host: challenges.host_id -> profiles.id
      // -> auth.users(id) is an FK chain, and the handle_new_user trigger
      // provisions the profile the created challenges will reference.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
        email_confirm: true,
        user_metadata: { display_name: 'PBT Kind/Deposit Host' },
      });
      if (error || !data.user) {
        throw new Error(
          `failed to create test auth user: ${error?.message ?? 'no user returned'}`,
        );
      }
      hostId = data.user.id;
    }, 60_000);

    afterAll(async () => {
      // Deleting the auth user cascades profile -> (any residual challenges via
      // host_id have no cascade, but each iteration already removes its own row).
      if (admin && hostId) {
        await admin.auth.admin.deleteUser(hostId).catch(() => {});
      }
      await harness?.close();
    });

    it(
      'createUserChallenge forces kind=user, deposit_kind=point, host_id=caller for any valid config (Req 4.4)',
      async () => {
        const { db, client } = harness;

        await fc.assert(
          fc.asyncProperty(arbConfig, async (config) => {
            let id: string | undefined;
            try {
              // Act: create with an arbitrary valid config.
              id = await createUserChallenge(db, hostId, config);

              // Assert: the persisted row satisfies the user→point+host half of
              // Property 13, independent of the config's contents.
              const [ch] = await db
                .select()
                .from(challenges)
                .where(eq(challenges.id, id));
              expect(ch).toBeDefined();
              expect(ch.kind).toBe('user'); // forced
              expect(ch.depositKind).toBe('point'); // forced
              expect(ch.hostId).toBe(hostId); // host exists / forced

              // The reward pool it initializes is also point-kind (consistency).
              const [pool] = await db
                .select()
                .from(rewardPools)
                .where(eq(rewardPools.challengeId, id));
              expect(pool).toBeDefined();
              expect(pool.depositKind).toBe('point');
            } finally {
              // Clean up this iteration's challenge (cascades its reward pool).
              if (id) {
                await client`delete from challenges where id = ${id}`;
              }
            }
          }),
          fcParams,
        );
      },
      300_000,
    );

    it('kind_deposit_consistency CHECK rejects every inconsistent combination and accepts official→cash (Req 4.4)', async () => {
      const { client } = harness;

      /** Raw INSERT of a challenge with the given kind/deposit_kind/host. */
      const insertRaw = (
        kind: 'user' | 'official',
        deposit: 'point' | 'cash',
        host: string | null,
      ) => client`
        insert into challenges (
          kind, title, host_id, start_date, end_date,
          daily_study_minutes, verification_deadline_time, capacity,
          deposit_kind, entry_amount
        ) values (
          ${kind}::challenge_kind, ${'consistency probe'}, ${host}::uuid,
          ${'2025-03-01'}::date, ${'2025-03-31'}::date,
          60, ${'23:59'}::time, 10,
          ${deposit}::deposit_kind, 100
        ) returning id
      `;

      // Inconsistent combinations must be rejected by the CHECK constraint.
      // user + cash → invalid (User_Challenge must be point-based).
      await expect(insertRaw('user', 'cash', hostId)).rejects.toThrow(
        /kind_deposit_consistency/,
      );
      // official + point → invalid (Official_Challenge must be cash-based) —
      // this is the official→cash side of Property 13.
      await expect(insertRaw('official', 'point', null)).rejects.toThrow(
        /kind_deposit_consistency/,
      );
      // user + point but NO host → invalid (User_Challenge requires a Host).
      await expect(insertRaw('user', 'point', null)).rejects.toThrow(
        /kind_deposit_consistency/,
      );

      // Control: a consistent official → cash row IS accepted.
      const rows = await insertRaw('official', 'cash', null);
      const officialId = rows[0]?.id as string | undefined;
      expect(officialId).toBeTruthy();
      if (officialId) {
        await client`delete from challenges where id = ${officialId}`;
      }
    });
  },
);
