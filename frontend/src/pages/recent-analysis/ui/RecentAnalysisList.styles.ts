import styled from '@emotion/styled'

import type { AnalysisCategory } from '../model/types'

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
  align-items: flex-start;
  gap: ${({ theme }) => theme.space[3]};
  width: 100%;
  padding: ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[5]};
  border-top: 1px solid ${({ theme }) => theme.components.listRow.divider};

  &:first-of-type {
    border-top: none;
  }
`

const categoryColor = (theme: import('@emotion/react').Theme, category: AnalysisCategory) => {
  if (category === 'stock') return { background: theme.colors.ai.completeWeak, color: theme.colors.ai.complete }
  if (category === 'market') return { background: theme.colors.ai.primaryWeak, color: theme.colors.ai.primary }
  if (category === 'risk') return { background: theme.colors.status.dangerWeak, color: theme.colors.status.danger }
  return { background: theme.colors.fill.neutral, color: theme.colors.text.tertiary }
}

export const CategoryBadge = styled.span<{ category: AnalysisCategory }>`
  display: inline-flex;
  align-items: center;
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.xs};
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  font-size: 11px;
  white-space: nowrap;
  background: ${({ theme, category }) => categoryColor(theme, category).background};
  color: ${({ theme, category }) => categoryColor(theme, category).color};
`

export const ItemBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[1]};
  flex: 1;
  min-width: 0;
`

export const ItemTitle = styled.p`
  ${({ theme }) => theme.typography.bodySmall};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
`

export const ItemDescription = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`

export const ItemTime = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
  white-space: nowrap;
`
