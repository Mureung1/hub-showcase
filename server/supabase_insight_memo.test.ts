import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createSupabaseInsightMemoStore } from './supabase_insight_memo';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';
const USER_ID = '00000000-0000-4000-8000-000000000001';

describe('createSupabaseInsightMemoStore', () => {
  it('updates only the authenticated user insight', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { id: INSIGHT_ID },
      error: null,
    });
    const query = createQuery(maybeSingle);
    const update = vi.fn(() => query);
    const from = vi.fn(() => ({ update }));
    const store = createSupabaseInsightMemoStore({
      from,
    } as unknown as SupabaseClient);

    await expect(
      store.updateMemo(USER_ID, INSIGHT_ID, '회의 참고')
    ).resolves.toEqual({ status: 'updated' });
    expect(from).toHaveBeenCalledWith('insights');
    expect(update).toHaveBeenCalledWith({ memo: '회의 참고' });
    expect(query.eq).toHaveBeenNthCalledWith(1, 'id', INSIGHT_ID);
    expect(query.eq).toHaveBeenNthCalledWith(2, 'user_id', USER_ID);
  });

  it('returns not-found when no owned insight is updated', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const store = createStore(maybeSingle);

    await expect(
      store.updateMemo(USER_ID, INSIGHT_ID, '메모')
    ).resolves.toEqual({ status: 'not-found' });
  });

  it.each([
    ['42501', 'permission-denied'],
    ['50000', 'write-failed'],
  ] as const)('maps Supabase error %s to %s', async (code, status) => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { code },
    });
    const store = createStore(maybeSingle);

    await expect(
      store.updateMemo(USER_ID, INSIGHT_ID, '메모')
    ).resolves.toEqual({ status });
  });

  it('returns write-failed when the client throws', async () => {
    const maybeSingle = vi.fn().mockRejectedValue(new Error('database detail'));
    const store = createStore(maybeSingle);

    await expect(
      store.updateMemo(USER_ID, INSIGHT_ID, '메모')
    ).resolves.toEqual({ status: 'write-failed' });
  });
});

function createStore(maybeSingle: ReturnType<typeof vi.fn>) {
  return createSupabaseInsightMemoStore({
    from: vi.fn(() => ({ update: vi.fn(() => createQuery(maybeSingle)) })),
  } as unknown as SupabaseClient);
}

function createQuery(maybeSingle: ReturnType<typeof vi.fn>) {
  const query = {
    eq: vi.fn(),
    maybeSingle,
    select: vi.fn(),
  };

  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return query;
}
