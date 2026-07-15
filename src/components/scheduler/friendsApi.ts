import { request } from './apiClient'
import type { FriendGroup, FriendRequestSummary, FriendScheduleEntry, FriendSummary, HomeVisitActionKind } from './types'

export function fetchFriends() {
  return request<FriendSummary[]>('/api/friends')
}

export function fetchFriendSchedules(friendId: string) {
  return request<FriendScheduleEntry[]>(`/api/friends/${friendId}/schedules`)
}

export function removeFriend(friendId: string) {
  return request<void>(`/api/friends/${friendId}`, { method: 'DELETE' })
}

export function visitFriendHome(friendId: string, action: HomeVisitActionKind, message?: string) {
  return request<{ id: string; action: HomeVisitActionKind; message: string | null; createdAt: string }>(
    `/api/friends/${friendId}/visits`,
    {
      method: 'POST',
      body: JSON.stringify({ action, message }),
    },
  )
}

export function fetchFriendRequests() {
  return request<{ incoming: FriendRequestSummary[]; outgoing: FriendRequestSummary[] }>('/api/friends/requests')
}

export function sendFriendRequest(identifier: string) {
  return request<{ status: 'requested' } | { status: 'friended'; friend: FriendSummary }>('/api/friends/requests', {
    method: 'POST',
    body: JSON.stringify({ identifier }),
  })
}

export function acceptFriendRequest(requestId: string) {
  return request<FriendSummary>(`/api/friends/requests/${requestId}/accept`, { method: 'POST' })
}

export function respondToFriendRequest(requestId: string) {
  return request<void>(`/api/friends/requests/${requestId}`, { method: 'DELETE' })
}

export function fetchGroups() {
  return request<FriendGroup[]>('/api/groups')
}

export function createGroup(name: string) {
  return request<FriendGroup>('/api/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}

export function renameGroup(id: string, name: string) {
  return request<FriendGroup>(`/api/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  })
}

export function deleteGroup(id: string) {
  return request<void>(`/api/groups/${id}`, { method: 'DELETE' })
}

export function addGroupMember(groupId: string, friendUserId: string) {
  return request<FriendGroup>(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: JSON.stringify({ friendUserId }),
  })
}

export function removeGroupMember(groupId: string, friendUserId: string) {
  return request<FriendGroup>(`/api/groups/${groupId}/members/${friendUserId}`, { method: 'DELETE' })
}
