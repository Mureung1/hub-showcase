import type { Friend, FriendPost, ReactionMeta } from './types'

export const friends: Friend[] = [
  { id: 'min', name: '민수', color: '#a9c8ec', eyes: 1 },
  { id: 'yu', name: '유진', color: '#c7b7e7', eyes: 2 },
  { id: 'study', name: '스터디 멤버', color: '#a9cfbd', eyes: 2 },
]

export const weekLabels = ['일', '월', '화', '수', '목', '금', '토']

export const reactionMeta: ReactionMeta[] = [
  { key: 'sparkle', label: '반짝이는 눈', hint: '멋져', emoji: '✨' },
  { key: 'heart', label: '하트 눈', hint: '좋아', emoji: '😍' },
  { key: 'fire', label: '불타는 눈', hint: '열심히 했네', emoji: '🔥' },
  { key: 'tear', label: '눈물 눈', hint: '고생했어', emoji: '😢' },
  { key: 'wow', label: '놀란 눈', hint: '대단해', emoji: '😲' },
  { key: 'sleepy', label: '졸린 눈', hint: '나도 쉬고 싶다', emoji: '😴' },
]

export const friendPosts: FriendPost[] = [
  { id: 'mock-1', friendId: 'min', categoryName: '운동', tone: 'coral', caption: '오늘도 러닝 완료!', timeAgo: '12분 전', duration: '0:05', reactions: { sparkle: 2, heart: 4, fire: 1, tear: 0, wow: 0, sleepy: 0 } },
  { id: 'mock-2', friendId: 'yu', categoryName: '약속', tone: 'violet', caption: '성수 팝업 다녀왔어요', timeAgo: '48분 전', duration: '0:04', reactions: { sparkle: 1, heart: 2, fire: 0, tear: 0, wow: 3, sleepy: 0 } },
  { id: 'mock-3', friendId: 'study', categoryName: '공부', tone: 'blue', caption: '스터디 3시간 끝!', timeAgo: '2시간 전', duration: '0:03', reactions: { sparkle: 0, heart: 1, fire: 2, tear: 1, wow: 0, sleepy: 1 } },
]
