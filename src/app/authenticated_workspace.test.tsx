/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { AuthenticatedWorkspace } from './authenticated_workspace';

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

describe('AuthenticatedWorkspace', () => {
  it('moves between the home, library, and save tabs', async () => {
    const user = userEvent.setup();

    render(
      <DesignSystemProvider>
        <AuthenticatedWorkspace />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '보관함' }));
    expect(
      screen.getByRole('heading', { name: '전체 인사이트' })
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(
      screen.getByRole('heading', { name: 'URL만 넣고 바로 보관해요' })
    ).not.toBeNull();
  });
});
