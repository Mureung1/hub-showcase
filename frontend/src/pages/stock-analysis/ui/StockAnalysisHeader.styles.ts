import styled from '@emotion/styled'

import type { MarketDirection } from '../model/types'

export const HeaderRoot = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
`

export const Topic = styled.p`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
`

export const StatsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[3]};
  padding-top: ${({ theme }) => theme.space[2]};
`

export const PriceGroup = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space[3]};
`

export const PriceColumn = styled.div`
  display: flex;
  flex-direction: column;
`

export const StockName = styled.p`
  ${({ theme }) => theme.typography.labelMedium};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text.tertiary};
`

export const Price = styled.p`
  ${({ theme }) => theme.typography.titleLarge};
  color: ${({ theme }) => theme.colors.text.primary};
`

const directionColor = (theme: import('@emotion/react').Theme, direction: MarketDirection) => {
  if (direction === 'rise') return theme.colors.market.rise
  if (direction === 'fall') return theme.colors.market.fall
  return theme.colors.market.unchanged
}

export const ChangeRate = styled.span<{ direction: MarketDirection }>`
  ${({ theme }) => theme.typography.bodySmall};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  color: ${({ theme, direction }) => directionColor(theme, direction)};
`

export const MetaText = styled.span`
  ${({ theme }) => theme.typography.caption};
  color: ${({ theme }) => theme.colors.text.placeholder};
  white-space: nowrap;
`
