// Service Worker for Web Push Notifications

self.addEventListener('push', (event) => {
  console.log('푸시 알림 수신:', event)

  let notificationData = {
    title: 'UniBoard 알림',
    body: '새로운 알림이 있습니다',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
  }

  // 푸시 이벤트에서 데이터 추출
  if (event.data) {
    try {
      notificationData = event.data.json()
    } catch (error) {
      notificationData.body = event.data.text()
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    badge: notificationData.badge,
    tag: notificationData.tag || 'uniboard-notification',
    timestamp: notificationData.timestamp ? new Date(notificationData.timestamp).getTime() : Date.now(),
    requireInteraction: false,
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  )
})

// 알림 클릭 시 처리
self.addEventListener('notificationclick', (event) => {
  console.log('알림 클릭:', event.notification)

  event.notification.close()

  // 클라이언트 찾기 또는 새 창 열기
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열려있는 창이 있으면 포커스
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      // 없으면 새 창 열기
      if (clients.openWindow) {
        return clients.openWindow('/')
      }
    })
  )
})

// Service Worker 활성화
self.addEventListener('activate', (event) => {
  console.log('Service Worker 활성화:', event)
})

// Service Worker 설치
self.addEventListener('install', (event) => {
  console.log('Service Worker 설치:', event)
  self.skipWaiting()
})
