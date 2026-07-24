import type { MissionRecordCalendarDay, MissionRecordListItem } from '../../api/types'

export type CalendarState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; days: MissionRecordCalendarDay[] }

export type RecordsState =
  | { status: 'loading' }
  | { status: 'error'; message: string; onRetry: () => void }
  | { status: 'success'; items: MissionRecordListItem[] }
