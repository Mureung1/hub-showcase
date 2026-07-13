import type { ReactNode } from 'react';
import { BottomNavigation, BottomNavigationItem } from '@wanteddev/wds';
import clsx from 'clsx';

import './navigation_bar.css';

export type NavigationItem<TValue extends string> = {
  icon: ReactNode;
  label: string;
  value: TValue;
};

type NavigationValue<TItems extends readonly NavigationItem<string>[]> =
  TItems[number]['value'];

export type NavigationBarProps<
  TItems extends readonly NavigationItem<string>[],
> = {
  className?: string;
  items: TItems;
  onValueChange: (value: NoInfer<NavigationValue<TItems>>) => void;
  value: NoInfer<NavigationValue<TItems>>;
};

export function NavigationBar<
  const TItems extends readonly NavigationItem<string>[],
>({ className, items, onValueChange, value }: NavigationBarProps<TItems>) {
  return (
    <BottomNavigation
      aria-label="주요 화면"
      className={clsx('navigation-bar', className)}
      onValueChange={(nextValue) =>
        onValueChange(nextValue as NavigationValue<TItems>)
      }
      role="navigation"
      value={value}
    >
      {items.map((item) => (
        <BottomNavigationItem
          className="navigation-bar__item"
          icon={item.icon}
          key={item.value}
          label={item.label}
          type="button"
          value={item.value}
        />
      ))}
    </BottomNavigation>
  );
}
