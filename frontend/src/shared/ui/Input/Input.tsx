import type { InputHTMLAttributes, ReactNode } from 'react'

import { InputWrapper, LeadingIcon, StyledInput } from './Input.styles'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leadingIcon?: ReactNode
}

export const Input = ({ leadingIcon, className, ...rest }: InputProps) => (
  <InputWrapper className={className}>
    {leadingIcon && <LeadingIcon>{leadingIcon}</LeadingIcon>}
    <StyledInput {...rest} />
  </InputWrapper>
)
