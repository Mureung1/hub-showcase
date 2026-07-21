import { request } from './apiClient'
import type { GroupTone } from './types'

export type VideoPostDto = {
  id: string
  scheduleId: string
  url: string
  contentType: string
  sizeBytes: number
  durationSeconds: number
  caption: string | null
  categoryName: string
  tone: GroupTone
  createdAt: string
}

export function presignVideoUpload(scheduleId: string, contentType: string) {
  return request<{ uploadUrl: string; storageKey: string }>('/api/videos/presign', {
    method: 'POST',
    body: JSON.stringify({ scheduleId, contentType }),
  })
}

export function createVideoPost(input: {
  scheduleId: string
  storageKey: string
  contentType: string
  sizeBytes: number
  durationSeconds: number
  caption?: string
}) {
  return request<VideoPostDto>('/api/videos', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function fetchMyVideoPosts() {
  return request<VideoPostDto[]>('/api/videos/mine')
}

export function deleteVideoPost(id: string) {
  return request<void>(`/api/videos/${id}`, { method: 'DELETE' })
}

export async function uploadVideoToR2(uploadUrl: string, file: Blob, contentType: string) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: file,
  })
  if (!response.ok) {
    throw new Error(`영상 업로드 실패: ${response.status}`)
  }
}
