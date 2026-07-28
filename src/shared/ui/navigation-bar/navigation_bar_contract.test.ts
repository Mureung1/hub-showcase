/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type { NavigationBarProps } from './navigation_bar';

const contractItems = [
  { icon: null, label: '홈', value: 'home' },
  { icon: null, label: '보관함', value: 'library' },
] as const;

type ContractProps = NavigationBarProps<typeof contractItems>;

const invalidValueProps: ContractProps = {
  items: contractItems,
  onValueChange: () => undefined,
  // @ts-expect-error value must be one of the values declared by items.
  value: 'settings',
};

void invalidValueProps;

const navigationBarStyles = readFileSync(
  new URL('./navigation_bar.css', import.meta.url),
  'utf8'
);

describe('NavigationBar type contract', () => {
  it('derives the controlled value and callback union from items', () => {
    expectTypeOf<ContractProps['value']>().toEqualTypeOf<'home' | 'library'>();
    expectTypeOf<Parameters<ContractProps['onValueChange']>[0]>().toEqualTypeOf<
      'home' | 'library'
    >();
  });

  it('uses the header flow from 768px and a fixed bottom bar below it', () => {
    expect(navigationBarStyles).toMatch(
      /@media \(min-width:\s*768px\)\s*\{[\s\S]*?div\.navigation-bar--responsive[\s\S]*?position:\s*static;[\s\S]*?width:\s*auto;/
    );
    expect(navigationBarStyles).toMatch(
      /@media \(max-width:\s*767px\)\s*\{[\s\S]*?div\.navigation-bar--responsive[\s\S]*?position:\s*fixed;[\s\S]*?bottom:\s*max\(var\(--spacing-3\),\s*env\(safe-area-inset-bottom,\s*0px\)\);/
    );
  });
});
