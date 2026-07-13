import type { Category, Friend, FriendPost, FriendScheduleEntry, ReactionMeta, ShareGroup } from './types'

export const friends: Friend[] = [
  { id: 'min', name: '민수', color: '#a9c8ec', eyes: 1 },
  { id: 'yu', name: '유진', color: '#c7b7e7', eyes: 2 },
  { id: 'study', name: '스터디 멤버', color: '#a9cfbd', eyes: 2 },
]

export const initialCategories: Category[] = [
  { id: 'study', name: '공부', color: '#98bce7', tone: 'blue', visibleTo: ['스터디'] },
  { id: 'exercise', name: '운동', color: '#f2a58d', tone: 'coral', visibleTo: ['절친'] },
  { id: 'appointment', name: '약속', color: '#b8a6de', tone: 'violet', visibleTo: ['절친', '커플'] },
  { id: 'personal', name: '기타', color: '#8fbdab', tone: 'green', visibleTo: [] },
]

export const friendSchedules: Record<string, FriendScheduleEntry[]> = {
  min: [
    { id: 101, date: '2026-07-08', title: '헬스장', time: '19:30', categoryName: '운동', tone: 'coral' },
    { id: 102, date: '2026-07-14', title: '팀 프로젝트 회의', time: '13:00', categoryName: '약속', tone: 'violet' },
    { id: 103, date: '2026-07-22', title: '아침 러닝', time: '07:00', categoryName: '운동', tone: 'coral' },
  ],
  yu: [
    { id: 201, date: '2026-07-07', title: '카페 알바', time: '10:00', categoryName: '기타', tone: 'green' },
    { id: 202, date: '2026-07-17', title: '성수 팝업', time: '18:30', categoryName: '약속', tone: 'violet' },
  ],
  study: [
    { id: 301, date: '2026-07-14', title: '스터디 모임', time: '19:30', categoryName: '공부', tone: 'blue' },
    { id: 302, date: '2026-07-23', title: '모의고사 풀이', time: '14:00', categoryName: '공부', tone: 'blue' },
  ],
}

export const shareGroups: ShareGroup[] = ['절친', '스터디', '가족', '커플']
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
  { id: 1, friendId: 'min', categoryName: '운동', tone: 'coral', caption: '오늘도 러닝 완료!', timeAgo: '12분 전', duration: '0:05', reactions: { sparkle: 2, heart: 4, fire: 1, tear: 0, wow: 0, sleepy: 0 } },
  { id: 2, friendId: 'yu', categoryName: '약속', tone: 'violet', caption: '성수 팝업 다녀왔어요', timeAgo: '48분 전', duration: '0:04', reactions: { sparkle: 1, heart: 2, fire: 0, tear: 0, wow: 3, sleepy: 0 } },
  { id: 3, friendId: 'study', categoryName: '공부', tone: 'blue', caption: '스터디 3시간 끝!', timeAgo: '2시간 전', duration: '0:03', reactions: { sparkle: 0, heart: 1, fire: 2, tear: 1, wow: 0, sleepy: 1 } },
]
