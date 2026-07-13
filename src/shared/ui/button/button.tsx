import type { ComponentProps } from 'react';
import { Button as WdsButton } from '@wanteddev/wds';
import clsx from 'clsx';

import './button.css';

type WdsButtonProps = ComponentProps<typeof WdsButton>;
export type ButtonHierarchy = 'ghost' | 'primary' | 'secondary';
export type ButtonProps = Omit<WdsButtonProps, 'color' | 'variant'> & {
  hierarchy?: ButtonHierarchy;
};

const APPEARANCE_BY_HIERARCHY = {
  ghost: { color: 'assistive', variant: 'outlined' },
  primary: { color: 'primary', variant: 'solid' },
  secondary: { color: 'primary', variant: 'outlined' },
} as const;

export function Button({
  className,
  hierarchy = 'secondary',
  ...props
}: ButtonProps) {
  const appearance = APPEARANCE_BY_HIERARCHY[hierarchy];

  return (
    <WdsButton
      {...props}
      className={clsx('ui-button', `ui-button--${hierarchy}`, className)}
      color={appearance.color}
      variant={appearance.variant}
    />
  );
}
