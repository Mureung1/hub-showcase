/* @vitest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  Category,
  CategoryRepository,
  CategoryRepositoryWriteResult,
} from '@/entities/category';

import { useCategoryWorkspace } from './use_category_workspace';

const DEVELOPMENT_CATEGORY = createCategory({
  colorKey: 'green-2',
  id: '10000000-0000-4000-8000-000000000001',
  name: '개발',
  sortOrder: 0,
});
const FRONTEND_CATEGORY = createCategory({
  colorKey: 'blue-2',
  id: DEVELOPMENT_CATEGORY.id,
  name: '프론트엔드',
  sortOrder: 0,
});

describe('useCategoryWorkspace', () => {
  it('생성, 변경, 삭제 성공 결과를 목록에 반영한다', async () => {
    const onCategoryDeleted = vi.fn();
    const create = vi
      .fn<CategoryRepository['create']>()
      .mockResolvedValue({ category: DEVELOPMENT_CATEGORY, ok: true });
    const update = vi
      .fn<CategoryRepository['update']>()
      .mockResolvedValue({ category: FRONTEND_CATEGORY, ok: true });
    const remove = vi
      .fn<CategoryRepository['delete']>()
      .mockResolvedValue({ ok: true });
    const repository = createRepository({ create, delete: remove, update });
    const { result } = await renderReadyWorkspace(
      repository,
      onCategoryDeleted
    );

    await act(async () => {
      await expect(
        result.current.createCategory({
          colorKey: 'green-2',
          name: '  개발  ',
        })
      ).resolves.toEqual({ category: DEVELOPMENT_CATEGORY, ok: true });
    });
    expect(create).toHaveBeenCalledWith(
      { colorKey: 'green-2', name: '개발' },
      0
    );
    expect(result.current.categories).toEqual([DEVELOPMENT_CATEGORY]);

    await act(async () => {
      await expect(
        result.current.updateCategory(DEVELOPMENT_CATEGORY.id, {
          colorKey: 'blue-2',
          name: ' 프론트엔드 ',
        })
      ).resolves.toEqual({ category: FRONTEND_CATEGORY, ok: true });
    });
    expect(result.current.categories).toEqual([FRONTEND_CATEGORY]);

    await act(async () => {
      await expect(
        result.current.deleteCategory(FRONTEND_CATEGORY.id)
      ).resolves.toEqual({ ok: true });
    });
    expect(result.current.categories).toEqual([]);
    expect(onCategoryDeleted).toHaveBeenCalledWith(FRONTEND_CATEGORY.id);
  });

  it('현재 목록의 최댓값 다음 sortOrder로 생성한다', async () => {
    const create = vi
      .fn<CategoryRepository['create']>()
      .mockResolvedValue({ category: DEVELOPMENT_CATEGORY, ok: true });
    const repository = createRepository({
      create,
      list: vi.fn().mockResolvedValue({
        categories: [
          createCategory({ id: 'category-1', sortOrder: 3 }),
          createCategory({ id: 'category-2', sortOrder: 7 }),
        ],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    await act(async () => {
      await result.current.createCategory({
        colorKey: 'green-2',
        name: '개발',
      });
    });

    expect(create).toHaveBeenCalledWith(
      { colorKey: 'green-2', name: '개발' },
      8
    );
  });

  it('공백과 대소문자만 다른 중복 생성을 저장소 호출 전에 거절한다', async () => {
    const create = vi.fn<CategoryRepository['create']>();
    const repository = createRepository({
      create,
      list: vi.fn().mockResolvedValue({
        categories: [
          createCategory({
            id: '10000000-0000-4000-8000-000000000010',
            name: 'Design Systems',
          }),
        ],
        warnings: [],
      }),
    });
    const { result } = await renderReadyWorkspace(repository);

    await act(async () => {
      await expect(
        result.current.createCategory({
          colorKey: 'blue-2',
          name: '  design   systems  ',
        })
      ).resolves.toEqual({ ok: false, reason: 'duplicate' });
    });

    expect(create).not.toHaveBeenCalled();
  });

  it('실패 응답에서는 목록을 유지하고 삭제 콜백을 호출하지 않는다', async () => {
    const onCategoryDeleted = vi.fn();
    const repository = createRepository({
      create: vi
        .fn<CategoryRepository['create']>()
        .mockResolvedValue({ ok: false, reason: 'write-failed' }),
      delete: vi
        .fn<CategoryRepository['delete']>()
        .mockResolvedValue({ ok: false, reason: 'write-failed' }),
      list: vi.fn().mockResolvedValue({
        categories: [DEVELOPMENT_CATEGORY],
        warnings: [],
      }),
      update: vi
        .fn<CategoryRepository['update']>()
        .mockResolvedValue({ ok: false, reason: 'write-failed' }),
    });
    const { result } = await renderReadyWorkspace(
      repository,
      onCategoryDeleted
    );

    await act(async () => {
      await expect(
        result.current.createCategory({
          colorKey: 'blue-2',
          name: '새 분류',
        })
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
      await expect(
        result.current.updateCategory(DEVELOPMENT_CATEGORY.id, {
          colorKey: 'blue-2',
          name: '변경',
        })
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
      await expect(
        result.current.deleteCategory(DEVELOPMENT_CATEGORY.id)
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    });

    expect(result.current.categories).toEqual([DEVELOPMENT_CATEGORY]);
    expect(onCategoryDeleted).not.toHaveBeenCalled();
  });

  it('동시에 두 변경을 실행하지 않는다', async () => {
    const deferred = createDeferred<CategoryRepositoryWriteResult>();
    const create = vi
      .fn<CategoryRepository['create']>()
      .mockReturnValue(deferred.promise);
    const remove = vi.fn<CategoryRepository['delete']>();
    const repository = createRepository({ create, delete: remove });
    const { result } = await renderReadyWorkspace(repository);

    let firstMutation!: Promise<CategoryRepositoryWriteResult>;
    act(() => {
      firstMutation = result.current.createCategory({
        colorKey: 'green-2',
        name: '개발',
      });
    });
    await waitFor(() => expect(result.current.isMutating).toBe(true));

    await act(async () => {
      await expect(
        result.current.deleteCategory(DEVELOPMENT_CATEGORY.id)
      ).resolves.toEqual({ ok: false, reason: 'write-failed' });
    });
    expect(remove).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve({ category: DEVELOPMENT_CATEGORY, ok: true });
      await firstMutation;
    });
    expect(result.current.isMutating).toBe(false);
  });

  it('저장소가 바뀌면 새 목록만 반영한다', async () => {
    const oldList =
      createDeferred<Awaited<ReturnType<CategoryRepository['list']>>>();
    const oldRepository = createRepository({
      list: vi.fn(() => oldList.promise),
    });
    const newCategory = createCategory({ id: 'new-category', name: '새 목록' });
    const newRepository = createRepository({
      list: vi.fn().mockResolvedValue({
        categories: [newCategory],
        warnings: [],
      }),
    });
    const onCategoryDeleted = vi.fn();
    const { result, rerender } = renderHook(
      ({ repository }) =>
        useCategoryWorkspace({ onCategoryDeleted, repository }),
      { initialProps: { repository: oldRepository } }
    );

    rerender({ repository: newRepository });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.categories).toEqual([newCategory]);

    await act(async () => {
      oldList.resolve({
        categories: [DEVELOPMENT_CATEGORY],
        warnings: [],
      });
      await oldList.promise;
    });

    expect(result.current.categories).toEqual([newCategory]);
  });
});

async function renderReadyWorkspace(
  repository: CategoryRepository,
  onCategoryDeleted: (categoryId: string) => void = () => undefined
) {
  const view = renderHook(() =>
    useCategoryWorkspace({ onCategoryDeleted, repository })
  );

  await waitFor(() => expect(view.result.current.isLoading).toBe(false));
  return view;
}

function createRepository(
  overrides: Partial<CategoryRepository> = {}
): CategoryRepository {
  return {
    create: vi.fn<CategoryRepository['create']>(async () => ({
      ok: false,
      reason: 'write-failed',
    })),
    delete: vi.fn<CategoryRepository['delete']>(async () => ({
      ok: false,
      reason: 'write-failed',
    })),
    list: vi.fn(async () => ({ categories: [], warnings: [] })),
    update: vi.fn<CategoryRepository['update']>(async () => ({
      ok: false,
      reason: 'write-failed',
    })),
    ...overrides,
  };
}

function createCategory(overrides: Partial<Category> = {}): Category {
  return {
    colorKey: 'slate-2',
    createdAt: '2026-07-24T00:00:00.000Z',
    id: '10000000-0000-4000-8000-000000000099',
    name: '기본',
    sortOrder: 0,
    updatedAt: '2026-07-24T00:00:00.000Z',
    ...overrides,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}
