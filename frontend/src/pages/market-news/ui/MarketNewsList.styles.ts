import styled from '@emotion/styled'

export const ListRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  background: ${({ theme }) => theme.components.card.background};
  border: 1px solid ${({ theme }) => theme.components.card.border};
  border-radius: ${({ theme }) => theme.components.card.radius};
  overflow: hidden;
`

export const ItemRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  width: 100%;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
  border-top: 1px solid ${({ theme }) => theme.components.listRow.divider};

  &:first-of-type {
    border-top: none;
  }
`

export const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
`

export const ItemTitle = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`

export const ItemDescription = styled.p`
  ${({ theme }) => theme.typography.labelMedium};
  color: ${({ theme }) => theme.colors.text.tertiary};
`
