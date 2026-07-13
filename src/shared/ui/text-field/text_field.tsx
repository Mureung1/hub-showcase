import { forwardRef, type ComponentProps } from 'react';
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
