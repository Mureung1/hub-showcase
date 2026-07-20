export type GroupTone = 'blue' | 'violet' | 'green' | 'coral'
export type AppTab = 'calendar' | 'home' | 'friends' | 'profile'
export type ScheduleCategoryId = string

export type Category = {
  id: ScheduleCategoryId
  name: string
  color: string
  tone: GroupTone
  visibleTo: string[]
}

export type Schedule = {
  id: string
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
  id: string
  date: string
  title: string
  time: string
  categoryName: string
  tone: GroupTone
}

export type FriendSummary = {
  id: string
  name: string
  email: string
}

export type FriendRequestSummary = {
  id: string
  user: FriendSummary
  createdAt: string
}

export type FriendGroup = {
  id: string
  name: string
  members: FriendSummary[]
}

export type ProfileStats = {
  completedCount: number
  friendCount: number
  currentStreak: number
  points: number
}

export type Profile = {
  id: string
  email: string
  name: string
  handle: string | null
  bio: string | null
  avatarColor: string | null
  avatarEyes: 1 | 2 | null
  stats: ProfileStats
}

export type HomeVisitActionKind = 'PAT' | 'SNACK' | 'MESSAGE' | 'PHOTO' | 'FURNITURE_USE'

export type HomeVisitEntry = {
  id: string
  visitor: { id: string; name: string }
  action: HomeVisitActionKind
  message: string | null
  read: boolean
  createdAt: string
}

export type FriendPost = {
  id: string
  friendId: string
  categoryName: string
  tone: GroupTone
  caption: string
  timeAgo: string
  duration?: string
  videoUrl?: string
  reactions: Record<ReactionKind, number>
}
