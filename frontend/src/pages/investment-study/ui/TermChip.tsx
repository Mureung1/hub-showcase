import type { ButtonHTMLAttributes } from 'react'

import { StyledTermChip } from './TermChip.styles'

interface TermChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean
}

export const TermChip = ({ isActive = false, type = 'button', ...rest }: TermChipProps) => (
  <StyledTermChip isActive={isActive} type={type} {...rest} />
)
