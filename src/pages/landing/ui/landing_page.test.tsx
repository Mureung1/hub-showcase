/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { LandingPage } from '@/pages/landing';
import { DesignSystemProvider } from '@/shared/ui';

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

function renderLandingPage(onStart = vi.fn()) {
  render(
    <DesignSystemProvider>
      <LandingPage onStart={onStart} />
    </DesignSystemProvider>
  );

  return onStart;
}

describe('LandingPage', () => {
  it('explains the service before login', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '저장은 빠르게, 정리는 나중에',
      })
    ).not.toBeNull();
  });

  it('starts the login entry from either CTA', async () => {
    const user = userEvent.setup();
    const onStart = renderLandingPage();

    await user.click(
      screen.getAllByRole('button', { name: '서비스 경험하기' })[0]
    );

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('uses the archive index structure to explain the journey', () => {
    renderLandingPage();

    expect(screen.getByText('ARCHIVE 001')).not.toBeNull();
    expect(screen.getByText('01 문제')).not.toBeNull();
    expect(screen.getByText('02 저장')).not.toBeNull();
    expect(screen.getByText('03 꺼내보기')).not.toBeNull();
    expect(
      screen.getByText('기억에는 온기를, 다시 찾는 과정에는 질서를.')
    ).not.toBeNull();
  });
});
