import { describe, expectTypeOf, it } from 'vitest';

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

describe('NavigationBar type contract', () => {
  it('derives the controlled value and callback union from items', () => {
    expectTypeOf<ContractProps['value']>().toEqualTypeOf<'home' | 'library'>();
    expectTypeOf<Parameters<ContractProps['onValueChange']>[0]>().toEqualTypeOf<
      'home' | 'library'
    >();
  });
});
