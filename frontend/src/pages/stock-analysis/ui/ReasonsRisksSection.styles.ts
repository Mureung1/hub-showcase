import styled from '@emotion/styled'

export const SectionGrid = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[5]};
  width: 100%;

  @media (max-width: ${({ theme }) => theme.breakpoint.tablet}) {
    flex-direction: column;
  }
`

export const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  flex: 1;
  min-width: 0;
`

export const ColumnTitle = styled.h3`
  ${({ theme }) => theme.typography.labelLarge};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const PointRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
`

export const PointOrder = styled.span`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text.placeholder};
  flex-shrink: 0;
  width: 22px;
`

export const PointTextGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 ${({ theme }) => theme.space[1]};
`

export const PointText = styled.span`
  ${({ theme }) => theme.typography.bodySmall};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const PointDescription = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`
