import api from '../api/client.js'
import { getSession } from './session.js'

/*
 * 읽지 않은 알림 배지용 유틸.
 *
 * 서버에 read/unread 토글이 없으므로, "마지막으로 알림 화면을 본 시점의 최신 알림 id"를
 * 사용자별로 localStorage에 저장하고, 그보다 큰 id의 알림 개수를 "안 읽음"으로 센다.
 * 푸시 전달 여부·탭 포커스와 무관하게 동작한다(폴링 기반).
 */
const key = (userId) => `hub.lastSeenNoti.${userId}`

function currentUserId() {
  return getSession()?.userId ?? null
}

export function getLastSeenId() {
  const userId = currentUserId()
  if (userId == null) return 0
  return Number(localStorage.getItem(key(userId)) || 0)
}

export function markSeen(latestId) {
  const userId = currentUserId()
  if (userId == null || latestId == null) return
  localStorage.setItem(key(userId), String(latestId))
}

export async function fetchNotifications() {
  const res = await api.get('/notifications/me')
  return res.data // createdAt desc
}

// 안 읽은 알림 개수 (마지막으로 본 id 이후로 생긴 것)
export function countUnread(items) {
  const lastSeen = getLastSeenId()
  return items.filter((n) => n.id > lastSeen).length
}
