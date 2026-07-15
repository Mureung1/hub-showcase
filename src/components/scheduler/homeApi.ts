import { request } from './apiClient'
import type { HomeVisitEntry } from './types'

export function fetchHomeVisits() {
  return request<HomeVisitEntry[]>('/api/home/visits')
}

export function markHomeVisitsRead() {
  return request<void>('/api/home/visits/read', { method: 'POST' })
}
