import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';

function relativeLuminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16) / 255);

  if (!channels || channels.length !== 3) {
    throw new Error(`Invalid hex color: ${hex}`);
  }

  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('designTokens', () => {
  it('keeps category colors in the approved palette order', () => {
    expect(Object.keys(designTokens.category)).toEqual([
      'slate-1',
      'slate-2',
      'slate-3',
      'blue-1',
      'blue-2',
      'blue-3',
      'indigo-1',
      'indigo-2',
      'indigo-3',
      'violet-1',
      'violet-2',
      'violet-3',
      'green-1',
      'green-2',
      'green-3',
      'teal-1',
      'teal-2',
      'teal-3',
      'amber-1',
      'amber-2',
      'amber-3',
      'coral-1',
      'coral-2',
      'coral-3',
    ]);
  });

  it('defines the complete approved token contract', () => {
    expect(designTokens.category).toEqual({
      'amber-1': '#FEF3C7',
      'amber-2': '#F59E0B',
      'amber-3': '#B45309',
      'blue-1': '#DBEAFE',
      'blue-2': '#3B82F6',
      'blue-3': '#1D4ED8',
      'coral-1': '#FEE2E2',
      'coral-2': '#F04438',
      'coral-3': '#B42318',
      'green-1': '#DCFCE7',
      'green-2': '#16A34A',
      'green-3': '#166534',
      'indigo-1': '#E0E7FF',
      'indigo-2': '#4F46E5',
      'indigo-3': '#4338CA',
      'slate-1': '#F1F5F9',
      'slate-2': '#64748B',
      'slate-3': '#334155',
      'teal-1': '#CCFBF1',
      'teal-2': '#0D9488',
      'teal-3': '#115E59',
      'violet-1': '#EDE9FE',
      'violet-2': '#7C3AED',
      'violet-3': '#6D28D9',
    });
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
      libraryCoral: '#C94032',
      lightBlue: '#3A8DFF',
      mist: '#F3F3F5',
      paleBlue: '#C3D9FF',
      paper: '#F4F1E9',
      pewter: '#B0B3BB',
      retrieveBlue: '#1358D8',
      saveGreen: '#08765B',
      signalGreen: '#047857',
      smoke: '#667085',
      surface: '#FFFDF8',
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

  it('keeps text readable on the approved page and screen backgrounds', () => {
    expect(
      contrastRatio(designTokens.color.smoke, designTokens.color.canvas)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(designTokens.color.signalGreen, designTokens.color.canvas)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(designTokens.color.ink, designTokens.color.paper)
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrastRatio(designTokens.color.ink, designTokens.color.surface)
    ).toBeGreaterThanOrEqual(4.5);

    for (const background of [
      designTokens.color.retrieveBlue,
      designTokens.color.libraryCoral,
      designTokens.color.saveGreen,
    ]) {
      expect(
        contrastRatio(designTokens.color.surface, background)
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
