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
  { colorKey: null, label: '전체', value: '전체' },
  {
    colorKey: 'coral-2',
    disabled: true,
    label: '디자인',
    value: '디자인',
  },
  { colorKey: 'blue-2', label: '개발', value: '개발' },
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

    await user.click(screen.getByRole('button', { name: '개발' }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('개발');
  });

  it('필터를 group과 pressed button으로 안내한다', () => {
    render(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={vi.fn()}
          options={options}
          value="개발"
        />
      </DesignSystemProvider>
    );

    const group = screen.getByRole('group', { name: '카테고리 필터' });
    const selectedOption = screen.getByRole('button', { name: '개발' });
    const mark = selectedOption.querySelector('.category-filter__mark');

    expect(group.classList.contains('category-filter')).toBe(true);
    expect(selectedOption.getAttribute('aria-pressed')).toBe('true');
    expect(selectedOption.hasAttribute('aria-selected')).toBe(false);
    expect(selectedOption.getAttribute('type')).toBe('button');
    expect(mark?.getAttribute('aria-hidden')).toBe('true');
    expect(mark?.getAttribute('style')).toContain(
      '--category-color: var(--category-blue-2)'
    );
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('화살표로 disabled 항목을 건너뛰고 키보드로 선택한다', async () => {
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

    const allOption = screen.getByRole('button', { name: '전체' });
    const disabledOption = screen.getByRole('button', { name: '디자인' });
    const developmentOption = screen.getByRole('button', { name: '개발' });

    expect(disabledOption.hasAttribute('disabled')).toBe(true);

    await user.tab();

    expect(document.activeElement).toBe(allOption);

    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(developmentOption);
    expect(onValueChange).not.toHaveBeenCalled();

    await user.keyboard(' ');

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('개발');
  });

  it('좌우 화살표로 enabled 항목의 끝을 순환한다', async () => {
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

    const allOption = screen.getByRole('button', { name: '전체' });
    const developmentOption = screen.getByRole('button', { name: '개발' });

    allOption.focus();
    await user.keyboard('{ArrowLeft}');

    expect(document.activeElement).toBe(developmentOption);

    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(allOption);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('Home과 End로 첫 번째와 마지막 enabled 항목으로 이동한다', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={vi.fn()}
          options={options}
          value="개발"
        />
      </DesignSystemProvider>
    );

    const allOption = screen.getByRole('button', { name: '전체' });
    const developmentOption = screen.getByRole('button', { name: '개발' });

    developmentOption.focus();
    await user.keyboard('{Home}');

    expect(document.activeElement).toBe(allOption);

    await user.keyboard('{End}');

    expect(document.activeElement).toBe(developmentOption);
  });

  it('선택값이 없거나 disabled면 첫 enabled 항목을 tab stop으로 삼는다', () => {
    const { rerender } = render(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={vi.fn()}
          options={options}
          value="없는 값"
        />
      </DesignSystemProvider>
    );

    const expectFirstEnabledTabStop = () => {
      expect(screen.getByRole('button', { name: '전체' }).tabIndex).toBe(0);
      expect(screen.getByRole('button', { name: '디자인' }).tabIndex).toBe(-1);
      expect(screen.getByRole('button', { name: '개발' }).tabIndex).toBe(-1);
    };

    expectFirstEnabledTabStop();

    rerender(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={vi.fn()}
          options={options}
          value="디자인"
        />
      </DesignSystemProvider>
    );

    expectFirstEnabledTabStop();
  });

  it('빈 options와 전체 disabled options에 포커스 진입점을 만들지 않는다', () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DesignSystemProvider>
        <CategoryFilter onValueChange={onValueChange} options={[]} value="" />
      </DesignSystemProvider>
    );

    const emptyGroup = screen.getByRole('group', { name: '카테고리 필터' });

    expect(emptyGroup.tabIndex).toBe(-1);
    expect(screen.queryByRole('button')).toBeNull();

    rerender(
      <DesignSystemProvider>
        <CategoryFilter
          onValueChange={onValueChange}
          options={[
            {
              colorKey: null,
              disabled: true,
              label: '비활성',
              value: 'disabled',
            },
          ]}
          value="disabled"
        />
      </DesignSystemProvider>
    );

    const allDisabledGroup = screen.getByRole('group', {
      name: '카테고리 필터',
    });
    const disabledOption = screen.getByRole('button', { name: '비활성' });

    expect(allDisabledGroup.tabIndex).toBe(-1);
    expect(disabledOption.tabIndex).toBe(-1);
    expect(disabledOption.hasAttribute('disabled')).toBe(true);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('제품 경계에 구현 전용 props를 노출하지 않는다', () => {
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('defaultValue');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('horizontalPadding');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('sx');
    expectTypeOf<CategoryFilterProps>().not.toHaveProperty('variant');
  });
});
