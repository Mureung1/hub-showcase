import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, queryClient } from '../src/db/index';
import { challenges, rewardPools } from '../src/db/schema';
import {
  createUserChallenge,
  assertValidUserChallengeConfig,
  type UserChallengeConfig,
} from '../src/domain/challenges';
import { isDomainErr } from '../src/domain/errors';
import { isDbAvailable } from './helpers/testDb';

/**
 * Task 4.1 — minimal smoke check for createUserChallenge (Requirement 4).
 *
 * Intentionally small: the dedicated challenge property/unit tasks (4.4–4.8)
 * cover the exhaustive cases. Here we only assert the two things this task must
 * get right:
 *   - the pure config validator accepts a good config and rejects a bad one
 *     with INVALID_CONFIG naming the offending items (Req 4.2 / 4.3), and
 *   - createUserChallenge forces kind='user' / deposit_kind='point' / host_id,
 *     reflects the visibility scope, and initializes the reward pool (Req 4.1,
 *     4.4, 4.5) — plus the Host-permission and INVALID_CONFIG rejection paths.
 *
 * The pure block runs everywhere; the DB block runs against the REMOTE Supabase
 * Postgres via the production write-path client and skips (never hard-fails)
 * when the DB is unreachable, mirroring the other integration suites.
 */

/** A valid baseline config; individual tests override single fields. */
function validConfig(
  overrides: Partial<UserChallengeConfig> = {},
): UserChallengeConfig {
  return {
    title: 'Morning Study Sprint',
    startDate: '2025-01-01',
    endDate: '2025-01-31',
    dailyStudyMinutes: 60,
    verificationDeadlineTime: '23:59',
    capacity: 10,
    entryPoints: 100,
    ...overrides,
  };
}

// --- Pure validation (no DB) — always runs ---------------------------------
describe('assertValidUserChallengeConfig (pure)', () => {
  it('normalizes a valid config and applies defaults', () => {
    const cfg = assertValidUserChallengeConfig(validConfig());
    expect(cfg.title).toBe('Morning Study Sprint');
    expect(Number(cfg.entryAmount)).toBe(100);
    expect(cfg.visibility).toBe('public'); // Req 4.5 default
    expect(cfg.timezone).toBe('Asia/Seoul');
    expect(Number(cfg.serviceFeeRate)).toBe(0.1);
  });

  it('rejects missing required items and names them (Req 4.2)', () => {
    // Omit startDate + capacity (cast around the compile-time required types).
    const incomplete = {
      title: 'x',
      endDate: '2025-01-31',
      dailyStudyMinutes: 60,
      verificationDeadlineTime: '23:59',
      entryPoints: 100,
    } as unknown as UserChallengeConfig;

    try {
      assertValidUserChallengeConfig(incomplete);
      expect.unreachable('expected INVALID_CONFIG to be thrown');
    } catch (error) {
      expect(isDomainErr(error) && error.code).toBe('INVALID_CONFIG');
      if (isDomainErr(error)) {
        expect(error.message).toContain('startDate');
        expect(error.message).toContain('capacity');
      }
    }
  });

  it('rejects out-of-range values (Req 4.3)', () => {
    try {
      assertValidUserChallengeConfig(validConfig({ dailyStudyMinutes: 0, capacity: 0 }));
      expect.unreachable('expected INVALID_CONFIG to be thrown');
    } catch (error) {
      expect(isDomainErr(error) && error.code).toBe('INVALID_CONFIG');
      if (isDomainErr(error)) {
        expect(error.message).toContain('dailyStudyMinutes');
        expect(error.message).toContain('capacity');
      }
    }
  });
});

// --- DB-backed happy path + rejection paths --------------------------------
const dbReachable = await isDbAvailable();

describe.skipIf(!dbReachable)('createUserChallenge (remote Postgres)', () => {
  let hostId: string;
  const createdChallengeIds: string[] = [];

  beforeAll(async () => {
    // Provision a throwaway Host. The `handle_new_user` trigger creates the
    // profile + zero-balance wallet atomically (Req 1.1).
    hostId = randomUUID();
    const email = `task41-host-${hostId}@example.test`;
    await queryClient`
      insert into auth.users (id, email, raw_user_meta_data)
      values (${hostId}, ${email}, '{}'::jsonb)
    `;
  });

  afterAll(async () => {
    // reward_pools cascade on challenge delete; remove challenges then the host
    // (cascades → profile → wallet).
    for (const id of createdChallengeIds) {
      await queryClient`delete from challenges where id = ${id}`;
    }
    if (hostId) {
      await queryClient`delete from auth.users where id = ${hostId}`;
    }
    await queryClient.end({ timeout: 5 });
  });

  it('creates a point-based User_Challenge with host, visibility, and reward pool', async () => {
    const id = await createUserChallenge(
      db,
      hostId,
      validConfig({ visibility: 'private' }),
    );
    createdChallengeIds.push(id);

    const [ch] = await db.select().from(challenges).where(eq(challenges.id, id));
    expect(ch).toBeDefined();
    expect(ch.kind).toBe('user'); // Req 4.4 forced
    expect(ch.depositKind).toBe('point'); // Req 4.4 forced
    expect(ch.hostId).toBe(hostId); // Req 4.4 forced
    expect(ch.visibility).toBe('private'); // Req 4.5 reflected
    expect(ch.status).toBe('recruiting');
    expect(ch.participantCount).toBe(0);
    expect(Number(ch.entryAmount)).toBe(100);

    const [pool] = await db
      .select()
      .from(rewardPools)
      .where(eq(rewardPools.challengeId, id));
    expect(pool).toBeDefined(); // Req 4.1 reward pool initialized
    expect(pool.depositKind).toBe('point');
    expect(Number(pool.totalDeposit)).toBe(0);
    expect(Number(pool.poolAmount)).toBe(0);
  });

  it('rejects a config missing required items with INVALID_CONFIG (Req 4.2)', async () => {
    await expect(
      createUserChallenge(db, hostId, validConfig({ title: '   ' })),
    ).rejects.toMatchObject({ code: 'INVALID_CONFIG' });
  });

  it('rejects an unknown host with UNAUTHENTICATED (Host permission)', async () => {
    await expect(
      createUserChallenge(db, randomUUID(), validConfig()),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});
