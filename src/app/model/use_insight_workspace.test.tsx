/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Insight, InsightRepository } from '@/entities/insight';

import { useInsightWorkspace } from './use_insight_workspace';

describe('useInsightWorkspace', () => {
  it('원격 목록을 기다리는 동안 로딩 상태를 보이고 완료 후 복원한다', async () => {
    const restoredInsight = createInsight({ id: 'restored' });
    const list =
      createDeferred<Awaited<ReturnType<InsightRepository['list']>>>();
    const repository = createRepository({ list: vi.fn(() => list.promise) });
    const { result } = renderHook(() => useInsightWorkspace({ repository }));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.insights).toEqual([]);

    await act(async () => {
      list.resolve({ insights: [restoredInsight], warnings: [] });
      await list.promise;
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.insights).toEqual([restoredInsight]);
  });

  it('원격 생성이 성공한 뒤 서버가 반환한 인사이트를 노출한다', async () => {
    const serverInsight = createInsight({
      id: 'server-insight',
      originalUrl: 'https://Example.com/article#details',
      normalizedUrl: 'https://example.com/article',
      domain: 'example.com',
      createdAt: '2026-07-15T00:00:00.000Z',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const create = vi
      .fn<InsightRepository['create']>()
      .mockResolvedValue({ insight: serverInsight, ok: true });
    const repository = createRepository({ create });
    const { result } = await renderReadyWorkspace(repository, {
      createId: () => 'candidate-id',
      now: () => '2026-07-15T00:00:00.000Z',
    });
    let saveResult: Awaited<ReturnType<typeof result.current.saveInsight>>;

    await act(async () => {
      saveResult = await result.current.saveInsight(
        ' https://Example.com/article#details '
      );
    });

    expect(saveResult!).toEqual({ ok: true, insightId: 'server-insight' });
    expect(create).toHaveBeenCalledWith({
      ...serverInsight,
      id: 'candidate-id',
      title: 'example.com',
    });
    expect(result.current.insights).toEqual([serverInsight]);
  });

  it('원격 생성 실패 시 기존 목록을 유지한다', async () => {
    const savedInsight = createInsight({ id: 'saved' });
    const repository = createRepository({
      create: vi.fn().mockResolvedValue({
        ok: false,
        reason: 'permission-denied',
      }),
      list: vi.fn().mockResolvedValue({
        insights: [savedInsight],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);
    let saveResult: Awaited<ReturnType<typeof result.current.saveInsight>>;

    await act(async () => {
      saveResult = await result.current.saveInsight(
        'https://new.example/article'
      );
    });

    expect(saveResult!).toEqual({
      ok: false,
      reason: 'permission-denied',
    });
    expect(result.current.insights).toEqual([savedInsight]);
  });

  it('정규화 URL이 이미 있으면 원격 생성을 호출하지 않는다', async () => {
    const create = vi.fn<InsightRepository['create']>();
    const repository = createRepository({
      create,
      list: vi.fn().mockResolvedValue({
        insights: [
          createInsight({
            normalizedUrl: 'https://example.com/article',
          }),
        ],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    await expect(
      act(() =>
        result.current.saveInsight(
          'https://EXAMPLE.com/article?utm_source=test#details'
        )
      )
    ).resolves.toEqual({ ok: false, reason: 'duplicate' });
    expect(create).not.toHaveBeenCalled();
  });

  it('생성이 진행 중일 때 중복 요청을 막고 진행 상태를 노출한다', async () => {
    const pendingCreate =
      createDeferred<Awaited<ReturnType<InsightRepository['create']>>>();
    const create = vi.fn(() => pendingCreate.promise);
    const repository = createRepository({ create });
    const { result } = await renderReadyWorkspace(repository);
    let firstSave: ReturnType<typeof result.current.saveInsight>;

    act(() => {
      firstSave = result.current.saveInsight('https://first.example/article');
    });

    expect(result.current.isMutating).toBe(true);
    await expect(
      result.current.saveInsight('https://second.example/article')
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    expect(create).toHaveBeenCalledOnce();

    await act(async () => {
      pendingCreate.resolve({
        insight: createInsight({
          id: 'first',
          originalUrl: 'https://first.example/article',
          normalizedUrl: 'https://first.example/article',
          domain: 'first.example',
        }),
        ok: true,
      });
      await firstSave!;
    });

    expect(result.current.isMutating).toBe(false);
  });

  it('개인 맥락을 정규화해 원격 수정 성공 후 반영한다', async () => {
    const savedInsight = createInsight({ id: 'saved' });
    const update = vi.fn<InsightRepository['update']>(async (candidate) => ({
      insight: candidate,
      ok: true,
    }));
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [savedInsight],
        warnings: [],
      }),
      update,
    });
    const { result } = await renderReadyWorkspace(repository, {
      now: () => '2026-07-15T01:00:00.000Z',
    });

    await act(async () => {
      await expect(
        result.current.updateInsightContext(savedInsight.id, {
          category: '  Design   Systems  ',
          memo: '  다시 볼 메모  ',
          title: '  새 제목  ',
        })
      ).resolves.toEqual({ ok: true });
    });

    expect(update).toHaveBeenCalledWith({
      ...savedInsight,
      category: 'Design Systems',
      memo: '다시 볼 메모',
      title: '새 제목',
      updatedAt: '2026-07-15T01:00:00.000Z',
    });
    expect(result.current.insights[0]).toEqual(update.mock.calls[0]?.[0]);
  });

  it('수정 실패 시 입력 전 인사이트와 수정 시각을 유지한다', async () => {
    const savedInsight = createInsight({
      title: '기존 제목',
      updatedAt: '2026-07-15T00:00:00.000Z',
    });
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [savedInsight],
        warnings: [],
      }),
      update: vi.fn().mockResolvedValue({
        ok: false,
        reason: 'write-failed',
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    await act(async () => {
      await expect(
        result.current.updateInsightContext(savedInsight.id, {
          category: '개발',
          memo: '새 메모',
          title: '새 제목',
        })
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    });

    expect(result.current.insights).toEqual([savedInsight]);
  });

  it.each([
    ['시계가 뒤로 감', '2026-07-14T09:00:00.000Z'],
    ['같은 밀리초', '2026-07-14T10:00:00.000Z'],
    ['유효하지 않은 시각', 'not-a-timestamp'],
  ])('수정 시각을 단조 증가시킨다: %s', async (_case, currentTime) => {
    const savedInsight = createInsight({
      createdAt: '2026-07-14T00:00:00.000Z',
      updatedAt: '2026-07-14T10:00:00.000Z',
    });
    const update = vi.fn<InsightRepository['update']>(async (candidate) => ({
      insight: candidate,
      ok: true,
    }));
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [savedInsight],
        warnings: [],
      }),
      update,
    });
    const { result } = await renderReadyWorkspace(repository, {
      now: () => currentTime,
    });

    await act(async () => {
      await result.current.updateInsightContext(savedInsight.id, {
        category: '',
        memo: '단조 증가 확인',
        title: savedInsight.title,
      });
    });

    expect(update.mock.calls[0]?.[0].updatedAt).toBe(
      '2026-07-14T10:00:00.001Z'
    );
  });

  it('삭제 성공 후 목록에서 제거하고 실패하면 기존 목록을 유지한다', async () => {
    const firstInsight = createInsight({ id: 'first' });
    const secondInsight = createInsight({
      id: 'second',
      originalUrl: 'https://second.example/article',
      normalizedUrl: 'https://second.example/article',
      domain: 'second.example',
    });
    const remove = vi
      .fn<InsightRepository['delete']>()
      .mockResolvedValueOnce({ ok: false, reason: 'write-failed' })
      .mockResolvedValueOnce({ ok: true });
    const repository = createRepository({
      delete: remove,
      list: vi.fn().mockResolvedValue({
        insights: [firstInsight, secondInsight],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    await act(async () => {
      await expect(
        result.current.deleteInsight(firstInsight.id)
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    });
    expect(result.current.insights).toEqual([firstInsight, secondInsight]);

    await act(async () => {
      await expect(
        result.current.deleteInsight(firstInsight.id)
      ).resolves.toEqual({ ok: true });
    });
    expect(result.current.insights).toEqual([secondInsight]);
  });

  it('저장소가 바뀌면 이전 지연 응답을 무시하고 새 목록만 노출한다', async () => {
    const oldList =
      createDeferred<Awaited<ReturnType<InsightRepository['list']>>>();
    const repositoryA = createRepository({
      list: vi.fn(() => oldList.promise),
    });
    const repositoryB = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [createInsight({ id: 'new-repository' })],
        warnings: [],
      }),
    });
    const { result, rerender } = renderHook(
      ({ repository }) => useInsightWorkspace({ repository }),
      { initialProps: { repository: repositoryA } }
    );

    rerender({ repository: repositoryB });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.insights[0]?.id).toBe('new-repository');

    await act(async () => {
      oldList.resolve({
        insights: [createInsight({ id: 'stale-repository' })],
        warnings: [],
      });
      await oldList.promise;
    });

    expect(result.current.insights[0]?.id).toBe('new-repository');
  });
});

async function renderReadyWorkspace(
  repository: InsightRepository,
  options: Partial<{
    createId: () => string;
    now: () => string;
  }> = {}
) {
  const view = renderHook(() =>
    useInsightWorkspace({ repository, ...options })
  );

  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

function createRepository(
  overrides: Partial<InsightRepository> = {}
): InsightRepository {
  return {
    create: vi.fn(async (candidate) => ({
      insight: candidate,
      ok: true as const,
    })),
    delete: vi.fn(async () => ({ ok: true as const })),
    list: vi.fn(async () => ({ insights: [], warnings: [] })),
    update: vi.fn(async (candidate) => ({
      insight: candidate,
      ok: true as const,
    })),
    ...overrides,
  };
}

function createInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: 'insight-1',
    originalUrl: 'https://example.com/article',
    normalizedUrl: 'https://example.com/article',
    domain: 'example.com',
    title: 'example.com',
    memo: null,
    category: null,
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}
