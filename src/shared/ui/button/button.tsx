import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Button as WdsButton } from '@wanteddev/wds';
import clsx from 'clsx';

import './button.css';

type NativeButtonProps = Omit<ComponentPropsWithoutRef<'button'>, 'color'>;
export type ButtonHierarchy = 'ghost' | 'primary' | 'secondary';
export type ButtonProps = NativeButtonProps & {
  fullWidth?: boolean;
  hierarchy?: ButtonHierarchy;
  leadingContent?: ReactNode;
  loading?: boolean;
  size?: 'large' | 'medium' | 'small';
  trailingContent?: ReactNode;
};

const APPEARANCE_BY_HIERARCHY = {
  ghost: { color: 'assistive', variant: 'outlined' },
  primary: { color: 'primary', variant: 'solid' },
  secondary: { color: 'primary', variant: 'outlined' },
} as const;

export function Button({
  'aria-disabled': ariaDisabled,
  className,
  disabled,
  fullWidth,
  hierarchy = 'secondary',
  leadingContent,
  loading,
  size,
  trailingContent,
  ...props
}: ButtonProps) {
  const appearance = APPEARANCE_BY_HIERARCHY[hierarchy];
  const isDisabled =
    disabled || ariaDisabled === true || ariaDisabled === 'true';

  return (
    <WdsButton
      {...props}
      className={clsx('ui-button', `ui-button--${hierarchy}`, className)}
      color={appearance.color}
      disabled={isDisabled}
      fullWidth={fullWidth}
      leadingContent={leadingContent}
      loading={loading}
      size={size}
      trailingContent={trailingContent}
      variant={appearance.variant}
    />
  );
}
