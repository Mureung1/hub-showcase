/* @vitest-environment jsdom */
import { cleanup, render, screen, within } from '@testing-library/react';
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

  it('shows the brand and a static three-card preview', () => {
    renderLandingPage();

    const brandLink = screen.getByRole('link', {
      name: '아맞다 처음으로',
    });

    expect(brandLink).not.toBeNull();
    expect(brandLink.querySelector('svg.landing-brand__mark')).not.toBeNull();
    expect(brandLink.querySelector('span.landing-brand__mark')).toBeNull();

    const preview = screen.getByLabelText('상황에 맞게 다시 꺼낸 링크 예시');

    expect(
      within(preview).getByText('팀 프로젝트 앱 첫 화면 참고')
    ).not.toBeNull();
    expect(within(preview).getAllByRole('article')).toHaveLength(3);
    expect(
      screen.getByText('기억에는 온기를, 다시 찾는 과정에는 질서를.')
    ).not.toBeNull();
  });
});
