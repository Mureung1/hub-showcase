import type { HTMLAttributes } from 'react'

import { StyledBadge } from './Badge.styles'

export type BadgeTone = 'rise' | 'fall' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export const Badge = ({ tone = 'neutral', ...rest }: BadgeProps) => <StyledBadge tone={tone} {...rest} />
