/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { SearchField, TextArea, TextField } from './text_field';

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

describe('field adapters', () => {
  it('forwards text input changes through the product field', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DesignSystemProvider>
        <TextField aria-label="검색" onChange={onChange} />
      </DesignSystemProvider>
    );

    const input = screen.getByRole('textbox', { name: '검색' });

    await user.type(input, '디자인');

    expect(onChange).toHaveBeenCalled();
    expect((input as HTMLInputElement).value).toBe('디자인');
  });

  it('composes the product class with caller classes on each wrapper', () => {
    render(
      <DesignSystemProvider>
        <TextField aria-label="일반 입력" className="text-field-class" />
        <SearchField aria-label="검색 입력" className="search-field-class" />
        <TextArea aria-label="메모 입력" className="text-area-class" />
      </DesignSystemProvider>
    );

    const cases = [
      {
        callerClass: 'text-field-class',
        field: screen.getByRole('textbox', { name: '일반 입력' }),
      },
      {
        callerClass: 'search-field-class',
        field: screen.getByRole('searchbox', { name: '검색 입력' }),
      },
      {
        callerClass: 'text-area-class',
        field: screen.getByRole('textbox', { name: '메모 입력' }),
      },
    ];

    cases.forEach(({ callerClass, field }) => {
      const wrapper = field.closest('.ui-field');

      expect(wrapper).not.toBeNull();
      expect(wrapper?.classList.contains(callerClass)).toBe(true);
    });
  });
});
