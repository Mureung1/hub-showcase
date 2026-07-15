import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createBrowserInsightRepository } from './create_browser_insight_repository';

describe('createBrowserInsightRepository', () => {
  it('로그인 사용자 ID와 브라우저 Supabase 클라이언트를 원격 저장소에 조합한다', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null });
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));
    const from = vi.fn(() => ({ select }));
    const client = { from } as unknown as SupabaseClient;
    const repository = createBrowserInsightRepository('user-30', client);

    await expect(repository.list()).resolves.toEqual({
      insights: [],
      warnings: [],
    });
    expect(from).toHaveBeenCalledWith('insights');
    expect(eq).toHaveBeenCalledWith('user_id', 'user-30');
  });
});
