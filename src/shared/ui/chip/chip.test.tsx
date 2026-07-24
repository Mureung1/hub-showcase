/* @vitest-environment jsdom */
import { createRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

import { CategoryTag, ChoiceChip } from './chip';
import type { ChoiceChipProps } from './chip';

beforeAll(() => {
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

describe('ChoiceChip', () => {
  it('forwards clicks and exposes the selected state as pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(
      <DesignSystemProvider>
        <ChoiceChip onClick={onClick} selected>
          디자인
        </ChoiceChip>
      </DesignSystemProvider>
    );

    const selectedChip = screen.getByRole('button', { name: '디자인' });

    expect(selectedChip.getAttribute('aria-pressed')).toBe('true');
    expect(selectedChip.getAttribute('data-active')).toBe('true');

    await user.click(selectedChip);

    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <DesignSystemProvider>
        <ChoiceChip onClick={onClick} selected={false}>
          디자인
        </ChoiceChip>
      </DesignSystemProvider>
    );

    const unselectedChip = screen.getByRole('button', { name: '디자인' });

    expect(unselectedChip.getAttribute('aria-pressed')).toBe('false');
    expect(unselectedChip.getAttribute('data-active')).toBe('false');
  });

  it('keeps implementation props out of the product contract', () => {
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('active');
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('aria-pressed');
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('as');
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('disableInteraction');
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('sx');
    expectTypeOf<ChoiceChipProps>().not.toHaveProperty('variant');
  });

  it('forwards its root reference to the focusable button', () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <DesignSystemProvider>
        <ChoiceChip ref={ref} selected={false}>
          디자인
        </ChoiceChip>
      </DesignSystemProvider>
    );

    const chip = screen.getByRole('button', { name: '디자인' });

    expect(ref.current).toBe(chip);

    ref.current?.focus();

    expect(document.activeElement).toBe(chip);
  });

  it.each([
    ['disabled', { disabled: true }],
    ['aria-disabled', { 'aria-disabled': true }],
  ] as const)('blocks click interactions when %s', (_label, disabledProps) => {
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <ChoiceChip {...disabledProps} onClick={onClick} selected>
          디자인
        </ChoiceChip>
      </DesignSystemProvider>
    );

    const chip = screen.getByRole('button', { name: '디자인' });

    fireEvent.click(chip);

    expect(chip.hasAttribute('disabled')).toBe(true);
    expect(chip.getAttribute('aria-disabled')).toBe('true');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses button semantics without submitting its parent form', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <DesignSystemProvider>
        <form onSubmit={onSubmit}>
          <ChoiceChip selected={false}>디자인</ChoiceChip>
        </form>
      </DesignSystemProvider>
    );

    const chip = screen.getByRole('button', { name: '디자인' });

    expect(chip.getAttribute('type')).toBe('button');

    await user.click(chip);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('supports keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <DesignSystemProvider>
        <ChoiceChip onClick={onClick} selected={false}>
          디자인
        </ChoiceChip>
      </DesignSystemProvider>
    );

    const chip = screen.getByRole('button', { name: '디자인' });

    chip.focus();
    await user.keyboard('{Enter}');

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('CategoryTag', () => {
  it('카테고리 색상 토큰으로 정적 태그를 렌더링한다', () => {
    render(
      <DesignSystemProvider>
        <CategoryTag colorKey="coral-2">개발</CategoryTag>
      </DesignSystemProvider>
    );

    const tag = screen.getByText('개발').closest('.category-tag');

    expect(tag?.tagName).toBe('SPAN');
    expect(tag?.getAttribute('style')).toContain(
      '--category-color: var(--category-coral-2)'
    );
    expect(tag?.hasAttribute('role')).toBe(false);
    expect(tag?.hasAttribute('type')).toBe(false);
  });
});
