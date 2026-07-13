import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';

describe('designTokens', () => {
  it('defines the complete approved token contract', () => {
    expect(designTokens.color).toEqual({
      amber: '#F59E0B',
      ash: '#E1E2E5',
      canvas: '#FFFFFF',
      charcoal: '#25272D',
      coral: '#F04438',
      electricBlue: '#0560FD',
      errorInk: '#D92D20',
      fog: '#C8CAD0',
      graphite: '#363940',
      ink: '#151619',
      lightBlue: '#3A8DFF',
      mist: '#F3F3F5',
      paleBlue: '#C3D9FF',
      pewter: '#B0B3BB',
      signalGreen: '#059669',
      smoke: '#7F8491',
    });
    expect(designTokens.gradient).toEqual({
      electricBlue:
        'linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)',
    });
    expect(designTokens.layout).toEqual({
      contentWidth: '1200px',
      sectionGapDesktop: '80px',
      sectionGapMobile: '48px',
      sectionGapTablet: '64px',
    });
    expect(designTokens.motion).toEqual({
      durationFast: '150ms',
      durationStandard: '200ms',
      easingStandard: 'ease-out',
    });
    expect(designTokens.radius).toEqual({
      button: '8px',
      card: '16px',
      input: '12px',
      label: '0.16em',
    });
    expect(designTokens.spacing).toEqual({
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      5: '20px',
      6: '24px',
      8: '32px',
      10: '40px',
      12: '48px',
      16: '64px',
      20: '80px',
    });
    expect(designTokens.typography).toEqual({
      bodyLineHeight: '26px',
      bodySize: '16px',
      cardTitleLineHeight: '24px',
      cardTitleSize: '17px',
      fontFamily:
        "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      heroLineHeight: '0.98',
      heroSize: 'clamp(48px, 6vw, 80px)',
      labelLineHeight: '20px',
      labelSize: '14px',
      metaLineHeight: '18px',
      metaSize: '13px',
      screenTitleLineHeight: '40px',
      screenTitleSize: '32px',
      sectionTitleLineHeight: '32px',
      sectionTitleSize: '24px',
    });
  });
});
