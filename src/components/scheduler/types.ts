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

export type DodoBehavior =
  | 'NO_SCHEDULE'
  | 'WAITING'
  | 'DEADLINE_SOON'
  | 'VIDEO_VERIFIED'
  | 'REACTION_RECEIVED'
  | 'ALL_DONE'
  | 'INCOMPLETE_DAY'

export type DodoState = {
  mood: 1 | 2 | 3 | 4
  behavior: DodoBehavior
}

export type EquippedSlotItem = { itemId: string; iconKey: string; color: string | null }

// 친구 마이홈 방문에서도 그대로 쓰이는 공용 모양 — bodyColor/eyeCount는 방문자도 실제 모습을 봐야 해서 포함한다.
export type DodoAppearance = {
  bodyColor: string
  eyeCount: 1 | 2 | 3
  hat: EquippedSlotItem | null
  glasses: EquippedSlotItem | null
  outfit: EquippedSlotItem | null
  accessory: EquippedSlotItem | null
}

// 본인 전용 — "온보딩을 끝냈는지"는 남에게 보일 필요 없는 정보라 DodoAppearance엔 없고 여기만 있다.
export type SelfDodoAppearance = DodoAppearance & { onboarded: boolean }

// 친구 마이홈 방문 화면(읽기 전용)에서 실제로 배치된 아이템 하나 — 소유 인스턴스 id는 방문자에게 필요 없어서 뺐다.
export type FriendRoomLayoutEntry = {
  itemId: string
  iconKey: string
  color: string | null
  x: number
  y: number
}

export type FriendHomeState = {
  layout: FriendRoomLayoutEntry[]
  appearance: DodoAppearance
}

export type DodoDiaryEntry = {
  id: string
  date: string
  text: string
  mood: 1 | 2 | 3 | 4 | null
  pointsEarned: number | null
  representativeVideoUrl: string
  createdAt: string
}

export type RoomItemType = 'FURNITURE' | 'WALLPAPER' | 'FLOOR' | 'LIGHTING' | 'WINDOW_VIEW' | 'SEASONAL_DECOR'

// 상점 카탈로그 항목 — 전체 공용, 소유 여부/색은 포함하지 않는다(소유 정보는 RoomInventoryItem에서).
export type RoomItem = {
  id: string
  name: string
  cost: number
  type: RoomItemType
  iconKey: string
  // 두두가 직접 착용하는 아이템(헤드폰 등)인지 여부.
  equippable: boolean
  // 장식용이지만 두두와 상호작용 가능한 아이템(게임기 등)인지 여부.
  interactable: boolean
  // 사용자가 본체 색을 직접 고를 수 있는 아이템인지 여부(게임기 등).
  colorCustomizable: boolean
  // 마이홈 방 안에 물리적으로 배치할 수 있는 아이템인지 여부(interactable과 별개 — 테이블은 상호작용은 없지만 배치는 된다).
  placeable: boolean
  // 벽 영역에만 놓을 수 있는 아이템인지 여부(창문·벽 장식 등). true면 배치 시 y좌표가 벽 영역으로 제한된다.
  wallMounted: boolean
  // 색 구분 없이도 같은 아이템을 여러 개 살 수 있는지 여부(간식류). false면 색이 같으면 1개만 소유 가능.
  repeatable: boolean
}

// 내가 실제로 소유한 인스턴스 한 개 — 같은 itemId라도 색이 다르면 별도 인스턴스(별도 id)로 존재한다.
export type RoomInventoryItem = {
  id: string
  itemId: string
  name: string
  cost: number
  iconKey: string
  equippable: boolean
  interactable: boolean
  colorCustomizable: boolean
  placeable: boolean
  wallMounted: boolean
  repeatable: boolean
  color: string | null
}

// x, y는 마이홈 방 영역 기준 0~100 퍼센트 좌표. inventoryId로 어떤 소유 인스턴스가 배치됐는지 식별한다.
export type RoomLayoutEntry = {
  inventoryId: string
  itemId: string
  color: string | null
  x: number
  y: number
  // 배치된 시각(ISO) — 간식류는 이 시각으로부터 1시간이 지나면 자동으로 방에서 제거된다.
  placedAt: string
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
