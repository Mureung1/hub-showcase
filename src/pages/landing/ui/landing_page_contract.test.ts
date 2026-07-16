/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const landingPageStyles = readFileSync(
  new URL('./landing_page.css', import.meta.url),
  'utf8'
);

describe('landing page interaction contract', () => {
  it('keeps the header, feature, and contact actions at the minimum touch target size', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-brand\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.feature-tab\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-login-action\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-contact__action\s*\{[^}]*min-height:\s*44px;[^}]*\}/s
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
      /\.landing-hero__copy \.inline-label\s*\{[^}]*max-width:\s*100%;[^}]*white-space:\s*nowrap;[^}]*\}/s
    );
    expect(landingPageStyles).not.toContain('box-decoration-break');
    expect(landingPageStyles).toMatch(
      /\.landing-header__inner\s*\{[^}]*justify-content:\s*space-between;[^}]*\}/s
    );
    expect(landingPageStyles).not.toContain('.hero-preview');
    expect(landingPageStyles).not.toContain('.landing-principle');
    expect(landingPageStyles).not.toContain('.landing-card-grid');
  });

  it('uses a three-column tab strip and one stable product stage', () => {
    expect(landingPageStyles).toMatch(
      /\.feature-tabs\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);[^}]*max-width:\s*720px;[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.feature-tab\[aria-selected='true'\]\s*\{[^}]*border-bottom:\s*2px solid var\(--color-electric-blue\);[^}]*color:\s*var\(--color-electric-blue\);[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.feature-panel\s*\{[^}]*min-height:\s*440px;[^}]*border:\s*1px solid var\(--color-ash\);[^}]*border-radius:\s*var\(--radius-card\);[^}]*\}/s
    );
    expect(landingPageStyles).not.toContain('.landing-header nav');
    expect(landingPageStyles).not.toContain('.landing-section');
    expect(landingPageStyles).not.toContain('.motion-chapter');
    expect(landingPageStyles).not.toContain('.save-example');
    expect(landingPageStyles).not.toContain('.motion-stage');
  });

  it('closes with a distinct brand-colored contact section', () => {
    expect(landingPageStyles).toMatch(
      /\.landing-contact\s*\{[^}]*overflow:\s*hidden;[^}]*background:\s*var\(--color-electric-blue\);[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-contact__bookmark\s*\{[^}]*clip-path:\s*polygon\([^}]*\);[^}]*\}/s
    );
    expect(landingPageStyles).toMatch(
      /\.landing-contact__action\s*\{[^}]*background:\s*var\(--color-canvas\);[^}]*color:\s*var\(--color-ink\);[^}]*\}/s
    );
    expect(landingPageStyles).not.toContain('.landing-page a');
    expect(landingPageStyles).not.toContain('.landing-final-cta');
    expect(landingPageStyles).toMatch(
      /@media \(max-width:\s*767px\)\s*\{[\s\S]*?\.landing-contact__bookmark--amber\s*\{[^}]*top:\s*-112px;[^}]*\}[\s\S]*?\.landing-contact__bookmark--pale-blue\s*\{[^}]*top:\s*-160px;[^}]*\}/s
    );
  });
});
