import styled from '@emotion/styled'

export const ChipRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
`

export const Chip = styled.button<{ isActive: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.space[2]} ${({ theme }) => theme.space[4]};
  border-radius: ${({ theme }) => theme.radius.sm};
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  white-space: nowrap;
  cursor: pointer;
  transition: background-color ${({ theme }) => theme.motion.duration.fast} ${({ theme }) => theme.motion.easing.standard};

  ${({ theme, isActive }) =>
    isActive
      ? `
        border: 1px solid ${theme.colors.fill.neutralStrong};
        background: ${theme.colors.fill.neutralStrong};
        color: ${theme.colors.text.inverse};
      `
      : `
        border: 1px solid ${theme.colors.border.default};
        background: ${theme.colors.background.elevated};
        color: ${theme.colors.text.tertiary};

        &:hover {
          background: ${theme.colors.fill.neutralHover};
        }
      `}
`
