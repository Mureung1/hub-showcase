import type { ReactionMeta } from './types'

export const weekLabels = ['일', '월', '화', '수', '목', '금', '토']

export const reactionMeta: ReactionMeta[] = [
  { key: 'sparkle', label: '반짝이는 눈', hint: '멋져', emoji: '✨' },
  { key: 'heart', label: '하트 눈', hint: '좋아', emoji: '😍' },
  { key: 'fire', label: '불타는 눈', hint: '열심히 했네', emoji: '🔥' },
  { key: 'tear', label: '눈물 눈', hint: '고생했어', emoji: '😢' },
  { key: 'wow', label: '놀란 눈', hint: '대단해', emoji: '😲' },
  { key: 'sleepy', label: '졸린 눈', hint: '나도 쉬고 싶다', emoji: '😴' },
]
