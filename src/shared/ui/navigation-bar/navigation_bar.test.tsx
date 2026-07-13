/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui/design-system-provider';

import { NavigationBar } from './navigation_bar';

const items = [
  {
    icon: <span aria-hidden="true">H</span>,
    label: '홈',
    value: 'home',
  },
  {
    icon: <span aria-hidden="true">L</span>,
    label: '보관함',
    value: 'library',
  },
] as const;

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

describe('NavigationBar', () => {
  it('활성 항목을 표시하고 보관함의 generic 값을 전달한다', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn<(value: 'home' | 'library') => void>();

    render(
      <DesignSystemProvider>
        <NavigationBar
          items={items}
          onValueChange={onValueChange}
          value="home"
        />
      </DesignSystemProvider>
    );

    const navigation = screen.getByRole('navigation', { name: '주요 화면' });
    const home = screen.getByRole('button', { name: '홈' });
    const library = screen.getByRole('button', { name: '보관함' });

    expect(navigation.classList.contains('navigation-bar')).toBe(true);
    expect(home.getAttribute('aria-current')).toBe('page');
    expect(library.hasAttribute('aria-current')).toBe(false);

    await user.click(library);

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith('library');
  });

  it('키보드로 항목을 실행해도 form을 제출하지 않는다', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const onValueChange = vi.fn();

    render(
      <DesignSystemProvider>
        <form onSubmit={onSubmit}>
          <NavigationBar
            items={items}
            onValueChange={onValueChange}
            value="home"
          />
        </form>
      </DesignSystemProvider>
    );

    const library = screen.getByRole('button', { name: '보관함' });

    expect(library.getAttribute('type')).toBe('button');

    library.focus();
    await user.keyboard('{Enter}');

    expect(onValueChange).toHaveBeenCalledWith('library');
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
