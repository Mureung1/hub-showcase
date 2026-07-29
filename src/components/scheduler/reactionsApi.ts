import { request } from './apiClient'
import type { ReactionKind } from './types'

export type ReactionSummary = {
  counts: Record<ReactionKind, number>
  myReaction: ReactionKind | null
}

export function fetchReactionSummary(videoPostId: string) {
  return request<ReactionSummary>(`/api/videos/${videoPostId}/reactions`)
}

export function setReaction(videoPostId: string, kind: ReactionKind) {
  return request<ReactionSummary>(`/api/videos/${videoPostId}/reactions`, {
    method: 'PUT',
    body: JSON.stringify({ kind }),
  })
}

export function clearReaction(videoPostId: string) {
  return request<ReactionSummary>(`/api/videos/${videoPostId}/reactions`, { method: 'DELETE' })
}
