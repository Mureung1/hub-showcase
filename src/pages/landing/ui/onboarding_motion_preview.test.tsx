/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const gsapMocks = vi.hoisted(() => ({
  matchMedia: vi.fn(),
  registerPlugin: vi.fn(),
  timeline: vi.fn(),
}));

vi.mock('gsap', () => ({
  default: {
    matchMedia: gsapMocks.matchMedia,
    registerPlugin: gsapMocks.registerPlugin,
    timeline: gsapMocks.timeline,
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: {} }));
vi.mock('@gsap/react', () => ({
  useGSAP: (setup: () => void) => setup(),
}));

import { OnboardingMotionPreview } from './onboarding_motion_preview';

beforeEach(() => {
  gsapMocks.matchMedia.mockReset();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(cleanup);

describe('OnboardingMotionPreview', () => {
  it('keeps the final work pack visible without creating a timeline for reduced motion', () => {
    render(<OnboardingMotionPreview />);

    expect(screen.getByText('팀 프로젝트 앱 첫 화면 참고')).not.toBeNull();
    expect(screen.getByText('연결된 저장물 3개')).not.toBeNull();
    expect(gsapMocks.matchMedia).not.toHaveBeenCalled();
  });
});
