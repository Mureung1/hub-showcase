import type { HTMLAttributes } from 'react'

import { SpinnerCircle, SpinnerRoot } from './Spinner.styles'

export type SpinnerSize = 'small' | 'medium' | 'large'

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  label?: string
  size?: SpinnerSize
}

export const Spinner = ({ label = 'Loading', size = 'medium', ...rest }: SpinnerProps) => (
  <SpinnerRoot role="status" aria-label={label} {...rest}>
    <SpinnerCircle size={size} />
  </SpinnerRoot>
)
