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
  completed: boolean
}

export type Friend = {
  id: string
  name: string
  color: string
  eyes: 1 | 2
}

export type ReactionKind = 'sparkle' | 'heart' | 'fire' | 'tear' | 'wow' | 'sleepy'

export type ReactionMeta = {
  key: ReactionKind
  label: string
  hint: string
  emoji: string
}

export type FriendScheduleEntry = {
  id: number
  date: string
  title: string
  time: string
  categoryName: string
  tone: GroupTone
}

export type FriendPost = {
  id: number
  friendId: string
  categoryName: string
  tone: GroupTone
  caption: string
  timeAgo: string
  duration?: string
  videoUrl?: string
  reactions: Record<ReactionKind, number>
}
