/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { Select } from './select';

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

describe('Select', () => {
  it('옵션 선택값을 제품 콜백으로 전달한다', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <DesignSystemProvider>
        <Select
          aria-label="카테고리"
          onValueChange={onValueChange}
          options={[
            { label: '미분류', value: 'uncategorized' },
            { label: '개발', value: 'development' },
          ]}
          value="uncategorized"
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('combobox', { name: '카테고리' }));
    await user.click(screen.getByRole('option', { name: '개발' }));

    expect(onValueChange).toHaveBeenCalledWith('development');
  });
});
