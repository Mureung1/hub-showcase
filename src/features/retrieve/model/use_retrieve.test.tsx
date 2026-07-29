// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Insight } from '@/entities/insight';

import type { RetrieveResult, RetrieveService } from './retrieve';
import { useRetrieve } from './use_retrieve';

describe('useRetrieve', () => {
  it('늦게 끝난 이전 요청이 최신 검색 결과를 덮지 않는다', async () => {
    const first = createDeferred<RetrieveResult>();
    const second = createDeferred<RetrieveResult>();
    const service = {
      retrieve: vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    } satisfies RetrieveService;
    const { result } = renderHook(() => useRetrieve(createInsights(), service));

    let firstRequest: Promise<RetrieveResult>;
    let secondRequest: Promise<RetrieveResult>;
    act(() => {
      firstRequest = result.current.retrieve('이전 검색');
      secondRequest = result.current.retrieve('새 검색');
    });
    await act(async () => {
      second.resolve({
        insightIds: ['insight-2', 'insight-1'],
        ok: true,
        pendingCount: 0,
      });
      await secondRequest;
    });
    await act(async () => {
      first.resolve({
        insightIds: ['insight-1'],
        ok: true,
        pendingCount: 0,
      });
      await firstRequest;
    });

    expect(result.current.results.map((insight) => insight.id)).toEqual([
      'insight-2',
      'insight-1',
    ]);
    expect(result.current.submittedQuery).toBe('새 검색');
  });

  it('검색 실패 시 이전 성공 결과와 검색어를 유지한다', async () => {
    const service = {
      retrieve: vi
        .fn()
        .mockResolvedValueOnce({
          insightIds: ['insight-2'],
          ok: true,
          pendingCount: 0,
        })
        .mockResolvedValueOnce({
          ok: false,
          reason: 'retrieve-failed',
        }),
    } satisfies RetrieveService;
    const { result } = renderHook(() => useRetrieve(createInsights(), service));

    await act(() => result.current.retrieve('성공 검색'));
    await act(() => result.current.retrieve('실패 검색'));

    expect(result.current.results.map((insight) => insight.id)).toEqual([
      'insight-2',
    ]);
    expect(result.current.submittedQuery).toBe('성공 검색');
    expect(result.current.errorReason).toBe('retrieve-failed');
  });
});

function createInsights(): Insight[] {
  return [createInsight('insight-1'), createInsight('insight-2')];
}

function createInsight(id: string): Insight {
  return {
    categoryId: null,
    createdAt: '2026-07-29T00:00:00.000Z',
    domain: 'example.com',
    id,
    memo: null,
    normalizedUrl: `https://example.com/${id}`,
    originalUrl: `https://example.com/${id}`,
    title: id,
    titleOrigin: 'user',
    updatedAt: '2026-07-29T00:00:00.000Z',
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
