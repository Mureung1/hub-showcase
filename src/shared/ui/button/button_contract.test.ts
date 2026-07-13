/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { designTokens } from '@/shared/config/design-system';

import type { ButtonProps } from './button';

const buttonStyles = readFileSync(
  new URL('./button.css', import.meta.url),
  'utf8'
);

describe('ButtonProps', () => {
  it('exposes native and product props without implementation props', () => {
    expectTypeOf<ButtonProps>().toHaveProperty('onClick');
    expectTypeOf<ButtonProps>().toHaveProperty('type');
    expectTypeOf<ButtonProps>().toHaveProperty('fullWidth');
    expectTypeOf<ButtonProps>().toHaveProperty('hierarchy');
    expectTypeOf<ButtonProps>().toHaveProperty('leadingContent');
    expectTypeOf<ButtonProps>().toHaveProperty('loading');
    expectTypeOf<ButtonProps>().toHaveProperty('size');
    expectTypeOf<ButtonProps>().toHaveProperty('trailingContent');

    expectTypeOf<ButtonProps>().not.toHaveProperty('as');
    expectTypeOf<ButtonProps>().not.toHaveProperty('color');
    expectTypeOf<ButtonProps>().not.toHaveProperty('disableInteraction');
    expectTypeOf<ButtonProps>().not.toHaveProperty(
      'disableLoadingPreventEvents'
    );
    expectTypeOf<ButtonProps>().not.toHaveProperty('iconOnly');
    expectTypeOf<ButtonProps>().not.toHaveProperty('lg');
    expectTypeOf<ButtonProps>().not.toHaveProperty('md');
    expectTypeOf<ButtonProps>().not.toHaveProperty('sm');
    expectTypeOf<ButtonProps>().not.toHaveProperty('sx');
    expectTypeOf<ButtonProps>().not.toHaveProperty('variant');
    expectTypeOf<ButtonProps>().not.toHaveProperty('xl');
    expectTypeOf<ButtonProps>().not.toHaveProperty('xs');
  });
});

describe('Button visual state contract', () => {
  it('uses cascade-safe token styles for focus and disabled states', () => {
    expect(buttonStyles).not.toContain('!important');
    expect(buttonStyles).toMatch(
      /button\.ui-button:focus-visible\s*{[^}]*outline: 2px solid var\(--color-electric-blue\);[^}]*box-shadow: 0 0 0 4px var\(--color-pale-blue\);[^}]*}/s
    );
    expect(buttonStyles).toMatch(
      /button\.ui-button:disabled,\s*button\.ui-button\[aria-disabled='true'\]\s*{[^}]*border-color: var\(--color-ash\);[^}]*background: var\(--color-mist\);[^}]*color: var\(--color-smoke\);[^}]*}/s
    );
  });

  it('gives ghost text at least 4.5 to 1 contrast on canvas', () => {
    expect(buttonStyles).toMatch(
      /button\.ui-button--ghost\s*{[^}]*color: var\(--color-graphite\);[^}]*}/s
    );
    expect(
      getContrastRatio(designTokens.color.graphite, designTokens.color.canvas)
    ).toBeGreaterThanOrEqual(4.5);
  });
});

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor: string) {
  const channels = hexColor.slice(1).match(/.{2}/g);

  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported color format: ${hexColor}`);
  }

  const [red, green, blue] = channels.map((channel) => {
    const normalized = Number.parseInt(channel, 16) / 255;

    return normalized <= 0.04045
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}
