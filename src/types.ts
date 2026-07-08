export interface Profile {
  industry: string
  isCorporation: boolean
  hasEmployee: boolean
  isRented: boolean
  closureDate: string
}

export type TaskGroup = 'closure' | 'tax' | 'subsidy'

export interface Task {
  id: string
  group: TaskGroup
  title: string
  description: string
  sourceUrl: string
  sourceLabel: string
  lastCheckedDate: string
  condition: (profile: Profile) => boolean
  reason: (profile: Profile) => string
  dueDate?: (profile: Profile) => Date
}
