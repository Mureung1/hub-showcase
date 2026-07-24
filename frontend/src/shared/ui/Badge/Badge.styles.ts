import styled from '@emotion/styled'

import type { BadgeTone } from './Badge'

const toneStyles = (theme: import('@emotion/react').Theme, tone: BadgeTone) => {
  if (tone === 'rise') {
    return { background: theme.colors.market.riseWeak, color: theme.colors.market.rise }
  }

  if (tone === 'fall') {
    return { background: theme.colors.market.fallWeak, color: theme.colors.market.fall }
  }

  return { background: theme.colors.market.unchangedWeak, color: theme.colors.market.unchanged }
}

export const StyledBadge = styled.span<{ tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: ${({ theme }) => theme.components.badge.height};
  padding: ${({ theme }) => theme.components.badge.padding};
  border-radius: ${({ theme }) => theme.components.badge.radius};
  ${({ theme }) => theme.typography.caption};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  white-space: nowrap;
  background: ${({ theme, tone }) => toneStyles(theme, tone).background};
  color: ${({ theme, tone }) => toneStyles(theme, tone).color};
`
