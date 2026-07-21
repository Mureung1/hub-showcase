import { request } from './apiClient'

export function awardReactionPoints(postId: string) {
  return request<{ balance: number }>('/api/points/reaction', {
    method: 'POST',
    body: JSON.stringify({ postId }),
  })
}
