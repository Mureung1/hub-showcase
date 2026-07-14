/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { DesignSystemProvider } from '@/shared/ui';

import { LoginPage } from './login_page';

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

describe('LoginPage', () => {
  it('shows an auth failure and allows another attempt', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    render(
      <DesignSystemProvider>
        <LoginPage
          errorMessage="Google 공급자 연결 실패"
          isLoading={false}
          onBack={vi.fn()}
          onLogin={onLogin}
        />
      </DesignSystemProvider>
    );

    expect(screen.getByRole('alert').textContent).toContain(
      'Google 공급자 연결 실패'
    );

    await user.click(screen.getByRole('button', { name: 'Google로 시작하기' }));

    expect(onLogin).toHaveBeenCalledOnce();
  });

  it('prevents duplicate login attempts while OAuth is starting', () => {
    render(
      <DesignSystemProvider>
        <LoginPage isLoading onBack={vi.fn()} onLogin={vi.fn()} />
      </DesignSystemProvider>
    );

    const button = screen.getByRole('button', {
      name: 'Google 로그인 연결 중',
    }) as HTMLButtonElement;

    expect(button.disabled).toBe(true);
  });
});
