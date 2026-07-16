/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingPageStyles = readFileSync(
  new URL('./landing_page.css', import.meta.url),
  'utf8'
);

describe('landing page interaction contract', () => {
  it('keeps header navigation links at the minimum touch target size', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-brand\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-header nav a\s*\{[^}]*display:\s*inline-flex;[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;[^}]*align-items:\s*center;[^}]*\}/s
    );
  });

  it('sizes the Figma brand logo with spacing tokens', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-brand__mark\s*\{[^}]*display:\s*block;[^}]*width:\s*calc\(var\(--spacing-6\)\s*\+\s*var\(--spacing-1\)\);[^}]*height:\s*calc\(var\(--spacing-6\)\s*\+\s*var\(--spacing-1\)\);[^}]*\}/s
    );
    expect(landingPageStyles).not.toMatch(
      /\.landing-brand__mark\s*\{[^}]*background:/s
    );
  });

  it('uses a centered single-column hero without removed marketing blocks', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-hero__content\s*\{[^}]*display:\s*grid;[^}]*min-height:\s*calc\(100svh\s*-\s*72px\);[^}]*align-items:\s*center;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-hero__copy\s*\{[^}]*justify-items:\s*center;[^}]*text-align:\s*center;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-hero__copy \.inline-label\s*\{[^}]*max-width:\s*100%;[^}]*\}/s
    );
    expect(landingPageStyles).not.toContain('.hero-preview');
    expect(landingPageStyles).not.toContain('.landing-principle');
    expect(landingPageStyles).not.toContain('.landing-card-grid');
  });
});
