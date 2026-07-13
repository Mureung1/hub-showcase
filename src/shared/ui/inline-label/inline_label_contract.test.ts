/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { designTokens } from '@/shared/config/design-system';

const inlineLabelStyles = readFileSync(
  new URL('./inline_label.css', import.meta.url),
  'utf8'
);
const tones = ['amber', 'blue', 'coral', 'green'] as const;
const expectedForegroundVariables = {
  amber: '--color-ink',
  blue: '--color-canvas',
  coral: '--color-ink',
  green: '--color-ink',
} as const;
const colorByCssVariable = new Map(
  Object.entries(designTokens.color).map(([name, value]) => [
    `--color-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
    value,
  ])
);

describe('InlineLabel color contract', () => {
  it.each(tones)('%s tone has at least 4.5 to 1 text contrast', (tone) => {
    const baseDeclarations = getClassDeclarations('inline-label');
    const toneDeclarations = getClassDeclarations(`inline-label--${tone}`);
    const foregroundVariable =
      getColorVariable(toneDeclarations, 'color') ??
      getColorVariable(baseDeclarations, 'color');
    const backgroundVariable = getColorVariable(toneDeclarations, 'background');

    expect(
      getContrastRatio(
        getTokenValue(foregroundVariable),
        getTokenValue(backgroundVariable)
      )
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('uses canvas text only for blue and ink text for the other tones', () => {
    tones.forEach((tone) => {
      const declarations = getClassDeclarations(`inline-label--${tone}`);

      expect(getColorVariable(declarations, 'color')).toBe(
        expectedForegroundVariables[tone]
      );
    });
  });
});

function getClassDeclarations(className: string) {
  const match = inlineLabelStyles.match(
    new RegExp(`\\.${className}\\s*\\{(?<declarations>[^}]*)\\}`)
  );
  const declarations = match?.groups?.declarations;

  if (!declarations) {
    throw new Error(`Missing CSS class: ${className}`);
  }

  return declarations;
}

function getColorVariable(declarations: string, property: string) {
  const match = declarations.match(
    new RegExp(`${property}:\\s*var\\((--color-[^)]+)\\);`)
  );
  const variable = match?.[1];

  if (!variable) {
    return undefined;
  }

  return variable;
}

function getTokenValue(variable: string | undefined) {
  const value = variable ? colorByCssVariable.get(variable) : undefined;

  if (!value) {
    throw new Error(`Missing color token: ${variable ?? 'undefined'}`);
  }

  return value;
}

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
