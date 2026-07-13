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
});

describe('CategoryTag', () => {
  it('renders a static tag with its tone class', () => {
    render(
      <DesignSystemProvider>
        <CategoryTag tone="coral">개발</CategoryTag>
      </DesignSystemProvider>
    );

    const tag = screen.getByText('개발').closest('.category-tag');

    expect(tag?.tagName).toBe('SPAN');
    expect(tag?.classList.contains('category-tag--coral')).toBe(true);
    expect(tag?.hasAttribute('role')).toBe(false);
    expect(tag?.hasAttribute('type')).toBe(false);
  });
});
