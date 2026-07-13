/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  SearchFieldProps,
  TextAreaProps,
  TextFieldProps,
} from './text_field';

const textFieldSource = readFileSync(
  new URL('./text_field.tsx', import.meta.url),
  'utf8'
);
const textFieldStyles = readFileSync(
  new URL('./text_field.css', import.meta.url),
  'utf8'
);
const implementationProps = [
  'lg',
  'md',
  'ref',
  'sm',
  'sx',
  'wrapperRef',
  'xl',
  'xs',
] as const;

describe('field product props', () => {
  it('keeps implementation props out of every public field contract', () => {
    implementationProps.forEach((property) => {
      expectTypeOf<TextFieldProps>().not.toHaveProperty(property);
      expectTypeOf<SearchFieldProps>().not.toHaveProperty(property);
      expectTypeOf<TextAreaProps>().not.toHaveProperty(property);
    });
  });

  it('preserves controlled, event, accessibility, and status props', () => {
    expectTypeOf<TextFieldProps>().toHaveProperty('value');
    expectTypeOf<TextFieldProps>().toHaveProperty('onChange');
    expectTypeOf<TextFieldProps>().toHaveProperty('aria-label');
    expectTypeOf<TextFieldProps>().toHaveProperty('aria-describedby');
    expectTypeOf<TextFieldProps>().toHaveProperty('invalid');
    expectTypeOf<TextFieldProps>().toHaveProperty('positive');

    expectTypeOf<SearchFieldProps>().toHaveProperty('value');
    expectTypeOf<SearchFieldProps>().toHaveProperty('onChange');
    expectTypeOf<SearchFieldProps>().toHaveProperty('aria-label');
    expectTypeOf<SearchFieldProps>().toHaveProperty('aria-describedby');
    expectTypeOf<SearchFieldProps>().toHaveProperty('aria-invalid');

    expectTypeOf<TextAreaProps>().toHaveProperty('value');
    expectTypeOf<TextAreaProps>().toHaveProperty('onChange');
    expectTypeOf<TextAreaProps>().toHaveProperty('aria-label');
    expectTypeOf<TextAreaProps>().toHaveProperty('aria-describedby');
    expectTypeOf<TextAreaProps>().toHaveProperty('invalid');
  });
});

describe('field implementation contract', () => {
  it('uses named root-ref adapters for all field variants', () => {
    expect(textFieldSource).toMatch(
      /export const TextField = forwardRef<HTMLInputElement, TextFieldProps>\(\s*function TextField\(/s
    );
    expect(textFieldSource).toMatch(
      /export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>\(\s*function SearchField\(/s
    );
    expect(textFieldSource).toMatch(
      /export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>\(\s*function TextArea\(/s
    );
  });

  it('shows the invalid border and focus ring at the same time', () => {
    expect(textFieldStyles).toMatch(
      /div\.ui-field\[wds-component='text-field'\]:has\(\s*input\[aria-invalid='true'\]\s*\):focus-within\s+\[data-role='text-field-wrapper'\],\s*div\.ui-field\[wds-component='text-area'\]:has\(\s*textarea\[aria-invalid='true'\]\s*\):focus-within\s*\{[^}]*box-shadow:\s*inset 0 0 0 1px var\(--color-error-ink\),\s*0 0 0 2px var\(--color-electric-blue\);[^}]*\}/s
    );
  });
});
