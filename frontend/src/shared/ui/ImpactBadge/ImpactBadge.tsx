import type { HTMLAttributes } from 'react'

import { StyledImpactBadge } from './ImpactBadge.styles'

export type ImpactLevel = 'high' | 'medium' | 'low'

interface ImpactBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  impact: ImpactLevel
}

export const ImpactBadge = ({ impact, ...rest }: ImpactBadgeProps) => <StyledImpactBadge impact={impact} {...rest} />
