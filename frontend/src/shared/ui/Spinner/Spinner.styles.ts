import { keyframes } from '@emotion/react'
import styled from '@emotion/styled'

import type { SpinnerSize } from './Spinner'

const SPINNER_SIZE: Record<SpinnerSize, string> = {
  small: '20px',
  medium: '28px',
  large: '40px',
}

const SPINNER_BORDER_WIDTH: Record<SpinnerSize, string> = {
  small: '2px',
  medium: '3px',
  large: '4px',
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

export const SpinnerRoot = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.colors.icon.brand};
`

export const SpinnerCircle = styled.span<{ size: SpinnerSize }>`
  display: block;
  width: ${({ size }) => SPINNER_SIZE[size]};
  aspect-ratio: 1;
  border: ${({ size }) => SPINNER_BORDER_WIDTH[size]} solid
    ${({ theme }) => theme.colors.fill.brandWeak};
  border-top-color: currentColor;
  border-radius: ${({ theme }) => theme.radius.round};
  animation: ${spin} 800ms linear infinite;
`
