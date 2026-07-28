/* @vitest-environment jsdom */
import { afterEach, describe, expect, it } from 'vitest';

import {
  applyDesignTokens,
  createDesignTokenEntries,
} from './apply_design_tokens';

const expectedDesignTokenVariables = {
  '--category-amber-1': '#FEF3C7',
  '--category-amber-2': '#F59E0B',
  '--category-amber-3': '#B45309',
  '--category-blue-1': '#DBEAFE',
  '--category-blue-2': '#3B82F6',
  '--category-blue-3': '#1D4ED8',
  '--category-coral-1': '#FEE2E2',
  '--category-coral-2': '#F04438',
  '--category-coral-3': '#B42318',
  '--category-green-1': '#DCFCE7',
  '--category-green-2': '#16A34A',
  '--category-green-3': '#166534',
  '--category-indigo-1': '#E0E7FF',
  '--category-indigo-2': '#4F46E5',
  '--category-indigo-3': '#4338CA',
  '--category-slate-1': '#F1F5F9',
  '--category-slate-2': '#64748B',
  '--category-slate-3': '#334155',
  '--category-teal-1': '#CCFBF1',
  '--category-teal-2': '#0D9488',
  '--category-teal-3': '#115E59',
  '--category-violet-1': '#EDE9FE',
  '--category-violet-2': '#7C3AED',
  '--category-violet-3': '#6D28D9',
  '--color-amber': '#F59E0B',
  '--color-ash': '#E1E2E5',
  '--color-canvas': '#FFFFFF',
  '--color-charcoal': '#25272D',
  '--color-coral': '#F04438',
  '--color-electric-blue': '#0560FD',
  '--color-error-ink': '#D92D20',
  '--color-fog': '#C8CAD0',
  '--color-graphite': '#363940',
  '--color-ink': '#151619',
  '--color-library-coral': '#C94032',
  '--color-light-blue': '#3A8DFF',
  '--color-mist': '#F3F3F5',
  '--color-pale-blue': '#C3D9FF',
  '--color-paper': '#F4F1E9',
  '--color-pewter': '#B0B3BB',
  '--color-retrieve-blue': '#1358D8',
  '--color-save-green': '#08765B',
  '--color-signal-green': '#047857',
  '--color-smoke': '#667085',
  '--color-surface': '#FFFDF8',
  '--gradient-electric-blue':
    'linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)',
  '--layout-content-width': '1200px',
  '--layout-section-gap-desktop': '80px',
  '--layout-section-gap-mobile': '48px',
  '--layout-section-gap-tablet': '64px',
  '--motion-duration-fast': '150ms',
  '--motion-duration-standard': '200ms',
  '--motion-easing-standard': 'ease-out',
  '--radius-button': '8px',
  '--radius-card': '16px',
  '--radius-input': '12px',
  '--radius-label': '0.16em',
  '--spacing-1': '4px',
  '--spacing-2': '8px',
  '--spacing-3': '12px',
  '--spacing-4': '16px',
  '--spacing-5': '20px',
  '--spacing-6': '24px',
  '--spacing-8': '32px',
  '--spacing-10': '40px',
  '--spacing-12': '48px',
  '--spacing-16': '64px',
  '--spacing-20': '80px',
  '--typography-body-line-height': '26px',
  '--typography-body-size': '16px',
  '--typography-card-title-line-height': '24px',
  '--typography-card-title-size': '17px',
  '--typography-font-family':
    "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  '--typography-hero-line-height': '0.98',
  '--typography-hero-size': 'clamp(48px, 6vw, 80px)',
  '--typography-label-line-height': '20px',
  '--typography-label-size': '14px',
  '--typography-meta-line-height': '18px',
  '--typography-meta-size': '13px',
  '--typography-screen-title-line-height': '40px',
  '--typography-screen-title-size': '32px',
  '--typography-section-title-line-height': '32px',
  '--typography-section-title-size': '24px',
} as const;

afterEach(() => {
  Object.keys(expectedDesignTokenVariables).forEach((propertyName) => {
    document.documentElement.style.removeProperty(propertyName);
  });
});

describe('createDesignTokenEntries', () => {
  it('flattens all eight token groups into 83 unique CSS variables', () => {
    const entries = createDesignTokenEntries();

    expect(entries).toHaveLength(83);
    expect(new Set(entries.map(([name]) => name)).size).toBe(83);
    expect(Object.fromEntries(entries)).toEqual(expectedDesignTokenVariables);
  });
});

describe('applyDesignTokens', () => {
  it('writes design tokens to a custom root element', () => {
    const customRoot = document.createElement('div');

    applyDesignTokens(customRoot);

    expect(customRoot.style.getPropertyValue('--color-canvas')).toBe('#FFFFFF');
    expect(customRoot.style.getPropertyValue('--color-paper')).toBe('#F4F1E9');
    expect(customRoot.style.getPropertyValue('--color-surface')).toBe(
      '#FFFDF8'
    );
    expect(customRoot.style.getPropertyValue('--radius-card')).toBe('16px');
  });

  it('writes design tokens to the document root by default', () => {
    applyDesignTokens();

    expect(
      document.documentElement.style.getPropertyValue('--color-canvas')
    ).toBe('#FFFFFF');
    expect(
      document.documentElement.style.getPropertyValue(
        '--gradient-electric-blue'
      )
    ).toBe('linear-gradient(90deg, #0560FD 0%, #3A8DFF 50%, #C3D9FF 100%)');
    expect(
      document.documentElement.style.getPropertyValue(
        '--typography-section-title-line-height'
      )
    ).toBe('32px');
  });
});
