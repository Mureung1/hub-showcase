import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react';
import { Chip as WdsChip } from '@wanteddev/wds';
import clsx from 'clsx';

import './chip.css';

type NativeChoiceChipProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-pressed' | 'color'
>;

export type CategoryTone = 'amber' | 'blue' | 'coral' | 'green' | 'slate';

export type ChoiceChipProps = NativeChoiceChipProps & {
  leadingContent?: ReactNode;
  selected: boolean;
  size?: 'large' | 'medium' | 'small';
  trailingContent?: ReactNode;
};

const STATIC_TAG_PROPS = {
  'aria-disabled': undefined,
  role: undefined,
  type: undefined,
} as const;

export const ChoiceChip = forwardRef<HTMLButtonElement, ChoiceChipProps>(
  function ChoiceChip(
    { 'aria-disabled': ariaDisabled, className, disabled, selected, ...props },
    ref
  ) {
    const isDisabled =
      disabled || ariaDisabled === true || ariaDisabled === 'true';

    return (
      <WdsChip
        {...props}
        active={selected}
        aria-pressed={selected}
        className={clsx('choice-chip', className)}
        disabled={isDisabled}
        ref={ref}
        variant={selected ? 'solid' : 'outlined'}
      />
    );
  }
);

export function CategoryTag({
  children,
  tone,
}: {
  children: ReactNode;
  tone: CategoryTone;
}) {
  return (
    <WdsChip
      {...STATIC_TAG_PROPS}
      as="span"
      className={`category-tag category-tag--${tone}`}
      disableInteraction
      size="xsmall"
      variant="solid"
    >
      {children}
    </WdsChip>
  );
}
