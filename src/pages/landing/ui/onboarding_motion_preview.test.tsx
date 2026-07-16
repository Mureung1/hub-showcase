/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { OnboardingMotionPreview } from './onboarding_motion_preview';

afterEach(cleanup);

describe('OnboardingMotionPreview', () => {
  it('shows the static retrieve flow without motion instructions or helper copy', () => {
    render(<OnboardingMotionPreview />);

    expect(
      screen.getByRole('heading', { name: '지금 하는 일로 꺼내보세요' })
    ).not.toBeNull();
    expect(screen.getByText('포트폴리오 첫 화면 참고')).not.toBeNull();
    expect(screen.getByText('모바일 온보딩 흐름')).not.toBeNull();
    expect(screen.getByText('메모의 “첫 화면”과 연결')).not.toBeNull();
    expect(screen.getAllByText('원문 열기 ↗')).toHaveLength(2);
    expect(screen.queryByText('PINNED CHAPTER')).toBeNull();
    expect(screen.queryByText('SCROLL TO CONNECT')).toBeNull();
    expect(
      screen.queryByText(
        '지금 하는 일을 적으면 저장해둔 링크와 메모가 현재 상황에 가까운 작업팩으로 다시 모입니다.'
      )
    ).toBeNull();
  });
});
