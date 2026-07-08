export type GroupTone = 'blue' | 'violet' | 'green' | 'coral'
export type AppTab = 'calendar' | 'home' | 'friends' | 'profile'
export type ScheduleCategoryId = 'study' | 'exercise' | 'appointment' | 'personal'
export type ShareGroup = '절친' | '스터디' | '가족' | '커플'

export type Category = {
  id: ScheduleCategoryId
  name: string
  color: string
  tone: GroupTone
  visibleTo: ShareGroup[]
}

export type Schedule = {
  id: number
  date: string
  title: string
  time: string
  category: ScheduleCategoryId
  tone: GroupTone
}

export type Friend = {
  id: string
  name: string
  color: string
  eyes: 1 | 2
}
