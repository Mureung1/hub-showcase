/* @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import {
  applyDesignTokens,
  createDesignTokenEntries,
} from './apply_design_tokens';

describe('createDesignTokenEntries', () => {
  it('creates CSS custom property entries for every token group', () => {
    const entries = createDesignTokenEntries();

    expect(entries).toContainEqual(['--color-electric-blue', '#0560FD']);
    expect(entries).toContainEqual(['--motion-duration-standard', '200ms']);
    expect(entries).toContainEqual(['--layout-content-width', '1200px']);
  });
});

describe('applyDesignTokens', () => {
  it('writes design tokens to a custom root element', () => {
    const customRoot = document.createElement('div');

    applyDesignTokens(customRoot);

    expect(customRoot.style.getPropertyValue('--color-canvas')).toBe('#FFFFFF');
    expect(customRoot.style.getPropertyValue('--radius-card')).toBe('16px');
  });
});
