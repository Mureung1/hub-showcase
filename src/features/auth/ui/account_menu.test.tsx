/* @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { AccountMenu } from './account_menu';

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

afterEach(() => {
  cleanup();
});

describe('AccountMenu', () => {
  it('shows the signed-in account and delegates sign-out', async () => {
    const user = userEvent.setup();
    const onSignOut = vi.fn();
    render(
      <DesignSystemProvider>
        <AccountMenu
          onSignOut={onSignOut}
          user={{
            displayName: '테스트 사용자',
            email: 'member@example.com',
            id: 'user-1',
          }}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '계정 메뉴 열기' }));

    const accountRegion = screen.getByRole('region', { name: '계정 정보' });
    expect(within(accountRegion).getByText('테스트 사용자')).not.toBeNull();
    expect(
      within(accountRegion).getByText('member@example.com')
    ).not.toBeNull();

    await user.click(screen.getByRole('button', { name: '로그아웃' }));

    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it('shows a sign-out failure and prevents duplicate requests', async () => {
    const user = userEvent.setup();
    render(
      <DesignSystemProvider>
        <AccountMenu
          errorMessage="로그아웃 요청 오류"
          isSigningOut
          onSignOut={vi.fn()}
          user={{ displayName: '테스트 사용자', id: 'user-1' }}
        />
      </DesignSystemProvider>
    );

    await user.click(screen.getByRole('button', { name: '계정 메뉴 열기' }));

    expect(screen.getByRole('alert').textContent).toContain(
      '로그아웃 요청 오류'
    );
    expect(
      (
        screen.getByRole('button', {
          name: '로그아웃하고 있어요',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});
