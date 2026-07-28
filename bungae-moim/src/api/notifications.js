// 알림 API(C). 폴링하지 않고 라우트가 바뀔 때마다 목록을 다시 받는다.
import { request } from './client.js'

// GET /api/notifications — { items, unreadCount } 반환.
export function fetchNotifications() {
  return request('/api/notifications')
}

// POST /api/notifications/read — 미읽음 전체 읽음 처리. { unreadCount: 0 } 반환.
// 바디가 없으므로 Content-Type을 붙이지 않는다(cancelParticipation과 같은 이유).
export function markNotificationsRead() {
  return request('/api/notifications/read', { method: 'POST' })
}
