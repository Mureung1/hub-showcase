import { describe, expect, it } from 'vitest';
import { MockAdapter } from '../src/web/adapters/core/mock-adapter';
import { featuredOfficial } from '../src/web/adapters/core/fixtures/challenges';

describe('official challenge point registration', () => {
  it('publishes a whole-point entry amount without cash price fields', () => {
    expect(featuredOfficial.entryPoints).toBe(39000);
    expect(Number.isSafeInteger(featuredOfficial.entryPoints)).toBe(true);
    expect(featuredOfficial).not.toHaveProperty('price');
  });

  it('registers directly and returns the remaining point balance', async () => {
    const adapter = new MockAdapter('recruiting');
    const result = await adapter.joinOfficialChallenge(
      {
        sessionUserId: 'user-1',
        requestId: 'request-1',
        now: new Date('2026-07-16T03:00:00.000Z'),
      },
      { challengeId: featuredOfficial.challengeId },
    );

    expect(result).toEqual({
      ok: true,
      value: {
        participationId: `participation-${featuredOfficial.challengeId}`,
        balanceAfter: 750,
      },
    });
  });
});
