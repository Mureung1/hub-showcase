/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { OnboardingFeatureTabs } from './onboarding_feature_tabs';

afterEach(cleanup);

describe('OnboardingFeatureTabs', () => {
  it('starts with the save product scene selected', () => {
    render(<OnboardingFeatureTabs />);

    expect(
      screen.getByRole('heading', {
        name: '발견한 링크가 필요한 순간 다시 쓰이도록, 아맞다가 저장부터 꺼내보기까지 이어드려요.',
      })
    ).not.toBeNull();

    const tabs = screen.getAllByRole('tab');

    expect(tabs).toHaveLength(3);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      '01 저장',
      '02 분류',
      '03 꺼내보기',
    ]);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
    expect(screen.getByRole('tabpanel', { name: '01 저장' })).not.toBeNull();
    expect(screen.getByText('https://example.com/article')).not.toBeNull();
    expect(screen.getByText('저장 완료')).not.toBeNull();
  });

  it('switches the shared product stage by tab click', async () => {
    const user = userEvent.setup();

    render(<OnboardingFeatureTabs />);

    await user.click(screen.getByRole('tab', { name: '02 분류' }));

    expect(screen.getByRole('tabpanel', { name: '02 분류' })).not.toBeNull();
    expect(screen.getByText('카테고리')).not.toBeNull();
    expect(screen.getByText('디자인')).not.toBeNull();
    expect(screen.getByText('브랜드 랜딩 사례')).not.toBeNull();
    expect(screen.queryByText('보관함 검색')).toBeNull();

    await user.click(screen.getByRole('tab', { name: '03 꺼내보기' }));

    expect(
      screen.getByRole('tabpanel', { name: '03 꺼내보기' })
    ).not.toBeNull();
    expect(screen.getByText('포트폴리오 첫 화면 참고')).not.toBeNull();
    expect(screen.getByText('메모의 “첫 화면”과 연결')).not.toBeNull();
    expect(screen.getAllByText('원문 열기 ↗')).toHaveLength(2);
  });

  it('moves selection and focus with tab keyboard controls', async () => {
    const user = userEvent.setup();

    render(<OnboardingFeatureTabs />);

    const saveTab = screen.getByRole('tab', { name: '01 저장' });
    const categoryTab = screen.getByRole('tab', { name: '02 분류' });
    const retrieveTab = screen.getByRole('tab', { name: '03 꺼내보기' });

    saveTab.focus();
    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(categoryTab);
    expect(categoryTab.getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{End}');

    expect(document.activeElement).toBe(retrieveTab);
    expect(retrieveTab.getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(saveTab);
    expect(saveTab.getAttribute('aria-selected')).toBe('true');
  });
});
