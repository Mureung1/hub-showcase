/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { AppNavigation } from './app_navigation';

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

describe('AppNavigation', () => {
  it('renders the workspace tabs and reports a typed tab change', async () => {
    const user = userEvent.setup();
    const onTabChange = vi.fn();

    render(
      <DesignSystemProvider>
        <AppNavigation onTabChange={onTabChange} tab="home" />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('button', { name: '보관함' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '홈' }).getAttribute('aria-current')
    ).toBe('page');
    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '보관함' }));

    expect(onTabChange).toHaveBeenCalledWith('library');
  });
});
