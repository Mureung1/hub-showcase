import { describe, it, expect } from 'vitest';
import { createDailyQuota } from './dailyQuota';

describe('createDailyQuota', () => {
  it('상한 이내에서는 허용하고 남은 횟수를 알려줘야 한다', () => {
    const quota = createDailyQuota({ max: 3, now: () => new Date('2026-07-28T00:00:00Z') });

    expect(quota.consume()).toEqual({ allowed: true, remaining: 2 });
    expect(quota.consume()).toEqual({ allowed: true, remaining: 1 });
    expect(quota.consume()).toEqual({ allowed: true, remaining: 0 });
  });

  it('상한을 넘으면 거부해야 한다', () => {
    const quota = createDailyQuota({ max: 1, now: () => new Date('2026-07-28T00:00:00Z') });

    expect(quota.consume().allowed).toBe(true);
    expect(quota.consume()).toEqual({ allowed: false, remaining: 0 });
  });

  it('거부된 호출은 사용량으로 세지 않아야 한다(거부가 누적을 더 밀어올리지 않음)', () => {
    const quota = createDailyQuota({ max: 1, now: () => new Date('2026-07-28T00:00:00Z') });

    quota.consume();
    quota.consume();
    quota.consume();

    expect(quota.usage()).toEqual({ used: 1, max: 1 });
  });

  it('날짜(UTC)가 바뀌면 사용량이 초기화되어야 한다', () => {
    let current = new Date('2026-07-28T23:59:59Z');
    const quota = createDailyQuota({ max: 1, now: () => current });

    expect(quota.consume().allowed).toBe(true);
    expect(quota.consume().allowed).toBe(false);

    current = new Date('2026-07-29T00:00:00Z');
    expect(quota.consume()).toEqual({ allowed: true, remaining: 0 });
  });

  it('같은 날 안에서는 시각이 달라져도 초기화되지 않아야 한다', () => {
    let current = new Date('2026-07-28T00:00:00Z');
    const quota = createDailyQuota({ max: 2, now: () => current });

    quota.consume();
    current = new Date('2026-07-28T18:30:00Z');

    expect(quota.consume()).toEqual({ allowed: true, remaining: 0 });
  });
});
