/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { designTokens } from '@/shared/config/design-system';

const emptyStateStyles = readFileSync(
  new URL('./empty_state.css', import.meta.url),
  'utf8'
);

const descriptionColorToken = emptyStateStyles.match(
  /\.empty-state__description\s*\{[^}]*color:\s*var\(--color-(?<token>[a-z-]+)\);/s
)?.groups?.token;

function getColorTokenValue(name: string): string {
  const colorEntry = Object.entries(designTokens.color).find(
    ([tokenName]) =>
      tokenName.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`) ===
      name
  );

  if (!colorEntry) {
    throw new Error(`Unknown color token: ${name}`);
  }

  return colorEntry[1];
}

function toLinearChannel(channel: number): number {
  const normalizedChannel = channel / 255;

  return normalizedChannel <= 0.04045
    ? normalizedChannel / 12.92
    : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: string): number {
  const channels = color
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => toLinearChannel(Number.parseInt(channel, 16)));

  if (!channels || channels.length !== 3) {
    throw new Error(`Unsupported color: ${color}`);
  }

  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('EmptyState color contract', () => {
  it('uses the readable description token on the canvas', () => {
    expect(descriptionColorToken).toBe('graphite');

    const descriptionColor = getColorTokenValue(descriptionColorToken ?? '');

    expect(
      contrastRatio(descriptionColor, designTokens.color.canvas)
    ).toBeGreaterThanOrEqual(4.5);
  });
});
