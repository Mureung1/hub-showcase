import styled from '@emotion/styled'

import type { ButtonVariant } from './Button'

export const StyledButton = styled.button<{ variant: ButtonVariant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space[2]};
  height: ${({ theme }) => theme.components.button.height.medium};
  padding: ${({ theme }) => theme.components.button.padding.medium};
  border: none;
  border-radius: ${({ theme }) => theme.components.button.radius};
  ${({ theme }) => theme.typography.labelMedium};
  white-space: nowrap;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${({ theme, variant }) => {
    if (variant === 'brand') {
      return `
        background: ${theme.colors.fill.brand};
        color: ${theme.colors.text.inverse};

        &:hover:not(:disabled) {
          background: ${theme.colors.fill.brandHover};
        }

        &:active:not(:disabled) {
          background: ${theme.colors.fill.brandPressed};
        }
      `
    }

    if (variant === 'outline') {
      return `
        background: ${theme.colors.background.elevated};
        color: ${theme.colors.text.tertiary};
        border: 1px solid ${theme.colors.border.default};

        &:hover:not(:disabled) {
          background: ${theme.colors.fill.neutralHover};
        }

        &:active:not(:disabled) {
          background: ${theme.colors.fill.neutralPressed};
        }
      `
    }

    return `
      background: ${theme.colors.fill.neutral};
      color: ${theme.colors.text.primary};

      &:hover:not(:disabled) {
        background: ${theme.colors.fill.neutralHover};
      }

      &:active:not(:disabled) {
        background: ${theme.colors.fill.neutralPressed};
      }
    `
  }}

  &:disabled {
    background: ${({ theme }) => theme.colors.fill.disabled};
    color: ${({ theme }) => theme.colors.text.disabled};
    cursor: not-allowed;
  }
`
