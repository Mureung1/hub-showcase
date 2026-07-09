/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@wanteddev/wds';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { App } from './index';

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

function renderApp() {
  return render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}

describe('App public API', () => {
  it('exports the root app component from the app layer', () => {
    expect(App).toBeTypeOf('function');
  });
});

describe('App onboarding flow', () => {
  it('shows service onboarding before the workspace', () => {
    renderApp();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: '서비스 경험하기' })).not.toBeNull();
    expect(screen.queryByRole('heading', { name: '홈' })).toBeNull();
  });

  it('moves from onboarding to login, then into the workspace', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('button', { name: '서비스 경험하기' }));

    expect(screen.getByRole('heading', { name: '환영합니다!' })).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Google로 시작하기' })).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Google로 시작하기' }));

    expect(screen.getByRole('heading', { name: '홈' })).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '지금 필요한 인사이트를 다시 꺼내보세요',
      })
    ).not.toBeNull();
  });
});
