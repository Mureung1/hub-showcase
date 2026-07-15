import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { createServiceRoleClient } from './helpers/supabaseClient';
import { pointWallets, profiles } from '../src/db/schema';

/**
 * Feature: survival-study-challenge
 * Task 2.9 — 스키마 선언적 제약 통합 테스트 (schema declarative-constraint
 * integration test).
 *
 * This is the DB-level "last line of defence" test. Every domain transaction
 * function is backstopped by declarative CHECK / UNIQUE constraints and the
 * `handle_new_user` provisioning trigger; here we exercise those constraints
 * DIRECTLY with raw INSERT/UPDATE probes against the REMOTE Supabase Postgres
 * (project `ybcdofrrrynivplijbww`) and assert the database itself REJECTS every
 * invalid operation (matching on the constraint name where possible), plus that
 * a brand-new account is auto-provisioned a zero-balance wallet.
 *
 * Constraints covered:
 *   - Property 11 (중복 참가 불변): `uq_participation` rejects a re-insert of the
 *     same (challenge_id, user_id).                                (Req 3.3, 5.4)
 *   - Property 13 (챌린지 종류-예치 정합성): `kind_deposit_consistency` rejects
 *     invalid kind/deposit_kind combinations, accepts official→cash.   (Req 4.4)
 *   - `wallet_non_negative`: a negative wallet balance is rejected.     (Req 14.2)
 *   - `balance_after_non_negative`: a negative ledger balance_after is
 *     rejected.                                                        (Req 14.2)
 *   - `valid_capacity`: participant_count exceeding capacity is rejected.
 *   - `uq_daily`: a duplicate (participation_id, verify_date) is rejected.
 *   - `payment_transactions_external_ref_unique`: a duplicate external_ref is
 *     rejected (webhook idempotency backstop).
 *   - `handle_new_user`: a NEW auth user gets a zero-balance point_wallet. (Req 1.1)
 *
 * Uses the established harness (`createTestDb` → `{ db, client }`, `isDbAvailable`)
 * and `createServiceRoleClient` for `admin.auth.admin.createUser` (which fires
 * the real `on_auth_user_created` trigger). Real auth users satisfy the
 * profiles.id → auth.users FK chain the fixtures depend on. All fixtures are
 * cleaned up in FK-safe order; the suite is SKIPPED (not failed) when the remote
 * Postgres is unreachable.
 *
 * **Validates: Requirements 3.3, 4.4, 5.4, 1.1, 14.2**
 */

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Task 2.9: 스키마 선언적 제약 통합 테스트 (schema declarative constraints)',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;

    // Every auth user we create is tracked here so afterAll can remove them
    // (deleting an auth user cascades profile → wallet).
    const createdUserIds: string[] = [];

    let hostUserId: string; // fixture host + payment/ledger/wallet owner
    let secondUserId: string; // used by the duplicate-participation probe
    let challengeId: string; // fixture user challenge (capacity 5)
    let participationId: string; // fixture participation (for the uq_daily probe)

    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    /** Create a real auth user (fires handle_new_user) and track it for cleanup. */
    async function createAuthUser(label: string): Promise<string> {
      const email = `pbt-constraints-${label}-${suffix}@example.com`;
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
        email_confirm: true,
        user_metadata: { display_name: `Constraint ${label}` },
      });
      if (error || !data.user) {
        throw new Error(
          `failed to create test auth user (${label}): ${error?.message ?? 'no user returned'}`,
        );
      }
      createdUserIds.push(data.user.id);
      return data.user.id;
    }

    beforeAll(async () => {
      harness = createTestDb();
      admin = createServiceRoleClient();

      hostUserId = await createAuthUser('host');
      secondUserId = await createAuthUser('second');

      const { client } = harness;

      // Fixture: a valid point-based User_Challenge (capacity 5) hosted by the
      // host user. Raw insert keeps this test self-contained at the DB level.
      const chRows = await client`
        insert into challenges (
          kind, title, host_id, start_date, end_date,
          daily_study_minutes, verification_deadline_time, capacity,
          deposit_kind, entry_amount
        ) values (
          'user'::challenge_kind, ${'constraint fixture'}, ${hostUserId}::uuid,
          '2025-05-01'::date, '2025-05-31'::date,
          60, ${'23:59'}::time, 5,
          'point'::deposit_kind, 100
        ) returning id
      `;
      challengeId = chRows[0]?.id as string;

      // Fixture: the host's participation — the uq_daily probe writes daily
      // verifications against it.
      const partRows = await client`
        insert into participations (challenge_id, user_id, deposit_kind, deposit_amount)
        values (${challengeId}::uuid, ${hostUserId}::uuid, 'point'::deposit_kind, 100)
        returning id
      `;
      participationId = partRows[0]?.id as string;
    }, 120_000);

    afterAll(async () => {
      const client = harness?.client;
      if (client) {
        // payment_transactions / point_transactions reference profiles with NO
        // ACTION, so clear them before the auth-user deletes cascade profiles.
        await client`delete from payment_transactions where user_id = ${hostUserId}`.catch(
          () => {},
        );
        await client`delete from point_transactions where user_id = ${hostUserId}`.catch(
          () => {},
        );
        // Deleting the challenge cascades participations → daily_verifications.
        if (challengeId) {
          await client`delete from challenges where id = ${challengeId}`.catch(
            () => {},
          );
        }
      }
      // Remove every auth user we created (cascades profile → wallet).
      for (const id of createdUserIds) {
        await admin?.auth.admin.deleteUser(id).catch(() => {});
      }
      await harness?.close();
    });

    it('Property 11: uq_participation rejects a duplicate (challenge, user) participation (Req 3.3, 5.4)', async () => {
      const { client } = harness;

      // First participation for the second user succeeds.
      const rows = await client`
        insert into participations (challenge_id, user_id, deposit_kind, deposit_amount)
        values (${challengeId}::uuid, ${secondUserId}::uuid, 'point'::deposit_kind, 100)
        returning id
      `;
      expect(rows[0]?.id).toBeTruthy();

      // Re-inserting the same (challenge, user) pair is rejected by the UNIQUE
      // constraint — the DB backstop for duplicate-participation prevention.
      await expect(
        client`
          insert into participations (challenge_id, user_id, deposit_kind, deposit_amount)
          values (${challengeId}::uuid, ${secondUserId}::uuid, 'point'::deposit_kind, 100)
        `,
      ).rejects.toThrow(/uq_participation/);
    });

    it('Property 13: kind_deposit_consistency rejects invalid kind/deposit combinations and accepts official→cash (Req 4.4)', async () => {
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

      // user + cash → invalid (User_Challenge must be point-based).
      await expect(insertRaw('user', 'cash', hostUserId)).rejects.toThrow(
        /kind_deposit_consistency/,
      );
      // official + point → invalid (Official_Challenge must be cash-based).
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

    it('wallet_non_negative rejects a negative wallet balance (Req 14.2)', async () => {
      const { client } = harness;

      await expect(
        client`update point_wallets set balance = -1 where user_id = ${hostUserId}::uuid`,
      ).rejects.toThrow(/wallet_non_negative/);
    });

    it('balance_after_non_negative rejects a negative ledger balance_after (Req 14.2)', async () => {
      const { client } = harness;

      const wallets = await client`
        select id from point_wallets where user_id = ${hostUserId}::uuid
      `;
      const walletId = wallets[0]?.id as string | undefined;
      expect(walletId).toBeTruthy();
      // Hard-narrow to a definite string: the assertion above documents intent,
      // but tsc needs a runtime guard so `walletId` is `string` (not
      // `string | undefined`) when interpolated into the raw postgres query.
      if (!walletId) throw new Error('wallet not provisioned');

      await expect(
        client`
          insert into point_transactions (wallet_id, user_id, txn_type, amount, balance_after, reason)
          values (
            ${walletId}::uuid, ${hostUserId}::uuid, 'challenge_join'::point_txn_type,
            -1, -1, ${'constraint probe'}
          )
        `,
      ).rejects.toThrow(/balance_after_non_negative/);
    });

    it('valid_capacity rejects participant_count exceeding capacity (Req 4.4)', async () => {
      const { client } = harness;

      // Fixture challenge capacity is 5; pushing participant_count to 6 must be
      // rejected by the CHECK (participant_count <= capacity).
      await expect(
        client`update challenges set participant_count = 6 where id = ${challengeId}::uuid`,
      ).rejects.toThrow(/valid_capacity/);
    });

    it('uq_daily rejects a duplicate (participation, verify_date) verification (Req 14.2)', async () => {
      const { client } = harness;
      const verifyDate = '2025-05-10';

      const rows = await client`
        insert into daily_verifications (participation_id, verify_date)
        values (${participationId}::uuid, ${verifyDate}::date)
        returning id
      `;
      expect(rows[0]?.id).toBeTruthy();

      await expect(
        client`
          insert into daily_verifications (participation_id, verify_date)
          values (${participationId}::uuid, ${verifyDate}::date)
        `,
      ).rejects.toThrow(/uq_daily/);
    });

    it('payment_transactions external_ref UNIQUE rejects a duplicate external reference (Req 3.5)', async () => {
      const { client } = harness;
      const externalRef = `probe-ref-${suffix}`;

      const rows = await client`
        insert into payment_transactions (user_id, direction, amount, external_ref)
        values (${hostUserId}::uuid, ${'charge'}, 100, ${externalRef})
        returning id
      `;
      expect(rows[0]?.id).toBeTruthy();

      await expect(
        client`
          insert into payment_transactions (user_id, direction, amount, external_ref)
          values (${hostUserId}::uuid, ${'charge'}, 100, ${externalRef})
        `,
      ).rejects.toThrow(/external_ref/);
    });

    it('handle_new_user auto-provisions a zero-balance wallet for a NEW account (Req 1.1)', async () => {
      const { db } = harness;

      const newUserId = await createAuthUser('provision');

      // The trigger provisioned the profile...
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.id, newUserId));
      expect(profile).toBeDefined();

      // ...and a matching zero-balance wallet, atomically (Req 1.1).
      const [wallet] = await db
        .select()
        .from(pointWallets)
        .where(eq(pointWallets.userId, newUserId));
      expect(wallet).toBeDefined();
      expect(wallet.balance).toBe(0);
    });
  },
);
