/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingPageStyles = readFileSync(
  new URL('./landing_page.css', import.meta.url),
  'utf8'
);

describe('landing page interaction contract', () => {
  it('keeps every header link at the minimum touch target height', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-brand\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-header nav a\s*\{[^}]*display:\s*inline-flex;[^}]*min-height:\s*44px;[^}]*align-items:\s*center;[^}]*\}/s
    );
  });
});
