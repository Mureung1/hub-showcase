import { request } from './apiClient'

export type CommentDto = {
  id: string
  authorId: string
  authorName: string
  text: string
  createdAt: string
}

export function fetchComments(videoPostId: string) {
  return request<CommentDto[]>(`/api/videos/${videoPostId}/comments`)
}

export function createComment(videoPostId: string, text: string) {
  return request<CommentDto>(`/api/videos/${videoPostId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

export function deleteComment(videoPostId: string, commentId: string) {
  return request<void>(`/api/videos/${videoPostId}/comments/${commentId}`, { method: 'DELETE' })
}
