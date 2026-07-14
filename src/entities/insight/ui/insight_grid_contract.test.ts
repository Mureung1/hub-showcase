/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const insightGridStyles = readFileSync(
  new URL('./insight_grid.css', import.meta.url),
  'utf8'
);

describe('InsightGrid source link contract', () => {
  it('distinguishes a visited source link with the smoke color token', () => {
    const visitedRule = insightGridStyles.match(
      /\.insight-card__source:visited\s*\{(?<declarations>[^}]*)\}/
    );

    expect(visitedRule?.groups?.declarations).toMatch(
      /color:\s*var\(--color-smoke\);/
    );
  });
});
