import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import { createBrowserInsightMemoService } from './browser_insight_memo_service';

const INSIGHT_ID = '10000000-0000-4000-8000-000000000001';

describe('createBrowserInsightMemoService', () => {
  it('현재 세션의 Bearer 토큰으로 한 줄 메모를 갱신한다', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const service = createBrowserInsightMemoService(
      createClient('access-token'),
      fetcher,
      'https://api.example.com'
    );

    await expect(service.updateMemo(INSIGHT_ID, '다시 읽기')).resolves.toEqual({
      ok: true,
    });
    expect(fetcher).toHaveBeenCalledWith(
      `https://api.example.com/api/insights/${INSIGHT_ID}/memo`,
      {
        body: JSON.stringify({ memo: '다시 읽기' }),
        headers: {
          Authorization: 'Bearer access-token',
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      }
    );
  });

  it.each([
    ['로그인 세션 없음', createClient(null), vi.fn(), 'permission-denied'],
    [
      '권한 없음 응답',
      createClient('access-token'),
      vi.fn().mockResolvedValue(Response.json({}, { status: 401 })),
      'permission-denied',
    ],
    [
      '없는 인사이트 응답',
      createClient('access-token'),
      vi.fn().mockResolvedValue(Response.json({}, { status: 404 })),
      'not-found',
    ],
    [
      '네트워크 오류',
      createClient('access-token'),
      vi.fn().mockRejectedValue(new Error('network detail')),
      'write-failed',
    ],
  ] as const)(
    '%s는 안전한 실패 사유로 매핑한다',
    async (_label, client, fetcher, reason) => {
      const service = createBrowserInsightMemoService(client, fetcher);

      await expect(service.updateMemo(INSIGHT_ID, '메모')).resolves.toEqual({
        ok: false,
        reason,
      });
    }
  );

  it('줄바꿈 또는 200자 초과 메모는 요청하지 않고 쓰기 실패로 처리한다', async () => {
    const fetcher = vi.fn();
    const service = createBrowserInsightMemoService(
      createClient('access-token'),
      fetcher
    );

    await expect(
      service.updateMemo(INSIGHT_ID, '첫 줄\n둘째 줄')
    ).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
    await expect(
      service.updateMemo(INSIGHT_ID, '가'.repeat(201))
    ).resolves.toEqual({
      ok: false,
      reason: 'write-failed',
    });
    expect(fetcher).not.toHaveBeenCalled();
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
