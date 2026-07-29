import { describe, expect, it, vi } from 'vitest';

import type { InsightCaptureAuthenticator } from '../insight_capture_service';
import type { GeminiEmbeddingClient } from './gemini_embedding_client';
import type { InsightEmbeddingStore } from './insight_embedding_store';
import { createInsightRetrieveService } from './insight_retrieve_service';

const documentVector = Array(768).fill(0.01);
const queryVector = Array(768).fill(0.02);

describe('꺼내보기 의미 검색 서비스', () => {
  it.each([
    {
      request: { query: '로그인 오류 안내' },
      result: { ok: false, reason: 'permission-denied' },
      userId: null,
    },
    {
      request: { query: ' ' },
      result: { ok: false, reason: 'invalid-request' },
      userId: 'user-1',
    },
  ])('권한과 입력을 외부 호출 전에 확인한다', async (example) => {
    const dependencies = createDependencies();
    dependencies.authenticator.authenticate.mockResolvedValue(example.userId);
    const service = createInsightRetrieveService(dependencies);

    await expect(
      service.retrieve('access-token', example.request)
    ).resolves.toEqual(example.result);
    expect(dependencies.store.listPending).not.toHaveBeenCalled();
    expect(dependencies.embedder.embed).not.toHaveBeenCalled();
  });

  it('미처리 문서를 준비한 뒤 관련도순 ID를 반환한다', async () => {
    const dependencies = createDependencies();
    dependencies.store.listPending.mockResolvedValue([
      {
        insightId: 'insight-1',
        memo: '로그인 오류 안내',
        sourceHash: 'a'.repeat(64),
        title: '오류 문구',
      },
    ]);
    dependencies.embedder.embed
      .mockResolvedValueOnce({
        usage: { kind: 'actual', promptTokens: 10 },
        vector: documentVector,
      })
      .mockResolvedValueOnce({
        usage: { kind: 'actual', promptTokens: 4 },
        vector: queryVector,
      });
    dependencies.store.match.mockResolvedValue(['insight-2', 'insight-1']);

    const service = createInsightRetrieveService(dependencies);

    await expect(
      service.retrieve('access-token', { query: '오류 안내' })
    ).resolves.toEqual({
      insightIds: ['insight-2', 'insight-1'],
      ok: true,
      pendingCount: 0,
    });
    expect(dependencies.store.completeDocument).toHaveBeenCalledWith({
      insightId: 'insight-1',
      sourceHash: 'a'.repeat(64),
      userId: 'user-1',
      vector: documentVector,
    });
    expect(dependencies.store.match).toHaveBeenCalledWith({
      queryVector,
      threshold: 0.59,
      userId: 'user-1',
    });
    expect(dependencies.store.reconcileUsage).toHaveBeenCalledWith({
      promptTokens: 14,
      reservationId: 'reservation-1',
      settlement: 'actual',
    });
  });

  it('Gemini 호출 실패를 검색 실패로 바꾸고 예약량으로 정산한다', async () => {
    const dependencies = createDependencies();
    dependencies.embedder.embed.mockRejectedValue(new Error('외부 오류'));
    const service = createInsightRetrieveService(dependencies);

    await expect(
      service.retrieve('access-token', { query: '오류 안내' })
    ).resolves.toEqual({ ok: false, reason: 'retrieve-failed' });
    expect(dependencies.store.match).not.toHaveBeenCalled();
    expect(dependencies.store.reconcileUsage).toHaveBeenCalledWith({
      reservationId: 'reservation-1',
      settlement: 'reserved-maximum',
    });
  });

  it('동시에 시작해도 예산을 예약한 요청만 Gemini를 호출한다', async () => {
    const dependencies = createDependencies();
    dependencies.store.reserveUsage
      .mockResolvedValueOnce({
        ok: true,
        reservationId: 'reservation-1',
      })
      .mockResolvedValueOnce({
        ok: false,
        reason: 'usage-limit-reached',
      });
    dependencies.embedder.embed.mockResolvedValue({
      usage: { kind: 'actual', promptTokens: 4 },
      vector: queryVector,
    });
    dependencies.store.match.mockResolvedValue([]);
    const service = createInsightRetrieveService(dependencies);

    const results = await Promise.all([
      service.retrieve('access-token', { query: '첫 요청' }),
      service.retrieve('access-token', { query: '두 번째 요청' }),
    ]);

    expect(results).toContainEqual({
      insightIds: [],
      ok: true,
      pendingCount: 0,
    });
    expect(results).toContainEqual({
      ok: false,
      reason: 'usage-limit-reached',
    });
    expect(dependencies.embedder.embed).toHaveBeenCalledOnce();
  });
});

function createDependencies() {
  return {
    authenticator: {
      authenticate: vi.fn().mockResolvedValue('user-1'),
    } satisfies InsightCaptureAuthenticator,
    embedder: {
      embed: vi.fn(),
    } satisfies GeminiEmbeddingClient,
    store: {
      completeDocument: vi.fn().mockResolvedValue(undefined),
      countPending: vi.fn().mockResolvedValue(0),
      listPending: vi.fn().mockResolvedValue([]),
      match: vi.fn().mockResolvedValue([]),
      reconcileUsage: vi.fn().mockResolvedValue(undefined),
      reserveUsage: vi.fn().mockResolvedValue({
        ok: true,
        reservationId: 'reservation-1',
      }),
    } satisfies InsightEmbeddingStore,
  };
}
