import type { ReactNode } from 'react';
import {
  Option as WdsOption,
  OptionContent as WdsOptionContent,
  Select as WdsSelect,
} from '@wanteddev/wds';
import clsx from 'clsx';

import './select.css';

export type SelectOption = {
  disabled?: boolean;
  label: string;
  leadingContent?: ReactNode;
  value: string;
};

export type SelectProps = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  name?: string;
  onValueChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  renderValue?: (option: SelectOption) => ReactNode;
  value: string;
};

export function Select({
  className,
  onValueChange,
  options,
  renderValue,
  value,
  ...props
}: SelectProps) {
  return (
    <WdsSelect
      {...props}
      className={clsx('ui-select', className)}
      onChange={onValueChange}
      render={
        renderValue
          ? (_label, selectedValue) => {
              const selectedOption = options.find(
                (option) => option.value === selectedValue
              );

              return selectedOption
                ? renderValue(selectedOption)
                : selectedValue;
            }
          : undefined
      }
      value={value}
      width="100%"
    >
      {options.map((option) => (
        <WdsOption
          disabled={option.disabled}
          key={option.value}
          leadingContent={
            option.leadingContent ? (
              <WdsOptionContent variant="custom">
                {option.leadingContent}
              </WdsOptionContent>
            ) : undefined
          }
          value={option.value}
        >
          {option.label}
        </WdsOption>
      ))}
    </WdsSelect>
  );
}
