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
  it('shows the hero, core feature tabs, and final contact story', () => {
    renderLandingPage();

    expect(
      screen.getByRole('heading', {
        name: '저장한 링크를 필요한 순간 다시 꺼내보세요',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '발견한 링크가 필요한 순간 다시 쓰이도록, 아맞다가 저장부터 꺼내보기까지 이어드려요.',
      })
    ).not.toBeNull();
    expect(
      screen.getByRole('heading', {
        name: '쓰다가 막히거나, 더 좋은 방법이 떠올랐나요?',
      })
    ).not.toBeNull();
    expect(
      screen.getByText(
        '버그와 개선 의견을 남겨주세요. 직접 확인하고 다음 개선에 반영할게요.'
      )
    ).not.toBeNull();
    const contactLink = screen.getByRole('link', {
      name: '문제·의견 남기기',
    });

    expect(contactLink.getAttribute('href')).toBe(
      'https://github.com/ppre1ude/hub/issues/new'
    );
    expect(contactLink.getAttribute('target')).toBe('_blank');
    expect(
      screen.queryByRole('heading', {
        name: '첫 링크를 저장하고, 필요한 순간 다시 꺼내 쓰세요',
      })
    ).toBeNull();

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
    expect(
      screen.getByRole('tablist', { name: '아맞다 핵심 기능' })
    ).not.toBeNull();
  });

  it('starts the login entry from the header and hero CTA', async () => {
    const user = userEvent.setup();
    const onStart = renderLandingPage();

    await user.click(screen.getByRole('button', { name: '로그인' }));
    await user.click(screen.getByRole('button', { name: '서비스 경험하기' }));

    expect(onStart).toHaveBeenCalledTimes(2);
  });

  it('shows the brand and two highlights with their inline emoji', () => {
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
    const linkHighlight = title.querySelector('.inline-label--blue');
    const retrieveHighlight = title.querySelector('.inline-label--amber');

    expect(linkHighlight?.textContent).toBe('🔖링크');
    expect(retrieveHighlight?.textContent).toBe('🪄다시');
    expect(
      title.querySelectorAll('.inline-label > [aria-hidden="true"]')
    ).toHaveLength(2);
    expect(
      screen.queryByRole('navigation', { name: '온보딩 섹션' })
    ).toBeNull();
  });
});
