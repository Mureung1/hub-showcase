/* @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { InlineLabel } from './inline_label';

afterEach(cleanup);

describe('InlineLabel', () => {
  it('hides decorative emoji while keeping label text readable', () => {
    const { container } = render(
      <InlineLabel emoji="🔖" tone="blue">
        링크
      </InlineLabel>
    );

    const label = screen.getByText('링크');
    const emoji = container.querySelector('[aria-hidden="true"]');

    expect(label.classList.contains('inline-label--blue')).toBe(true);
    expect(emoji?.textContent).toBe('🔖');
  });
});
