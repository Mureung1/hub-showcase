import { describe, expect, it, vi } from 'vitest';

import {
  createInsightMemoService,
  type InsightMemoStore,
} from './insight_memo_service';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('createInsightMemoService', () => {
  it('trims and saves a memo for the authenticated insight owner', async () => {
    const store = createStore({ status: 'updated' });
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(USER_ID) },
      () => store
    );

    await expect(
      service.update('access-token', INSIGHT_ID, { memo: '  회의 참고  ' })
    ).resolves.toEqual({ ok: true });
    expect(store.updateMemo).toHaveBeenCalledWith(
      USER_ID,
      INSIGHT_ID,
      '회의 참고'
    );
  });

  it('normalizes an empty memo to null', async () => {
    const store = createStore({ status: 'updated' });
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(USER_ID) },
      () => store
    );

    await service.update('access-token', INSIGHT_ID, { memo: '   ' });

    expect(store.updateMemo).toHaveBeenCalledWith(USER_ID, INSIGHT_ID, null);
  });

  it.each([
    ['invalid insight id', 'not-an-id', { memo: '메모' }],
    ['missing memo', INSIGHT_ID, {}],
    ['non-string memo', INSIGHT_ID, { memo: 1 }],
    ['memo over 200 characters', INSIGHT_ID, { memo: '가'.repeat(201) }],
  ])('rejects %s', async (_label, insightId, request) => {
    const store = createStore({ status: 'updated' });
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(USER_ID) },
      () => store
    );

    await expect(
      service.update('access-token', insightId, request)
    ).resolves.toEqual({ ok: false, reason: 'invalid-request' });
    expect(store.updateMemo).not.toHaveBeenCalled();
  });

  it('counts Unicode characters instead of UTF-16 code units', async () => {
    const store = createStore({ status: 'updated' });
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(USER_ID) },
      () => store
    );

    await expect(
      service.update('access-token', INSIGHT_ID, { memo: '👍'.repeat(200) })
    ).resolves.toEqual({ ok: true });
  });

  it('rejects an unauthenticated token before creating a store', async () => {
    const createStore = vi.fn();
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(null) },
      createStore
    );

    await expect(
      service.update('expired-token', INSIGHT_ID, { memo: '메모' })
    ).resolves.toEqual({ ok: false, reason: 'permission-denied' });
    expect(createStore).not.toHaveBeenCalled();
  });

  it.each([
    ['not-found', 'not-found'],
    ['permission-denied', 'permission-denied'],
    ['write-failed', 'write-failed'],
  ] as const)('returns a %s store failure', async (status, reason) => {
    const service = createInsightMemoService(
      { authenticate: vi.fn().mockResolvedValue(USER_ID) },
      () => createStore({ status })
    );

    await expect(
      service.update('access-token', INSIGHT_ID, { memo: '메모' })
    ).resolves.toEqual({ ok: false, reason });
  });
});

function createStore(
  result: Awaited<ReturnType<InsightMemoStore['updateMemo']>>
) {
  return {
    updateMemo: vi.fn().mockResolvedValue(result),
  } satisfies InsightMemoStore;
}
