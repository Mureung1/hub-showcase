import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createBrowserRetrieveService } from './browser_retrieve_service';

describe('브라우저 꺼내보기 서비스', () => {
  it('로그인 세션이 없으면 서버에 요청하지 않는다', async () => {
    const fetcher = vi.fn();
    const service = createBrowserRetrieveService(createClient(null), fetcher);

    await expect(service.retrieve('오류 안내')).resolves.toEqual({
      ok: false,
      reason: 'permission-denied',
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('세션 토큰과 입력을 보내고 검증한 검색 결과를 반환한다', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        insightIds: ['insight-2', 'insight-1'],
        ok: true,
        pendingCount: 1,
      })
    );
    const service = createBrowserRetrieveService(
      createClient('access-token'),
      fetcher
    );

    await expect(service.retrieve('오류 안내')).resolves.toEqual({
      insightIds: ['insight-2', 'insight-1'],
      ok: true,
      pendingCount: 1,
    });
    expect(fetcher).toHaveBeenCalledWith('/api/insights/retrieve', {
      body: JSON.stringify({ query: '오류 안내' }),
      headers: {
        Authorization: 'Bearer access-token',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
  });

  it.each([
    vi
      .fn()
      .mockResolvedValue(Response.json({ insightIds: 'invalid', ok: true })),
    vi.fn().mockRejectedValue(new Error('network detail')),
  ])('비정상 응답을 재시도 가능한 실패로 바꾼다', async (fetcher) => {
    const service = createBrowserRetrieveService(
      createClient('access-token'),
      fetcher
    );

    await expect(service.retrieve('오류 안내')).resolves.toEqual({
      ok: false,
      reason: 'retrieve-failed',
    });
  });
});

function createClient(accessToken: string | null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: accessToken ? { access_token: accessToken } : null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}
