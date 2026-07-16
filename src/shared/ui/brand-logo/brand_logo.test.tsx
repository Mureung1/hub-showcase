/* @vitest-environment jsdom */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BrandLogo } from './brand_logo';

describe('BrandLogo', () => {
  it('renders the Figma bookmark mark with design token colors', () => {
    const { container } = render(<BrandLogo className="test-brand-logo" />);
    const logo = container.querySelector('svg.test-brand-logo');

    expect(logo?.getAttribute('aria-hidden')).toBe('true');
    expect(logo?.getAttribute('focusable')).toBe('false');
    expect(logo?.getAttribute('viewBox')).toBe('0 0 320 320');
    expect(
      [...(logo?.querySelectorAll('path') ?? [])].map((path) =>
        path.getAttribute('fill')
      )
    ).toEqual(['var(--color-electric-blue)', 'var(--color-amber)']);
  });
});
