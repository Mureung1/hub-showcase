/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import type {
  Category,
  CategoryRepositoryDeleteResult,
  CategoryRepositoryWriteResult,
} from '@/entities/category';
import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { CategoryManager } from './category_manager';

const DEVELOPMENT_CATEGORY: Category = {
  colorKey: 'green-2',
  createdAt: '2026-07-24T00:00:00.000Z',
  id: '10000000-0000-4000-8000-000000000001',
  name: '개발',
  sortOrder: 0,
  updatedAt: '2026-07-24T00:00:00.000Z',
};

beforeAll(() => {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: vi.fn(() => []),
  });

  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      disconnect() {}

      observe() {}

      unobserve() {}
    }
  );

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      dispatchEvent: vi.fn(),
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
});

afterEach(cleanup);

describe('CategoryManager', () => {
  it('이름과 색상을 골라 새 카테고리를 만든다', async () => {
    const user = userEvent.setup();
    const createCategory = vi.fn().mockResolvedValue({
      category: DEVELOPMENT_CATEGORY,
      ok: true,
    } satisfies CategoryRepositoryWriteResult);
    const onCategoryCreated = vi.fn();

    renderManager({ createCategory, onCategoryCreated });

    await user.click(screen.getByRole('button', { name: '새 카테고리' }));
    await user.type(screen.getByLabelText('카테고리 이름'), '개발');
    await user.click(screen.getByRole('button', { name: '초록' }));
    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(createCategory).toHaveBeenCalledWith({
      colorKey: 'green-2',
      name: '개발',
    });
    expect(onCategoryCreated).toHaveBeenCalledWith(DEVELOPMENT_CATEGORY);
  });

  it('기존 카테고리를 수정하고 삭제 전 영향을 확인한다', async () => {
    const user = userEvent.setup();
    const updateCategory = vi.fn().mockResolvedValue({
      category: {
        ...DEVELOPMENT_CATEGORY,
        colorKey: 'blue-2',
        name: '프론트엔드',
      },
      ok: true,
    } satisfies CategoryRepositoryWriteResult);
    const deleteCategory = vi
      .fn()
      .mockResolvedValue({ ok: true } satisfies CategoryRepositoryDeleteResult);

    renderManager({
      categories: [DEVELOPMENT_CATEGORY],
      deleteCategory,
      updateCategory,
    });

    await user.click(screen.getByRole('button', { name: '개발 수정' }));
    const nameInput = screen.getByLabelText('카테고리 이름');
    await user.clear(nameInput);
    await user.type(nameInput, '프론트엔드');
    await user.click(screen.getByRole('button', { name: '파랑' }));
    await user.click(screen.getByRole('button', { name: '변경 저장' }));

    expect(updateCategory).toHaveBeenCalledWith(DEVELOPMENT_CATEGORY.id, {
      colorKey: 'blue-2',
      name: '프론트엔드',
    });

    await user.click(screen.getByRole('button', { name: '개발 수정' }));
    await user.click(screen.getByRole('button', { name: '카테고리 삭제' }));

    expect(
      screen.getByText('연결된 인사이트는 삭제되지 않고 미분류로 이동합니다.')
    ).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '삭제하기' }));

    expect(deleteCategory).toHaveBeenCalledWith(DEVELOPMENT_CATEGORY.id);
  });

  it('실패하면 현재 입력과 편집 화면을 유지한다', async () => {
    const user = userEvent.setup();
    const createCategory = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: 'duplicate' });

    renderManager({ createCategory });

    await user.click(screen.getByRole('button', { name: '새 카테고리' }));
    await user.type(screen.getByLabelText('카테고리 이름'), '개발');
    await user.click(screen.getByRole('button', { name: '만들기' }));

    expect(
      (screen.getByLabelText('카테고리 이름') as HTMLInputElement).value
    ).toBe('개발');
    const input = screen.getByLabelText('카테고리 이름');
    const error = screen.getByText('같은 이름의 카테고리가 있습니다.');

    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(screen.getByRole('dialog', { name: /새 카테고리/ })).toBeTruthy();
  });
});

function renderManager(
  overrides: Partial<React.ComponentProps<typeof CategoryManager>> = {}
) {
  const defaultWriteFailure = async () =>
    ({ ok: false, reason: 'write-failed' }) as const;

  return render(
    <DesignSystemProvider>
      <CategoryManager
        categories={[]}
        createCategory={defaultWriteFailure}
        deleteCategory={defaultWriteFailure}
        isMutating={false}
        onCategoryCreated={() => undefined}
        onOpenChange={() => undefined}
        open
        updateCategory={defaultWriteFailure}
        {...overrides}
      />
    </DesignSystemProvider>
  );
}
