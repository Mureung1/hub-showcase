// 언코 PWA 서비스워커 — 앱 셸 오프라인 지원 (같은 오리진만 캐시)
// 채점 프록시(Vercel)·Firebase·CDN 등 크로스 오리진은 가로채지 않아 항상 최신/실시간.
const CACHE = 'uncoach-v1';
const SHELL = ['/index.html', '/support.js', '/firebase-client.js', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // 크로스 오리진(프록시·Firebase·CDN)은 브라우저 기본 처리 — 캐시/오프라인 대상 아님
  if (url.origin !== self.location.origin) return;
  // 같은 오리진: 네트워크 우선, 실패 시 캐시 폴백(오프라인)
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  );
});
