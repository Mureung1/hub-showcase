import { request } from './apiClient'
import type { DodoDiaryEntry, DodoState, SelfDodoAppearance } from './types'

export function fetchDodoState() {
  return request<DodoState>('/api/dodo/state')
}

export function fetchDodoAppearance() {
  return request<SelfDodoAppearance>('/api/dodo/appearance')
}

export function updateDodoAppearance(patch: { bodyColor: string; eyeCount: 1 | 2 }) {
  return request<SelfDodoAppearance>('/api/dodo/appearance', { method: 'PATCH', body: JSON.stringify(patch) })
}

export function equipRoomItem(inventoryId: string) {
  return request<SelfDodoAppearance>('/api/dodo/equip', { method: 'POST', body: JSON.stringify({ inventoryId }) })
}

export function unequipRoomItem(inventoryId: string) {
  return request<SelfDodoAppearance>('/api/dodo/unequip', { method: 'POST', body: JSON.stringify({ inventoryId }) })
}

export function fetchDodoDiary(date: string) {
  return request<DodoDiaryEntry>(`/api/dodo/diary/${date}`)
}

export function fetchDodoDiaryList() {
  return request<DodoDiaryEntry[]>('/api/dodo/diary')
}
