import { request } from './apiClient'
import type { DodoAppearance, DodoDiaryEntry, DodoState } from './types'

export function fetchDodoState() {
  return request<DodoState>('/api/dodo/state')
}

export function fetchDodoAppearance() {
  return request<DodoAppearance>('/api/dodo/appearance')
}

export function equipRoomItem(inventoryId: string) {
  return request<DodoAppearance>('/api/dodo/equip', { method: 'POST', body: JSON.stringify({ inventoryId }) })
}

export function unequipRoomItem(inventoryId: string) {
  return request<DodoAppearance>('/api/dodo/unequip', { method: 'POST', body: JSON.stringify({ inventoryId }) })
}

export function fetchDodoDiary(date: string) {
  return request<DodoDiaryEntry>(`/api/dodo/diary/${date}`)
}

export function fetchDodoDiaryList() {
  return request<DodoDiaryEntry[]>('/api/dodo/diary')
}
