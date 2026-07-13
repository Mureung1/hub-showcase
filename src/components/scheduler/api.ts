import type { Schedule, ScheduleCategoryId } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

  if (!response.ok) {
    throw new Error(`API 요청 실패: ${response.status}`)
  }

  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

export function fetchSchedules() {
  return request<Schedule[]>('/api/schedules')
}

export function createSchedule(input: { categoryId: ScheduleCategoryId; date: string; title: string; time: string }) {
  return request<Schedule>('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateSchedule(id: string, patch: Partial<Pick<Schedule, 'title' | 'time' | 'completed'>>) {
  return request<Schedule>(`/api/schedules/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

export function deleteSchedule(id: string) {
  return request<void>(`/api/schedules/${id}`, { method: 'DELETE' })
}
