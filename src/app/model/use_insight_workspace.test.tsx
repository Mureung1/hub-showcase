/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Insight,
  InsightCaptureService,
  InsightRepository,
} from '@/entities/insight';

import { useInsightWorkspace } from './use_insight_workspace';

describe('useInsightWorkspace', () => {
  it('원격 목록을 기다리는 동안 로딩 상태를 보이고 완료 후 복원한다', async () => {
    const restoredInsight = createInsight({ id: 'restored' });
    const list =
      createDeferred<Awaited<ReturnType<InsightRepository['list']>>>();
    const repository = createRepository({ list: vi.fn(() => list.promise) });
    const { result } = renderHook(() =>
      useInsightWorkspace({
        captureService: UNAVAILABLE_CAPTURE_SERVICE,
        repository,
      })
    );

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
    const create = vi.fn<InsightRepository['create']>();
    const capture = vi.fn().mockResolvedValue({
      created: true,
      insight: serverInsight,
      ok: true,
    });
    const repository = createRepository({ create });
    const { result } = await renderReadyWorkspace(repository, {
      captureService: { capture },
    });
    let saveResult: Awaited<ReturnType<typeof result.current.saveInsight>>;

    await act(async () => {
      saveResult = await result.current.saveInsight(
        ' https://Example.com/article#details '
      );
    });

    expect(saveResult!).toEqual({ ok: true, insightId: 'server-insight' });
    expect(capture).toHaveBeenCalledWith({
      source: 'web',
      url: ' https://Example.com/article#details ',
    });
    expect(create).not.toHaveBeenCalled();
    expect(result.current.insights).toEqual([serverInsight]);
  });

  it('Android 공유 저장의 소스와 제목을 공통 캡처 요청에 보존한다', async () => {
    const capture = vi.fn().mockResolvedValue({
      created: true,
      insight: createInsight({ id: 'shared-insight' }),
      ok: true,
    });
    const { result } = await renderReadyWorkspace(createRepository(), {
      captureService: { capture },
    });

    await act(async () => {
      await result.current.saveInsight({
        source: 'android_share',
        title: '공유한 기사',
        url: 'https://example.com/shared',
      });
    });

    expect(capture).toHaveBeenCalledWith({
      source: 'android_share',
      title: '공유한 기사',
      url: 'https://example.com/shared',
    });
  });

  it('원격 생성 실패 시 기존 목록을 유지한다', async () => {
    const savedInsight = createInsight({ id: 'saved' });
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [savedInsight],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository, {
      captureService: {
        capture: vi.fn().mockResolvedValue({
          ok: false,
          reason: 'permission-denied',
        }),
      },
    });
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
    const existingInsight = createInsight({
      normalizedUrl: 'https://example.com/article',
    });
    const capture = vi.fn().mockResolvedValue({
      created: false,
      insight: existingInsight,
      ok: true,
    });
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [existingInsight],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository, {
      captureService: { capture },
    });

    await expect(
      act(() =>
        result.current.saveInsight(
          'https://EXAMPLE.com/article?utm_source=test#details'
        )
      )
    ).resolves.toEqual({ ok: true, insightId: existingInsight.id });
    expect(capture).toHaveBeenCalledOnce();
  });

  it('생성이 진행 중일 때 중복 요청을 막고 진행 상태를 노출한다', async () => {
    const pendingCapture =
      createDeferred<Awaited<ReturnType<InsightCaptureService['capture']>>>();
    const capture = vi.fn(() => pendingCapture.promise);
    const repository = createRepository();
    const { result } = await renderReadyWorkspace(repository, {
      captureService: { capture },
    });
    let firstSave: ReturnType<typeof result.current.saveInsight>;

    act(() => {
      firstSave = result.current.saveInsight('https://first.example/article');
    });

    expect(result.current.isMutating).toBe(true);
    await expect(
      result.current.saveInsight('https://second.example/article')
    ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    expect(capture).toHaveBeenCalledOnce();

    await act(async () => {
      pendingCapture.resolve({
        created: true,
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

  it('개인 맥락을 원격 수정 성공 후 반영한다', async () => {
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
          categoryId: '10000000-0000-4000-8000-000000000001',
          memo: '  다시 볼 메모  ',
          title: '  새 제목  ',
        })
      ).resolves.toEqual({ ok: true });
    });

    expect(update).toHaveBeenCalledWith({
      ...savedInsight,
      titleOrigin: 'user',
      categoryId: '10000000-0000-4000-8000-000000000001',
      memo: '다시 볼 메모',
      title: '새 제목',
      updatedAt: '2026-07-15T01:00:00.000Z',
    });
    expect(result.current.insights[0]).toEqual(update.mock.calls[0]?.[0]);
  });

  it('keeps a captured title when only memo or category is saved', async () => {
    const savedInsight = createInsight({
      id: 'captured-title',
      title: 'Captured browser title',
      titleOrigin: 'capture',
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
    const { result } = await renderReadyWorkspace(repository);

    await act(async () => {
      await expect(
        result.current.updateInsightContext(savedInsight.id, {
          categoryId: '10000000-0000-4000-8000-000000000001',
          memo: 'Read before implementation.',
          title: '   ',
        })
      ).resolves.toEqual({ ok: true });
    });

    expect(update.mock.calls[0]?.[0]).toMatchObject({
      categoryId: '10000000-0000-4000-8000-000000000001',
      memo: 'Read before implementation.',
      title: savedInsight.title,
      titleOrigin: savedInsight.titleOrigin,
    });
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
          categoryId: '10000000-0000-4000-8000-000000000001',
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
        categoryId: null,
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

  it('삭제된 카테고리를 참조하던 인사이트를 미분류로 동기화한다', async () => {
    const deletedCategoryId = '10000000-0000-4000-8000-000000000001';
    const repository = createRepository({
      list: vi.fn().mockResolvedValue({
        insights: [
          createInsight({ id: 'linked', categoryId: deletedCategoryId }),
          createInsight({ id: 'unlinked', categoryId: null }),
        ],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    act(() => {
      result.current.detachCategory(deletedCategoryId);
    });

    expect(result.current.insights).toEqual([
      createInsight({ id: 'linked', categoryId: null }),
      createInsight({ id: 'unlinked', categoryId: null }),
    ]);
  });

  it('재조회는 가장 늦게 시작한 요청 결과만 반영한다', async () => {
    const firstReload =
      createDeferred<Awaited<ReturnType<InsightRepository['list']>>>();
    const secondReload =
      createDeferred<Awaited<ReturnType<InsightRepository['list']>>>();
    const list = vi
      .fn<InsightRepository['list']>()
      .mockResolvedValueOnce({
        insights: [createInsight({ id: 'initial' })],
        warnings: [],
      })
      .mockReturnValueOnce(firstReload.promise)
      .mockReturnValueOnce(secondReload.promise);
    const repository = createRepository({ list });
    const { result } = await renderReadyWorkspace(repository);
    let firstRequest!: Promise<void>;
    let secondRequest!: Promise<void>;

    act(() => {
      firstRequest = result.current.reloadInsights();
      secondRequest = result.current.reloadInsights();
    });

    await act(async () => {
      secondReload.resolve({
        insights: [createInsight({ id: 'latest' })],
        warnings: [],
      });
      await secondRequest;
    });
    expect(result.current.insights[0]?.id).toBe('latest');

    await act(async () => {
      firstReload.resolve({
        insights: [createInsight({ id: 'stale' })],
        warnings: [],
      });
      await firstRequest;
    });

    expect(result.current.insights[0]?.id).toBe('latest');
    expect(list).toHaveBeenCalledTimes(3);
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
      ({ repository }) =>
        useInsightWorkspace({
          captureService: UNAVAILABLE_CAPTURE_SERVICE,
          repository,
        }),
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
    captureService: InsightCaptureService;
    now: () => string;
  }> = {}
) {
  const view = renderHook(() =>
    useInsightWorkspace({
      captureService: options.captureService ?? UNAVAILABLE_CAPTURE_SERVICE,
      now: options.now,
      repository,
    })
  );

  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

const UNAVAILABLE_CAPTURE_SERVICE: InsightCaptureService = {
  async capture() {
    return { ok: false, reason: 'write-failed' };
  },
};

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
    titleOrigin: 'fallback',
    memo: null,
    categoryId: null,
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
