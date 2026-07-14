/* @vitest-environment jsdom */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Insight, InsightRepository } from '@/entities/insight';

import { useInsightWorkspace } from './use_insight_workspace';

describe('useInsightWorkspace', () => {
  it('loads saved insights and persists a new URL before exposing it', () => {
    const savedInsight = createInsight({
      id: 'saved-insight',
      originalUrl: 'https://saved.example/article',
      normalizedUrl: 'https://saved.example/article',
      domain: 'saved.example',
      title: 'saved.example',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [savedInsight], warnings: [] }),
      save,
    };
    const { result } = renderHook(() =>
      useInsightWorkspace({
        createId: () => 'new-insight',
        now: () => '2026-07-14T12:00:00.000Z',
        repository,
      })
    );

    expect(result.current.insights).toEqual([savedInsight]);

    act(() => {
      expect(
        result.current.saveInsight(' https://Example.com/article#details ')
      ).toEqual({ ok: true });
    });

    const expectedInsight: Insight = {
      id: 'new-insight',
      originalUrl: 'https://Example.com/article#details',
      normalizedUrl: 'https://example.com/article',
      domain: 'example.com',
      title: 'example.com',
      memo: null,
      category: null,
      createdAt: '2026-07-14T12:00:00.000Z',
      updatedAt: '2026-07-14T12:00:00.000Z',
    };

    expect(save).toHaveBeenCalledWith([expectedInsight, savedInsight]);
    expect(result.current.insights).toEqual([expectedInsight, savedInsight]);
  });

  it('keeps the current insights when persistence fails', () => {
    const savedInsight = createInsight({ id: 'saved-insight' });
    const repository: InsightRepository = {
      load: () => ({ insights: [savedInsight], warnings: [] }),
      save: () => ({ ok: false, reason: 'write-failed' }),
    };
    const { result } = renderHook(() => useInsightWorkspace({ repository }));

    let saveResult: ReturnType<typeof result.current.saveInsight> | undefined;

    act(() => {
      saveResult = result.current.saveInsight('https://new.example/article');
    });

    expect(saveResult).toEqual({ ok: false, reason: 'write-failed' });
    expect(result.current.insights).toEqual([savedInsight]);
  });

  it('rejects a URL that normalizes to an already saved insight', () => {
    const savedInsight = createInsight({
      originalUrl: 'https://example.com/article?utm_source=newsletter',
      normalizedUrl: 'https://example.com/article',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [savedInsight], warnings: [] }),
      save,
    };
    const { result } = renderHook(() => useInsightWorkspace({ repository }));

    let saveResult: ReturnType<typeof result.current.saveInsight> | undefined;

    act(() => {
      saveResult = result.current.saveInsight(
        'https://EXAMPLE.com/article#details'
      );
    });

    expect(saveResult).toEqual({ ok: false, reason: 'duplicate' });
    expect(save).not.toHaveBeenCalled();
    expect(result.current.insights).toEqual([savedInsight]);
  });
});

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com',
    normalizedUrl: 'https://example.com',
    domain: 'example.com',
    title: 'example.com',
    memo: null,
    category: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}
