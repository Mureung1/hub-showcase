/*
 * FCM 백그라운드 수신 서비스 워커 (T-13).
 *
 * 이 파일은 번들러를 거치지 않고 정적으로 서빙되므로 import를 쓸 수 없다.
 * 따라서 compat 스크립트를 importScripts로 불러오고 설정도 하드코딩한다.
 * src/lib/firebase.js의 firebaseConfig와 항상 같은 값을 유지할 것.
 */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyB5qJSzp1BQbeqnbJE3ejCV_bqXknfWrEM',
  authDomain: 'aac-alarm.firebaseapp.com',
  projectId: 'aac-alarm',
  storageBucket: 'aac-alarm.firebasestorage.app',
  messagingSenderId: '680559797098',
  appId: '1:680559797098:web:82f9a2028b149a6841fb13',
})

const messaging = firebase.messaging()

// 앱이 닫혀 있거나 백그라운드일 때 수신
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? '마감 할인'
  self.registration.showNotification(title, {
    body: payload.notification?.body ?? '',
    icon: '/favicon.ico',
    data: { url: payload.data?.url ?? '/app' },
  })
})

// 알림 클릭 시 이미 열린 탭이 있으면 그 탭으로, 없으면 새로 연다
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url ?? '/app'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target)
          return client.focus()
        }
      }
      return self.clients.openWindow(target)
    }),
  )
})
