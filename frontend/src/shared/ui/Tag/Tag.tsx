import type { HTMLAttributes } from 'react'

import { StyledTag } from './Tag.styles'

type TagProps = HTMLAttributes<HTMLSpanElement>

export const Tag = (props: TagProps) => <StyledTag {...props} />
