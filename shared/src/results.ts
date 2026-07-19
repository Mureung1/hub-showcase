export type SlotResult = {
  date: string
  time: string
  availableCount: number
  preferredCount: number
}

export type GetResultsResponse = {
  slots: SlotResult[]
}

export type ResponseStatusResponse = {
  completedCount: number
}

// study: 응답 전용이라 zod 스키마 없음.