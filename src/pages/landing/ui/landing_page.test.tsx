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
  it('shows only the hero, save, retrieve, and final CTA story', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '링크를 저장하고',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '지금 하는 일로 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '아맞다로 시작해보세요',
      })
    ).not.toBeNull();

    expect(
      screen.queryByText(
        '흩어진 링크와 메모가 지금의 일에 다시 연결되는 개인 인사이트 보관함입니다.'
      )
    ).toBeNull();
    expect(
      screen.queryByText(
        '로그인 후 나만의 보관함과 꺼내보기를 사용할 수 있어요.'
      )
    ).toBeNull();
    expect(
      screen.queryByText('기억에는 온기를, 다시 찾는 과정에는 질서를.')
    ).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '저장해도 다시 찾기 어려웠던 이유',
      })
    ).toBeNull();
    expect(
      screen.queryByRole('heading', {
        name: '필요한 순간에 다시 꺼내는 방식',
      })
    ).toBeNull();
    expect(
      screen.queryByLabelText('상황에 맞게 다시 꺼낸 링크 예시')
    ).toBeNull();
  });

  it('starts the login entry from either CTA', async () => {
    const user = userEvent.setup();
    const onStart = renderLandingPage();

    await user.click(
      screen.getAllByRole('button', { name: '서비스 경험하기' })[0]
    );

    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows the brand and two bookmark highlights without decorative emoji', () => {
    renderLandingPage();

    const brandLink = screen.getByRole('link', {
      name: '아맞다 처음으로',
    });

    expect(brandLink).not.toBeNull();
    expect(brandLink.querySelector('svg.landing-brand__mark')).not.toBeNull();
    expect(brandLink.querySelector('span.landing-brand__mark')).toBeNull();

    const title = screen.getByRole('heading', {
      name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
    });
    const linkHighlight = within(title).getByText('링크');
    const retrieveHighlight = within(title).getByText('다시');

    expect(linkHighlight.classList.contains('inline-label--blue')).toBe(true);
    expect(retrieveHighlight.classList.contains('inline-label--amber')).toBe(
      true
    );
    expect(
      title.querySelector('.inline-label > [aria-hidden="true"]')
    ).toBeNull();
    expect(screen.getByRole('link', { name: '저장' })).not.toBeNull();
    expect(screen.getByRole('link', { name: '꺼내보기' })).not.toBeNull();
    expect(screen.queryByRole('link', { name: '문제' })).toBeNull();
  });
});
