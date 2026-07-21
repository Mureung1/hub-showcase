import { request } from './apiClient'
import type { DodoDiaryEntry, DodoState } from './types'

export function fetchDodoState() {
  return request<DodoState>('/api/dodo/state')
}

export function fetchDodoDiary(date: string) {
  return request<DodoDiaryEntry>(`/api/dodo/diary/${date}`)
}

export function fetchDodoDiaryList() {
  return request<DodoDiaryEntry[]>('/api/dodo/diary')
}
