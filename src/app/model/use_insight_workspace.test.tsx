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
      ).toEqual({ ok: true, insightId: 'new-insight' });
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

  it('persists personal context and exposes normalized values immediately', () => {
    const savedInsight = createInsight({ id: 'saved-insight' });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [savedInsight], warnings: [] }),
      save,
    };
    const { result } = renderHook(() =>
      useInsightWorkspace({
        now: () => '2026-07-14T13:00:00.000Z',
        repository,
      })
    );

    act(() => {
      expect(
        result.current.updateInsightContext('saved-insight', {
          category: '  Design   Systems  ',
          memo: '  모바일 화면에서 다시 보기  ',
          title: '  선택 부담을 줄이는 패턴  ',
        })
      ).toEqual({ ok: true });
    });

    const updatedInsight: Insight = {
      ...savedInsight,
      category: 'Design Systems',
      memo: '모바일 화면에서 다시 보기',
      title: '선택 부담을 줄이는 패턴',
      updatedAt: '2026-07-14T13:00:00.000Z',
    };

    expect(save).toHaveBeenCalledWith([updatedInsight]);
    expect(result.current.insights).toEqual([updatedInsight]);
  });

  it('uses the URL fallback title and nulls when optional context is blank', () => {
    const savedInsight = createInsight({
      category: '디자인',
      memo: '기존 메모',
      title: '기존 선택 제목',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({ insights: [savedInsight], warnings: [] }),
      save,
    };
    const { result } = renderHook(() =>
      useInsightWorkspace({
        now: () => '2026-07-14T13:00:00.000Z',
        repository,
      })
    );

    act(() => {
      result.current.updateInsightContext(savedInsight.id, {
        category: ' \n\t ',
        memo: '   ',
        title: '   ',
      });
    });

    expect(result.current.insights[0]).toEqual({
      ...savedInsight,
      category: null,
      memo: null,
      title: 'example.com',
      updatedAt: '2026-07-14T13:00:00.000Z',
    });
  });

  it('updates only the first matching insight when an injected repository violates ID uniqueness', () => {
    const firstInsight = createInsight({ title: 'First insight' });
    const duplicateInsight = createInsight({
      originalUrl: 'https://duplicate.example/article',
      normalizedUrl: 'https://duplicate.example/article',
      domain: 'duplicate.example',
      title: 'Duplicate insight',
    });
    const save = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repository: InsightRepository = {
      load: () => ({
        insights: [firstInsight, duplicateInsight],
        warnings: [],
      }),
      save,
    };
    const { result } = renderHook(() =>
      useInsightWorkspace({
        now: () => '2026-07-14T13:00:00.000Z',
        repository,
      })
    );

    act(() => {
      result.current.updateInsightContext(firstInsight.id, {
        category: '',
        memo: '첫 항목만 변경',
        title: 'First updated',
      });
    });

    expect(result.current.insights).toEqual([
      {
        ...firstInsight,
        memo: '첫 항목만 변경',
        title: 'First updated',
        updatedAt: '2026-07-14T13:00:00.000Z',
      },
      duplicateInsight,
    ]);
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

  it('reloads state when the injected repository changes', () => {
    const insightA = createInsight({ id: 'insight-a', title: 'Repository A' });
    const insightB = createInsight({
      id: 'insight-b',
      originalUrl: 'https://repository-b.example',
      normalizedUrl: 'https://repository-b.example',
      domain: 'repository-b.example',
      title: 'Repository B',
    });
    const saveA = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const saveB = vi.fn<InsightRepository['save']>(() => ({ ok: true }));
    const repositoryA: InsightRepository = {
      load: () => ({ insights: [insightA], warnings: [] }),
      save: saveA,
    };
    const repositoryB: InsightRepository = {
      load: () => ({ insights: [insightB], warnings: ['corrupted-entry'] }),
      save: saveB,
    };
    const { rerender, result } = renderHook(
      ({ repository }: { repository: InsightRepository }) =>
        useInsightWorkspace({
          createId: () => 'new-insight',
          now: () => '2026-07-14T12:00:00.000Z',
          repository,
        }),
      {
        initialProps: { repository: repositoryA },
        reactStrictMode: true,
      }
    );

    expect(result.current.insights).toEqual([insightA]);

    rerender({ repository: repositoryB });

    expect(result.current.insights).toEqual([insightB]);
    expect(result.current.loadWarnings).toEqual(['corrupted-entry']);

    act(() => {
      result.current.saveInsight('https://new.example/article');
    });

    expect(saveA).not.toHaveBeenCalled();
    expect(saveB).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'new-insight',
        normalizedUrl: 'https://new.example/article',
      }),
      insightB,
    ]);
  });

  it('clears recoverable corruption warnings after a successful save', () => {
    const repository: InsightRepository = {
      load: () => ({
        insights: [],
        warnings: ['read-failed', 'corrupted-store', 'corrupted-entry'],
      }),
      save: () => ({ ok: true }),
    };
    const { result } = renderHook(() =>
      useInsightWorkspace({
        createId: () => 'new-insight',
        now: () => '2026-07-14T12:00:00.000Z',
        repository,
      })
    );

    expect(result.current.loadWarnings).toEqual([
      'read-failed',
      'corrupted-store',
      'corrupted-entry',
    ]);

    act(() => {
      result.current.saveInsight('https://example.com/article');
    });

    expect(result.current.loadWarnings).toEqual(['read-failed']);
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
