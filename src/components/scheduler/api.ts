import { request } from './apiClient'
import type { Schedule, ScheduleCategoryId } from './types'

type CategoryResponse = { id: string; name: string; color: string; tone: Schedule['tone'] }

export function fetchSchedules() {
  return request<Schedule[]>('/api/schedules')
}

export function fetchCategories() {
  return request<CategoryResponse[]>('/api/categories')
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
