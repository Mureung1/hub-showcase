import styled from '@emotion/styled'

export const StyledTag = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 0 ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ theme }) => theme.colors.fill.neutral};
  color: ${({ theme }) => theme.colors.text.placeholder};
  ${({ theme }) => theme.typography.caption};
  font-size: 12px;
  white-space: nowrap;
`
