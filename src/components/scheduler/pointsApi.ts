import { request } from './apiClient'

export function awardReactionPoints(postId: string) {
  return request<{ balance: number }>('/api/points/reaction', {
    method: 'POST',
    body: JSON.stringify({ postId }),
  })
}

// 테스트용 — 포인트 소비 흐름(상점 구매 등)을 확인하기 위해 호출할 때마다 50포인트를 지급한다.
export function grantTestPoints() {
  return request<{ balance: number }>('/api/points/test-grant', { method: 'POST' })
}
