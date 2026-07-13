/* @vitest-environment jsdom */
import type { ComponentPropsWithoutRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ButtonHierarchy } from './button';
import { Button } from './button';

type AppearanceProbeProps = ComponentPropsWithoutRef<'button'> & {
  color: string;
  variant: string;
};

vi.mock('@wanteddev/wds', () => ({
  Button: ({ children, className, color, variant }: AppearanceProbeProps) => (
    <button
      className={className}
      data-color={color}
      data-variant={variant}
      type="button"
    >
      {children}
    </button>
  ),
}));

afterEach(cleanup);

const hierarchyCases = [
  {
    color: 'primary',
    expectedClass: 'ui-button--secondary',
    hierarchy: undefined,
    label: 'default',
    variant: 'outlined',
  },
  {
    color: 'assistive',
    expectedClass: 'ui-button--ghost',
    hierarchy: 'ghost',
    label: 'ghost',
    variant: 'outlined',
  },
  {
    color: 'primary',
    expectedClass: 'ui-button--primary',
    hierarchy: 'primary',
    label: 'primary',
    variant: 'solid',
  },
  {
    color: 'primary',
    expectedClass: 'ui-button--secondary',
    hierarchy: 'secondary',
    label: 'secondary',
    variant: 'outlined',
  },
] satisfies Array<{
  color: string;
  expectedClass: string;
  hierarchy: ButtonHierarchy | undefined;
  label: string;
  variant: string;
}>;

describe('Button hierarchy mapping', () => {
  it.each(hierarchyCases)(
    'maps $label to the product class and internal appearance',
    ({ color, expectedClass, hierarchy, variant }) => {
      render(<Button hierarchy={hierarchy}>계속하기</Button>);

      const button = screen.getByRole('button', { name: '계속하기' });

      expect(button.classList.contains(expectedClass)).toBe(true);
      expect(button.getAttribute('data-color')).toBe(color);
      expect(button.getAttribute('data-variant')).toBe(variant);
    }
  );
});
