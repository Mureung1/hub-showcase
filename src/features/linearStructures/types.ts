export interface StructureItem {
  id: number
  value: string
}

export type StructureType = 'stack' | 'queue' | 'deque'

export type LogTone = 'neutral' | 'ok' | 'error'

export interface OperationLog {
  id: number
  message: string
  tone: LogTone
}
