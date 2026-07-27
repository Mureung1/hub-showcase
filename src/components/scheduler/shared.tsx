import type { CSSProperties } from 'react'
import type { GroupTone } from './types'

export function PixelAvatar({ color, eyes }: { color: string; eyes: 1 | 2 | 3 }) {
  return (
    <span className="scheduler-avatar" style={{ '--avatar': color } as CSSProperties} aria-hidden="true">
      <i className={eyes === 1 ? 'one-eye' : ''} />
      {eyes !== 1 && <i />}
      {eyes === 3 && <i className="third-eye" />}
    </span>
  )
}

export const AVATAR_PALETTE = ['#a9c8ec', '#c7b7e7', '#a9cfbd', '#f2a58d', '#b8a6de', '#8fbdab', '#4a4a4a']

// 실제 유저에는 아바타 색상/눈 모양 데이터가 없어서, id를 해시해 고정 팔레트에서 결정적으로 골라 쓴다.
export function getAvatarProps(id: string): { color: string; eyes: 1 | 2 } {
  const hash = [...id].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return { color: AVATAR_PALETTE[hash % AVATAR_PALETTE.length], eyes: ((hash % 2) + 1) as 1 | 2 }
}

export function CategoryIcon({ tone }: { tone: GroupTone }) {
  return (
    <span className={`category-filter-icon ${tone}`} aria-hidden="true">
      <i /><i /><i /><i />
    </span>
  )
}
