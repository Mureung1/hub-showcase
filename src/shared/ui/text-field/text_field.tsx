import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ComponentProps,
  type MouseEvent,
} from 'react';
import {
  SearchField as WdsSearchField,
  TextArea as WdsTextArea,
  TextField as WdsTextField,
} from '@wanteddev/wds';
import clsx from 'clsx';

import './text_field.css';

type FieldImplementationProp =
  'lg' | 'md' | 'ref' | 'sm' | 'sx' | 'wrapperRef' | 'xl' | 'xs';

export type TextFieldProps = Omit<
  ComponentProps<typeof WdsTextField>,
  FieldImplementationProp
>;
export type SearchFieldProps = Omit<
  ComponentProps<typeof WdsSearchField>,
  FieldImplementationProp
>;
export type TextAreaProps = Omit<
  ComponentProps<typeof WdsTextArea>,
  FieldImplementationProp
>;
export type ClearableTextFieldProps = Omit<
  TextFieldProps,
  'defaultValue' | 'onReset' | 'trailingContent' | 'value'
> & {
  clearLabel: string;
  onClear: () => void;
  value: string;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField({ className, ...props }, ref) {
    return (
      <WdsTextField
        {...props}
        className={clsx('ui-field', className)}
        ref={ref}
      />
    );
  }
);

export const ClearableTextField = forwardRef<
  HTMLInputElement,
  ClearableTextFieldProps
>(function ClearableTextField(
  { className, clearLabel, onClear, value, ...props },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canClear = value.length > 0 && !props.disabled && !props.readOnly;

  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  function handleClear() {
    onClear();
    inputRef.current?.focus();
  }

  function preventClearButtonFocus(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <WdsTextField
      {...props}
      className={clsx('ui-field', 'ui-field--clearable', className)}
      ref={inputRef}
      trailingContent={
        canClear ? (
          <button
            aria-label={clearLabel}
            className="ui-field__clear"
            onClick={handleClear}
            onMouseDown={preventClearButtonFocus}
            type="button"
          >
            ×
          </button>
        ) : undefined
      }
      value={value}
    />
  );
});

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField({ className, ...props }, ref) {
    return (
      <WdsSearchField
        {...props}
        className={clsx('ui-field', className)}
        ref={ref}
      />
    );
  }
);

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ className, ...props }, ref) {
    return (
      <WdsTextArea
        {...props}
        className={clsx('ui-field', className)}
        ref={ref}
      />
    );
  }
);
