import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db, queryClient } from '../src/db/index';
import {
  challenges,
  participations,
  pointTransactions,
  pointWallets,
  rewardPools,
} from '../src/db/schema';
import {
  createUserChallenge,
  joinUserChallenge,
  type UserChallengeConfig,
} from '../src/domain/challenges';
import { getWalletBalance } from '../src/domain/points';
import { isDbAvailable } from './helpers/testDb';

/**
 * Task 4.2 — minimal smoke check for joinUserChallenge (Requirement 5).
 *
 * Intentionally small: the dedicated challenge property/unit tasks (4.5
 * duplicate-participation, 4.6 capacity-cap, 4.8 unit) cover the exhaustive
 * cases. Here we assert only the two things this task must get right:
 *   - the happy path atomically deducts the entry points, inserts an `alive`
 *     participation, bumps `participant_count`, updates the reward pool, and
 *     writes exactly one `challenge_join` ledger row (Req 5.1), and
 *   - a second join by the same user is rejected with DUPLICATE_PARTICIPATION
 *     and leaves the wallet balance and recruitment count unchanged (Req 5.4).
 *
 * Runs against the REMOTE Supabase Postgres via the production write-path
 * client and skips (never hard-fails) when the DB is unreachable, mirroring the
 * other integration suites.
 */

const ENTRY_POINTS = 100;
const SEED_BALANCE = 500;

function validConfig(
  overrides: Partial<UserChallengeConfig> = {},
): UserChallengeConfig {
  return {
    title: 'Join Smoke Challenge',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    dailyStudyMinutes: 60,
    verificationDeadlineTime: '23:59',
    capacity: 10,
    entryPoints: ENTRY_POINTS,
    ...overrides,
  };
}

const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)('joinUserChallenge (remote Postgres)', () => {
  let hostId: string;
  let userId: string;
  let challengeId: string;

  beforeAll(async () => {
    // Provision a Host and a participant. The `handle_new_user` trigger creates
    // each profile + zero-balance wallet atomically (Req 1.1).
    hostId = randomUUID();
    userId = randomUUID();
    await queryClient`
      insert into auth.users (id, email, raw_user_meta_data)
      values (${hostId}, ${`task42-host-${hostId}@example.test`}, '{}'::jsonb)
    `;
    await queryClient`
      insert into auth.users (id, email, raw_user_meta_data)
      values (${userId}, ${`task42-user-${userId}@example.test`}, '{}'::jsonb)
    `;
    // Fund the participant so the deposit can succeed (test fixture seed).
    await queryClient`
      update point_wallets set balance = ${SEED_BALANCE} where user_id = ${userId}
    `;

    challengeId = await createUserChallenge(db, hostId, validConfig());
  });

  afterAll(async () => {
    // Deleting the challenge cascades participations + reward_pools.
    if (challengeId) {
      await queryClient`delete from challenges where id = ${challengeId}`;
    }
    // point_transactions has no ON DELETE cascade to profiles/wallets, so clear
    // it before removing the users (whose deletion cascades to their wallets).
    for (const id of [userId, hostId]) {
      if (id) {
        await queryClient`delete from point_transactions where user_id = ${id}`;
        await queryClient`delete from auth.users where id = ${id}`;
      }
    }
    await queryClient.end({ timeout: 5 });
  });

  it('deposits points, registers the participant, and updates counts + pool (Req 5.1)', async () => {
    const participationId = await joinUserChallenge(db, userId, challengeId);
    expect(participationId).toBeTruthy();

    // Wallet debited by exactly the entry points.
    expect(await getWalletBalance(db, userId)).toBe(SEED_BALANCE - ENTRY_POINTS);

    // Participation registered as alive with the point deposit.
    const [part] = await db
      .select()
      .from(participations)
      .where(eq(participations.id, participationId));
    expect(part).toBeDefined();
    expect(part.userId).toBe(userId);
    expect(part.challengeId).toBe(challengeId);
    expect(part.survivalStatus).toBe('alive');
    expect(part.depositKind).toBe('point');
    expect(Number(part.depositAmount)).toBe(ENTRY_POINTS);

    // Recruitment count incremented.
    const [ch] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId));
    expect(ch.participantCount).toBe(1);

    // Reward pool total_deposit reflects the deposit.
    const [pool] = await db
      .select()
      .from(rewardPools)
      .where(eq(rewardPools.challengeId, challengeId));
    expect(Number(pool.totalDeposit)).toBe(ENTRY_POINTS);

    // Exactly one challenge_join ledger row for this user.
    const ledger = await db
      .select()
      .from(pointTransactions)
      .where(
        and(
          eq(pointTransactions.userId, userId),
          eq(pointTransactions.txnType, 'challenge_join'),
        ),
      );
    expect(ledger).toHaveLength(1);
    expect(ledger[0].amount).toBe(-ENTRY_POINTS);
    expect(ledger[0].balanceAfter).toBe(SEED_BALANCE - ENTRY_POINTS);
  });

  it('rejects a duplicate join and leaves state unchanged (Req 5.4)', async () => {
    await expect(
      joinUserChallenge(db, userId, challengeId),
    ).rejects.toMatchObject({ code: 'DUPLICATE_PARTICIPATION' });

    // Balance untouched by the rejected join (rollback — Req 14.3).
    expect(await getWalletBalance(db, userId)).toBe(SEED_BALANCE - ENTRY_POINTS);

    // Still exactly one participation and one recruitment slot used.
    const parts = await db
      .select({ id: participations.id })
      .from(participations)
      .where(
        and(
          eq(participations.challengeId, challengeId),
          eq(participations.userId, userId),
        ),
      );
    expect(parts).toHaveLength(1);

    const [ch] = await db
      .select()
      .from(challenges)
      .where(eq(challenges.id, challengeId));
    expect(ch.participantCount).toBe(1);

    // Wallet row still intact (sanity: no orphaned debit).
    const [wallet] = await db
      .select()
      .from(pointWallets)
      .where(eq(pointWallets.userId, userId));
    expect(wallet.balance).toBe(SEED_BALANCE - ENTRY_POINTS);
  });
});
