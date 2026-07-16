import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { and, eq } from 'drizzle-orm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestDb, isDbAvailable, type TestDb } from './helpers/testDb';
import { fc, fcParams } from './helpers/pbt';
import { createServiceRoleClient } from './helpers/supabaseClient';
import {
  challenges,
  participations,
  paymentTransactions,
  pointTransactions,
  rewardPools,
} from '../src/db/schema';
import {
  handlePaymentWebhook,
  signPaymentWebhook,
  type PaymentWebhookEvent,
} from '../src/domain/payments';
import { isDomainErr } from '../src/domain/errors';

/**
 * Feature: survival-study-challenge
 * Property 14: 결제 webhook 멱등성 (payment webhook idempotency)
 *
 * *For any* 동일 `external_ref` 를 가진 결제 webhook의 반복 수신에 대해,
 * `payment_transactions` 에는 최대 1개의 행이 생성되고 참가는 최대 1회만 등록된다.
 * (`payment_transactions.external_ref` UNIQUE + `challenges FOR UPDATE` 잠금 하의
 * 인-트랜잭션 멱등성 검사가 강제 — design.md → "Correctness Properties" / Property 14)
 *
 * This exercises the REAL `handlePaymentWebhook` (src/domain/payments.ts)
 * END-TO-END — signature verification gate included — against the REMOTE
 * Supabase Postgres via the Drizzle write path. Each scenario delivers the SAME
 * approved event (same `external_ref`, user, challenge, amount) N>=2 times,
 * sequentially or CONCURRENTLY (a >1 connection pool lets the transactions truly
 * contend on the `challenges` `FOR UPDATE` lock), then asserts the money- and
 * participation-integrity invariants:
 *   - exactly ONE `payment_transactions` row exists for that `external_ref`,
 *   - exactly ONE `participations` row exists for `(challenge_id, user_id)`,
 *   - every successful delivery returns the SAME participation id,
 *   - `participant_count` was bumped exactly once (no double-count), and
 *   - the cash deposit was folded into the reward pool exactly once (no
 *     double-charge — Req 3.1 registration + Req 3.5 single charge record).
 *
 * It also covers the neighbouring invariant that a DISTINCT `external_ref` for
 * the SAME user+challenge is rejected as `DUPLICATE_PARTICIPATION` (only one
 * join per user per challenge) and writes nothing new.
 *
 * The webhook is fail-closed on a missing signing secret, so `beforeAll` sets
 * `PAYMENT_WEBHOOK_SECRET` to a known test value and every delivery is signed
 * with {@link signPaymentWebhook}; the original env value is restored in
 * `afterAll`.
 *
 * **Validates: Requirements 3.5, 3.1**
 */

/** Known signing secret installed for the duration of this suite. */
const TEST_WEBHOOK_SECRET = 'pbt-payment-webhook-secret-☑-Δ-1234567890';
/** Official_Challenge cash Entry_Fee (currency units) used by the fixture. */
const ENTRY_AMOUNT = 10_000;

/**
 * One idempotency scenario. `externalRef` is the shared idempotency key
 * replayed `deliveryCount` times; `secondRef` (distinct) optionally probes the
 * one-join-per-user invariant. `concurrent` picks parallel vs sequential
 * delivery so both the lock-contended and the serial replay paths are covered.
 */
const arbScenario = fc
  .record({
    externalRef: fc.uuid(),
    secondRef: fc.uuid(),
    deliveryCount: fc.integer({ min: 2, max: 5 }),
    concurrent: fc.boolean(),
    attemptDistinctRef: fc.boolean(),
  })
  // The distinct-ref sub-case is only meaningful when the two refs differ.
  .filter((s) => s.externalRef !== s.secondRef);

/** Build a fully-signed, approved webhook event for the fixture user/challenge. */
function makeApprovedEvent(
  externalRef: string,
  userId: string,
  challengeId: string,
): PaymentWebhookEvent {
  const unsigned = {
    externalRef,
    status: 'approved' as const,
    userId,
    challengeId,
    amount: ENTRY_AMOUNT,
    pointDiscount: 0,
  };
  return { ...unsigned, signature: signPaymentWebhook(unsigned, TEST_WEBHOOK_SECRET) };
}

// Probe once at collection time so the suite is SKIPPED (not failed) when the
// remote Postgres is unreachable, matching the existing harness convention.
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)(
  'Property 14: 결제 webhook 멱등성 (payment webhook idempotency)',
  () => {
    let harness: TestDb;
    let admin: SupabaseClient;
    let userId: string;
    let challengeId: string;
    let secretBackup: string | undefined;
    const email = `pbt-webhook-idem-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

    beforeAll(async () => {
      // A >1 connection pool so concurrent deliveries genuinely contend on the
      // `challenges FOR UPDATE` lock (rather than being serialized by a
      // single-connection pool) — this is what actually tests the race.
      harness = createTestDb({ max: 8 });
      admin = createServiceRoleClient();

      // Install a known signing secret so verifyWebhookSignature passes for our
      // signed events; remember the prior value to restore afterwards.
      secretBackup = process.env.PAYMENT_WEBHOOK_SECRET;
      process.env.PAYMENT_WEBHOOK_SECRET = TEST_WEBHOOK_SECRET;

      // Create a real auth user: profiles.id -> auth.users(id) is a FK and the
      // handle_new_user trigger provisions the profile the participation needs.
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: `Pbt-${Math.random().toString(36).slice(2)}-9!`,
        email_confirm: true,
        user_metadata: { display_name: 'PBT Webhook Idempotency User' },
      });
      if (error || !data.user) {
        throw new Error(
          `failed to create test auth user: ${error?.message ?? 'no user returned'}`,
        );
      }
      userId = data.user.id;

      // Provision an OFFICIAL cash challenge (kind='official', deposit_kind=
      // 'cash') in recruiting status with ample capacity so the single join
      // never hits the cap. Inserted directly (no official-create helper yet).
      const [ch] = await harness.db
        .insert(challenges)
        .values({
          kind: 'official',
          title: 'PBT Official Webhook Idempotency Challenge',
          status: 'recruiting',
          visibility: 'public',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          dailyStudyMinutes: 60,
          verificationDeadlineTime: '23:59',
          capacity: 100,
          depositKind: 'cash',
          entryAmount: ENTRY_AMOUNT.toFixed(2),
        })
        .returning({ id: challenges.id });
      if (!ch) {
        throw new Error('failed to create official challenge fixture');
      }
      challengeId = ch.id;
    }, 60_000);

    afterAll(async () => {
      // FK order: payment_transactions -> participations/challenges have no ON
      // DELETE cascade, so remove payments first, then the challenge (cascades
      // participations + reward_pools), then the auth user (cascades profile).
      if (harness && challengeId) {
        await harness.db
          .delete(paymentTransactions)
          .where(eq(paymentTransactions.challengeId, challengeId))
          .catch(() => {});
        await harness.db
          .delete(challenges)
          .where(eq(challenges.id, challengeId))
          .catch(() => {});
      }
      if (harness && userId) {
        // point_transactions has no cascade to profiles; clear defensively.
        await harness.db
          .delete(pointTransactions)
          .where(eq(pointTransactions.userId, userId))
          .catch(() => {});
      }
      if (admin && userId) {
        await admin.auth.admin.deleteUser(userId).catch(() => {});
      }
      // Restore the signing secret exactly as it was.
      if (secretBackup === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
      else process.env.PAYMENT_WEBHOOK_SECRET = secretBackup;

      await harness?.close();
    });

    /** Reset the challenge to a pristine, empty, recruiting state. */
    async function resetFixture(db: TestDb['db']): Promise<void> {
      await db
        .delete(paymentTransactions)
        .where(eq(paymentTransactions.challengeId, challengeId));
      await db
        .delete(participations)
        .where(eq(participations.challengeId, challengeId));
      await db.delete(rewardPools).where(eq(rewardPools.challengeId, challengeId));
      await db
        .update(challenges)
        .set({ participantCount: 0, status: 'recruiting' })
        .where(eq(challenges.id, challengeId));
    }

    it(
      'replaying the same external_ref yields at most one payment_transactions row and one participation; a distinct ref for the same user is rejected',
      async () => {
        const { db } = harness;

        await fc.assert(
          fc.asyncProperty(arbScenario, async (scenario) => {
            // --- Arrange: pristine, empty, recruiting challenge -------------
            await resetFixture(db);

            const event = makeApprovedEvent(scenario.externalRef, userId, challengeId);

            // --- Act: deliver the SAME approved event N>=2 times ------------
            const deliveries = Array.from({ length: scenario.deliveryCount }, () =>
              () => handlePaymentWebhook(db, event),
            );

            let ids: string[];
            if (scenario.concurrent) {
              // Concurrent replays contend on the challenge FOR UPDATE lock.
              const settled = await Promise.allSettled(deliveries.map((d) => d()));
              // Every replay must SUCCEED (return the existing participation);
              // a rejected duplicate would be a genuine idempotency failure.
              const rejected = settled.filter((r) => r.status === 'rejected');
              expect(rejected).toHaveLength(0);
              ids = settled.map((r) =>
                r.status === 'fulfilled' ? r.value : 'REJECTED',
              );
            } else {
              ids = [];
              for (const deliver of deliveries) {
                ids.push(await deliver());
              }
            }

            // --- Assert: idempotent outcome ---------------------------------
            // Every delivery resolved to the SAME participation id.
            const [firstId] = ids;
            expect(firstId).toBeTruthy();
            expect(ids.every((id) => id === firstId)).toBe(true);

            // Exactly ONE payment_transactions row for this external_ref, and it
            // is the approved cash charge (Req 3.5 single charge record).
            const payments = await db
              .select()
              .from(paymentTransactions)
              .where(eq(paymentTransactions.externalRef, scenario.externalRef));
            expect(payments).toHaveLength(1);
            expect(payments[0].status).toBe('approved');
            expect(payments[0].direction).toBe('charge');
            expect(payments[0].participationId).toBe(firstId);
            expect(Number(payments[0].amount)).toBe(ENTRY_AMOUNT);

            // Exactly ONE participation for (challenge, user), registered alive
            // with the cash deposit (Req 3.1 register + survival status).
            const parts = await db
              .select()
              .from(participations)
              .where(
                and(
                  eq(participations.challengeId, challengeId),
                  eq(participations.userId, userId),
                ),
              );
            expect(parts).toHaveLength(1);
            expect(parts[0].id).toBe(firstId);
            expect(parts[0].survivalStatus).toBe('alive');
            expect(parts[0].depositKind).toBe('cash');

            // Recruitment count bumped exactly once (no double-count).
            const [ch] = await db
              .select()
              .from(challenges)
              .where(eq(challenges.id, challengeId));
            expect(ch.participantCount).toBe(1);

            // Cash deposit folded into the reward pool exactly once (no
            // double-charge): total_deposit == a single Entry_Fee.
            const [pool] = await db
              .select()
              .from(rewardPools)
              .where(eq(rewardPools.challengeId, challengeId));
            expect(pool).toBeDefined();
            expect(Number(pool.totalDeposit)).toBe(ENTRY_AMOUNT);

            // --- Assert: a DISTINCT external_ref cannot double-join ---------
            if (scenario.attemptDistinctRef) {
              const secondEvent = makeApprovedEvent(
                scenario.secondRef,
                userId,
                challengeId,
              );

              let caught: unknown;
              try {
                await handlePaymentWebhook(db, secondEvent);
              } catch (error) {
                caught = error;
              }
              // Only one join per user per challenge (Req 3.3 backstop of 3.1).
              expect(isDomainErr(caught) && caught.code).toBe(
                'DUPLICATE_PARTICIPATION',
              );

              // The rejected join wrote NOTHING: no payment row for secondRef,
              // still exactly one participation, count still 1.
              const secondPayments = await db
                .select()
                .from(paymentTransactions)
                .where(eq(paymentTransactions.externalRef, scenario.secondRef));
              expect(secondPayments).toHaveLength(0);

              const partsAfter = await db
                .select({ id: participations.id })
                .from(participations)
                .where(
                  and(
                    eq(participations.challengeId, challengeId),
                    eq(participations.userId, userId),
                  ),
                );
              expect(partsAfter).toHaveLength(1);

              const [chAfter] = await db
                .select()
                .from(challenges)
                .where(eq(challenges.id, challengeId));
              expect(chAfter.participantCount).toBe(1);
            }
          }),
          fcParams,
        );
      },
      600_000,
    );
  },
);
