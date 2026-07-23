import { request } from './apiClient'
import type { RoomInventoryItem, RoomItem, RoomLayoutEntry } from './types'

export function fetchRoomItems() {
  return request<RoomItem[]>('/api/room-items')
}

export function fetchRoomInventory() {
  return request<RoomInventoryItem[]>('/api/room-items/inventory')
}

export function purchaseRoomItem(itemId: string, color?: string) {
  return request<{ balance: number; inventoryId: string; color: string | null }>(`/api/room-items/${itemId}/purchase`, {
    method: 'POST',
    body: JSON.stringify({ color }),
  })
}

export function fetchRoomLayout() {
  return request<RoomLayoutEntry[]>('/api/room-items/layout')
}

export function placeRoomItem(inventoryId: string, x: number, y: number) {
  return request<{ x: number; y: number; placedAt: string }>(`/api/room-items/${inventoryId}/layout`, {
    method: 'PUT',
    body: JSON.stringify({ x, y }),
  })
}

export function removeRoomItemPlacement(inventoryId: string) {
  return request<void>(`/api/room-items/${inventoryId}/layout`, { method: 'DELETE' })
}
