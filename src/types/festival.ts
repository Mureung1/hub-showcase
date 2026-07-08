import type { LucideIcon } from 'lucide-react'

export type View = 'home' | 'timetable' | 'booths' | 'notices' | 'more'

export type ScheduleCategory = '공연' | '이벤트' | '체험'

export type BoothCategory = '음식' | '체험' | '굿즈'

export type ScheduleItem = {
  id: number
  date: string
  time: string
  endTime: string
  title: string
  location: string
  category: ScheduleCategory
}

export type Booth = {
  id: number
  date: string
  name: string
  category: BoothCategory
  location: string
  hours: string
  menu: string[]
  prices: string[]
}

export type Notice = {
  id: number
  title: string
  author: string
  date: string
  body: string
  important: boolean
}

export type NavItem = {
  id: View
  label: string
  icon: LucideIcon
}
