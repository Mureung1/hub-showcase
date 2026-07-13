/* @vitest-environment jsdom */
import { createRef } from 'react';
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

  it('forwards each root reference to its input control', () => {
    const textFieldRef = createRef<HTMLInputElement>();
    const searchFieldRef = createRef<HTMLInputElement>();
    const textAreaRef = createRef<HTMLTextAreaElement>();

    render(
      <DesignSystemProvider>
        <TextField aria-label="일반 입력" ref={textFieldRef} />
        <SearchField aria-label="검색 입력" ref={searchFieldRef} />
        <TextArea aria-label="메모 입력" ref={textAreaRef} />
      </DesignSystemProvider>
    );

    expect(textFieldRef.current).toBe(
      screen.getByRole('textbox', { name: '일반 입력' })
    );
    expect(searchFieldRef.current).toBe(
      screen.getByRole('searchbox', { name: '검색 입력' })
    );
    expect(textAreaRef.current).toBe(
      screen.getByRole('textbox', { name: '메모 입력' })
    );
  });

  it('keeps controlled values while forwarding change events', async () => {
    const user = userEvent.setup();
    const onTextFieldChange = vi.fn();
    const onSearchFieldChange = vi.fn();
    const onTextAreaChange = vi.fn();

    render(
      <DesignSystemProvider>
        <TextField
          aria-label="일반 입력"
          onChange={onTextFieldChange}
          value="고정"
        />
        <SearchField
          aria-label="검색 입력"
          onChange={onSearchFieldChange}
          value="고정"
        />
        <TextArea
          aria-label="메모 입력"
          onChange={onTextAreaChange}
          value="고정"
        />
      </DesignSystemProvider>
    );

    const fields = [
      {
        element: screen.getByRole('textbox', { name: '일반 입력' }),
        onChange: onTextFieldChange,
      },
      {
        element: screen.getByRole('searchbox', { name: '검색 입력' }),
        onChange: onSearchFieldChange,
      },
      {
        element: screen.getByRole('textbox', { name: '메모 입력' }),
        onChange: onTextAreaChange,
      },
    ];

    for (const { element, onChange } of fields) {
      await user.type(element, '값');

      expect(getFieldValue(element)).toBe('고정');
      expect(onChange).toHaveBeenCalled();
    }
  });

  it('preserves accessibility and status props on the input controls', () => {
    render(
      <DesignSystemProvider>
        <p id="field-help">도움말</p>
        <TextField
          aria-describedby="field-help"
          aria-label="일반 입력"
          invalid
        />
        <SearchField
          aria-describedby="field-help"
          aria-invalid="true"
          aria-label="검색 입력"
        />
        <TextArea
          aria-describedby="field-help"
          aria-label="메모 입력"
          invalid
        />
      </DesignSystemProvider>
    );

    const fields = [
      screen.getByRole('textbox', { name: '일반 입력' }),
      screen.getByRole('searchbox', { name: '검색 입력' }),
      screen.getByRole('textbox', { name: '메모 입력' }),
    ];

    fields.forEach((field) => {
      expect(field.getAttribute('aria-describedby')).toBe('field-help');
      expect(field.getAttribute('aria-invalid')).toBe('true');
    });
  });
});

function getFieldValue(field: HTMLElement) {
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    return field.value;
  }

  throw new Error('Expected an input control');
}
