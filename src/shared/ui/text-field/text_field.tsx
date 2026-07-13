import type { ComponentProps } from 'react';
import {
  SearchField as WdsSearchField,
  TextArea as WdsTextArea,
  TextField as WdsTextField,
} from '@wanteddev/wds';
import clsx from 'clsx';

import './text_field.css';

export type TextFieldProps = ComponentProps<typeof WdsTextField>;
export type SearchFieldProps = ComponentProps<typeof WdsSearchField>;
export type TextAreaProps = ComponentProps<typeof WdsTextArea>;

export function TextField({ className, ...props }: TextFieldProps) {
  return <WdsTextField {...props} className={clsx('ui-field', className)} />;
}

export function SearchField({ className, ...props }: SearchFieldProps) {
  return <WdsSearchField {...props} className={clsx('ui-field', className)} />;
}

export function TextArea({ className, ...props }: TextAreaProps) {
  return <WdsTextArea {...props} className={clsx('ui-field', className)} />;
}
