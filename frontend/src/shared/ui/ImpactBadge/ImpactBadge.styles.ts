import styled from '@emotion/styled'

import type { ImpactLevel } from './ImpactBadge'

const impactColor = (theme: import('@emotion/react').Theme, impact: ImpactLevel) => {
  if (impact === 'high') return { background: theme.colors.status.dangerWeak, color: theme.colors.status.danger }
  if (impact === 'medium') return { background: theme.colors.status.warningWeak, color: theme.colors.status.warning }
  return { background: theme.colors.fill.neutral, color: theme.colors.text.placeholder }
}

export const StyledImpactBadge = styled.span<{ impact: ImpactLevel }>`
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  padding: ${({ theme }) => theme.space[1]} ${({ theme }) => theme.space[2]};
  border-radius: ${({ theme }) => theme.radius.xs};
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  font-size: 11px;
  white-space: nowrap;
  background: ${({ theme, impact }) => impactColor(theme, impact).background};
  color: ${({ theme, impact }) => impactColor(theme, impact).color};
`
