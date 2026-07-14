import { request } from './apiClient'
import type { FriendRequestSummary, FriendSummary } from './types'

export function fetchFriends() {
  return request<FriendSummary[]>('/api/friends')
}

export function removeFriend(friendId: string) {
  return request<void>(`/api/friends/${friendId}`, { method: 'DELETE' })
}

export function fetchFriendRequests() {
  return request<{ incoming: FriendRequestSummary[]; outgoing: FriendRequestSummary[] }>('/api/friends/requests')
}

export function sendFriendRequest(email: string) {
  return request<{ status: 'requested' } | { status: 'friended'; friend: FriendSummary }>('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ email }),
  })
}

export function acceptFriendRequest(requestId: string) {
  return request<FriendSummary>(`/api/friends/requests/${requestId}/accept`, { method: 'POST' })
}

export function respondToFriendRequest(requestId: string) {
  return request<void>(`/api/friends/requests/${requestId}`, { method: 'DELETE' })
}
