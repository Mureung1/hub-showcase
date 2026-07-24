/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { categoryPalette, designTokens } from '@/shared/config/design-system';

const chipSource = readFileSync(new URL('./chip.tsx', import.meta.url), 'utf8');
const chipStyles = readFileSync(new URL('./chip.css', import.meta.url), 'utf8');

describe('ChoiceChip implementation contract', () => {
  it('uses a named root-ref adapter', () => {
    expect(chipSource).toMatch(
      /export const ChoiceChip = forwardRef<HTMLButtonElement, ChoiceChipProps>\(\s*function ChoiceChip\(/s
    );
  });

  it('places product disabled colors after the selected state', () => {
    const selectedStateIndex = chipStyles.indexOf(
      "button.choice-chip[data-active='true']"
    );
    const disabledStateIndex = chipStyles.indexOf(
      'button.choice-chip:disabled,'
    );
    const disabledState = chipStyles.match(
      /button\.choice-chip:disabled,\s*button\.choice-chip\[aria-disabled='true'\]\s*\{(?<declarations>[^}]*)\}/s
    )?.groups?.declarations;

    expect(disabledStateIndex).toBeGreaterThan(selectedStateIndex);
    expect(disabledState).toMatch(
      /border-color: var\(--color-ash\);[^}]*background: var\(--color-mist\);[^}]*color: var\(--color-smoke\);/s
    );
  });

  it('connects category palette variables to the rendered tag colors', () => {
    const categoryTagStyles = chipStyles.match(
      /span\.category-tag\s*\{(?<declarations>[^}]*)\}/s
    )?.groups?.declarations;

    expect(chipSource).toContain("'--category-color': palette.cssVariable");
    expect(chipSource).toContain("'--category-foreground':");
    expect(categoryTagStyles).toMatch(
      /background: var\(--category-color\);[^}]*color: var\(--category-foreground\);/s
    );
  });

  it('keeps every category palette foreground at 4.5 to 1 or higher', () => {
    for (const palette of Object.values(categoryPalette)) {
      const foreground =
        palette.foreground === 'canvas'
          ? designTokens.color.canvas
          : designTokens.color.ink;

      expect(
        getContrastRatio(foreground, palette.color),
        `${palette.accessibleName} 대비`
      ).toBeGreaterThanOrEqual(4.5);
    }
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
