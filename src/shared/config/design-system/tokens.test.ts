import { describe, expect, it } from 'vitest';

import { designTokens } from './tokens';

describe('designTokens', () => {
  it('defines the approved color palette', () => {
    expect(designTokens.color.canvas).toBe('#FFFFFF');
    expect(designTokens.color.ink).toBe('#151619');
    expect(designTokens.color.charcoal).toBe('#25272D');
    expect(designTokens.color.electricBlue).toBe('#0560FD');
    expect(designTokens.color.signalGreen).toBe('#059669');
  });

  it('defines component radii', () => {
    expect(designTokens.radius.button).toBe('8px');
    expect(designTokens.radius.input).toBe('12px');
    expect(designTokens.radius.card).toBe('16px');
  });

  it('defines the maximum content width', () => {
    expect(designTokens.layout.contentWidth).toBe('1200px');
  });
});
