import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { Chip as WdsChip } from '@wanteddev/wds';
import clsx from 'clsx';

import {
  categoryPalette,
  type CategoryColorKey,
} from '@/shared/config/design-system';

import './chip.css';

type NativeChoiceChipProps = Omit<
  ComponentPropsWithoutRef<'button'>,
  'aria-pressed' | 'color'
>;

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
  className,
  colorKey,
}: {
  children: ReactNode;
  className?: string;
  colorKey: CategoryColorKey;
}) {
  const palette = categoryPalette[colorKey];
  const style = {
    '--category-color': palette.cssVariable,
    '--category-foreground':
      palette.foreground === 'canvas'
        ? 'var(--color-canvas)'
        : 'var(--color-ink)',
  } as CSSProperties;

  return (
    <WdsChip
      {...STATIC_TAG_PROPS}
      as="span"
      className={clsx('category-tag', className)}
      disableInteraction
      size="xsmall"
      style={style}
      variant="solid"
    >
      {children}
    </WdsChip>
  );
}

export function NeutralTag({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <WdsChip
      {...STATIC_TAG_PROPS}
      as="span"
      className={clsx('neutral-tag', className)}
      disableInteraction
      size="xsmall"
      variant="solid"
    >
      {children}
    </WdsChip>
  );
}
