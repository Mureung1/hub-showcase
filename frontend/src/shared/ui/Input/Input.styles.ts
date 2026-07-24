import styled from '@emotion/styled'

export const InputWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  height: ${({ theme }) => theme.components.input.height.medium};
  padding: ${({ theme }) => theme.components.input.padding};
  background: ${({ theme }) => theme.components.input.background};
  border: 1px solid ${({ theme }) => theme.components.input.border};
  border-radius: ${({ theme }) => theme.components.input.radius};
  transition: border-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  &:focus-within {
    border-color: ${({ theme }) => theme.components.input.focusBorder};
  }
`

export const LeadingIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: ${({ theme }) => theme.colors.icon.tertiary};
`

export const StyledInput = styled.input`
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  outline: none;
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.primary};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.placeholder};
  }
`
