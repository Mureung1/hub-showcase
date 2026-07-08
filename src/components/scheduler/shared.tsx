import type { CSSProperties } from 'react'
import type { GroupTone } from './types'

export function PixelAvatar({ color, eyes }: { color: string; eyes: 1 | 2 }) {
  return (
    <span className="scheduler-avatar" style={{ '--avatar': color } as CSSProperties} aria-hidden="true">
      <i className={eyes === 1 ? 'one-eye' : ''} />
      {eyes === 2 && <i />}
    </span>
  )
}

export function CategoryIcon({ tone }: { tone: GroupTone }) {
  return (
    <span className={`category-filter-icon ${tone}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  )
}
