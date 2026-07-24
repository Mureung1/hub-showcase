import styled from '@emotion/styled'

export const CardRoot = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  box-shadow: ${({ theme }) => theme.shadow.card};
  overflow: hidden;
`

export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
`

export const CardTitle = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const SectionLabel = styled.span`
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const NewsRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => theme.space[3]} ${({ theme }) => theme.space[5]};
  border-top: 1px solid ${({ theme }) => theme.components.listRow.divider};

  &:first-of-type {
    border-top: none;
  }
`

export const NewsTitle = styled.p`
  ${({ theme }) => theme.typography.labelMedium};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const NewsDescription = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`
