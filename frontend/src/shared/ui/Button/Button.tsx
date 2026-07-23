import type { ButtonHTMLAttributes } from 'react'

import { StyledButton } from './Button.styles'

export type ButtonVariant = 'brand' | 'neutral'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = ({ variant = 'brand', type = 'button', ...rest }: ButtonProps) => (
  <StyledButton variant={variant} type={type} {...rest} />
)
