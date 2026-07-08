import type { Category, Friend, Schedule, ShareGroup } from './types'

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

export const initialSchedules: Schedule[] = [
  { id: 1, date: '2026-07-07', title: '저녁 운동', time: '19:00', category: 'exercise', tone: 'coral' },
  { id: 2, date: '2026-07-10', title: '포트폴리오 정리', time: '14:00', category: 'study', tone: 'blue' },
  { id: 3, date: '2026-07-17', title: '성수 팝업', time: '18:30', category: 'appointment', tone: 'violet' },
  { id: 4, date: '2026-07-26', title: '7월 돌아보기', time: '21:00', category: 'personal', tone: 'green' },
  { id: 5, date: '2026-07-08', title: '헬스', time: '20:00', category: 'exercise', tone: 'coral' },
  { id: 6, date: '2026-07-14', title: '영어 공부', time: '20:30', category: 'study', tone: 'blue' },
  { id: 7, date: '2026-07-22', title: '러닝', time: '07:30', category: 'exercise', tone: 'coral' },
  { id: 8, date: '2026-07-23', title: '주간 스터디', time: '19:30', category: 'study', tone: 'blue' },
]

export const shareGroups: ShareGroup[] = ['절친', '스터디', '가족', '커플']
export const weekLabels = ['일', '월', '화', '수', '목', '금', '토']
