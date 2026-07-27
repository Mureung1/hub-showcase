// 유통기한 임박 서버 푸시 알림용 서비스워커. 앱이 꺼져 있어도 브라우저가 이 파일을 깨워
// 'push' 이벤트를 넘겨주므로, 여기서 알림을 직접 띄운다(백엔드 push.js가 보내는 payload 참고).
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? { title: '냉장고 레시피', body: '유통기한을 확인해 보세요.' };
  event.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, icon: '/favicon.svg' })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/'));
});
