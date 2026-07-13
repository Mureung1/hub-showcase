/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeAll,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { CategoryFilter } from './category_filter';
import type {
  CategoryFilterOption,
  CategoryFilterProps,
} from './category_filter';

const options = [
  { label: '전체', tone: 'slate', value: '전체' },
  { label: '개발', tone: 'blue', value: '개발' },
] as const satisfies readonly CategoryFilterOption[];

beforeAll(() => {
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

describe('CategoryFilter', () => {
  it('개발 옵션을 누르면 해당 값을 한 번 전달한다', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={onValueChange}
          options={options}
          value="전체"
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('tab', { name: '개발 카테고리' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('개발');
  });

  it('선택 상태와 장식용 톤 마크를 실제 DOM에 노출한다', () => {
    render(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={vi.fn()}
          options={options}
          value="개발"
        />
      </DesignSystemProvider>
    );

    const navigation = screen.getByRole('navigation', {
      name: '카테고리 필터',
    });
    const selectedOption = screen.getByRole('tab', {
      name: '개발 카테고리',
    });
    const mark = selectedOption.querySelector('.category-filter__mark--blue');

    expect(navigation.classList.contains('category-filter')).toBe(true);
    expect(screen.getByRole('tablist')).not.toBeNull();
    expect(selectedOption.getAttribute('aria-selected')).toBe('true');
    expect(selectedOption.getAttribute('type')).toBe('button');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
  });

  it('제품 경계에 구현 전용 props를 노출하지 않는다', () => {
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('defaultValue');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('horizontalPadding');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('sx');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('variant');
  });
});
