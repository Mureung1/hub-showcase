import type { ReactNode } from 'react';
import { BottomNavigation, BottomNavigationItem } from '@wanteddev/wds';

import './navigation_bar.css';

export type NavigationItem<TValue extends string> = {
  icon: ReactNode;
  label: string;
  value: TValue;
};

export type NavigationBarProps<TValue extends string> = {
  items: readonly NavigationItem<TValue>[];
  onValueChange: (value: TValue) => void;
  value: TValue;
};

export function NavigationBar<TValue extends string>({
  items,
  onValueChange,
  value,
}: NavigationBarProps<TValue>) {
  return (
    <BottomNavigation
      aria-label="주요 화면"
      className="navigation-bar"
      onValueChange={(nextValue) => onValueChange(nextValue as TValue)}
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
