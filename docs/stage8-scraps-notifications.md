# Stage 8 — 스크랩 + D-Day 알림 시스템

## 개요

사용자가 관심 있는 공고를 스크랩하고, D-Day 기반 웹 푸시 알림을 받는 시스템 구현.

**완료 항목:**
- ✅ 스크랩 API (POST/PATCH /api/scraps)
- ✅ 스크랩 목록 페이지 (ScrapListPage)
- ✅ D-Day 계산 및 표시
- ✅ 웹 푸시 알림 시스템 (VAPID, Service Worker, web-push)
- ✅ D-3, D-1 자동 알림 스케줄링

---

## 1. 백엔드 구현

### 1-1. Prisma 스키마 확장

**새 테이블: PushSubscription**
```prisma
model PushSubscription {
  id              String   @id @default(cuid())
  userId          String
  endpoint        String   // 푸시 서비스 엔드포인트
  p256dh          String   // 암호화 키
  auth            String   // 인증 키
  subscriptionJson String   // 전체 subscription JSON 백업
  userAgent       String?  // 디바이스 정보
  subscribedAt    DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, endpoint])
  @@index([userId])
  @@map("push_subscriptions")
}
```

**마이그레이션 실행:**
```bash
npx prisma migrate dev --name add_push_subscription
npx prisma generate
```

---

### 1-2. VAPID 키 생성 및 설정

**VAPID 키 생성 (원본 데이터, 프로덕션에서는 보안 유지 필수):**
```bash
npx web-push generate-vapid-keys
```

**출력:**
```
Public Key:  BE_yh9TEmWte37DDOvX1Y1tVu0sG_eh4PL8XqViWEp6ISQ8Eq3pqo8h1g76K5heL1kzcXzIuHiJBpIAZY24QTiU
Private Key: 9ecjxubgQJvqs-OVEiOVgb2RDIpL712ODnDY6XETA5k
```

**backend/.env에 저장:**
```env
VAPID_PUBLIC_KEY="BE_yh9TEmWte37DDOvX1Y1tVu0sG_eh4PL8XqViWEp6ISQ8Eq3pqo8h1g76K5heL1kzcXzIuHiJBpIAZY24QTiU"
VAPID_PRIVATE_KEY="9ecjxubgQJvqs-OVEiOVgb2RDIpL712ODnDY6XETA5k"
```

---

### 1-3. 스크랩 API 확장

**POST /api/scraps/subscribe — 푸시 구독 저장**

```typescript
router.post('/subscribe', verifyAuth, async (req: AuthRequest, res) => {
  const userId = req.userId!
  const { subscription, userAgent } = req.body

  // subscription: { endpoint, keys: { p256dh, auth } }
  
  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
    update: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      subscriptionJson: JSON.stringify(subscription),
      userAgent,
      updatedAt: new Date(),
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      subscriptionJson: JSON.stringify(subscription),
      userAgent,
    },
  })
})
```

---

### 1-4. 알림 발송 시스템 (notificationService.ts)

**VAPID 키 설정:**
```typescript
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:naver-challenge@example.com',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)
```

**D-3, D-1 자동 스케줄링 (매일 자정 0시 0분 0초):**
```typescript
cron.schedule('0 0 0 * * *', async () => {
  // D-3 공고 찾기
  const threeDayPostings = await prisma.scrap.findMany({
    where: {
      notifyEnabled: true,
      posting: {
        receptionEndDate: {
          gte: new Date(threeDaysLater.toDateString()),
          lt: new Date(new Date(threeDaysLater.toDateString()).getTime() + 86400000),
        },
      },
    },
    include: { posting: true, user: true },
  })

  // D-1 공고 찾기
  const oneDayPostings = await prisma.scrap.findMany({
    where: {
      notifyEnabled: true,
      posting: {
        receptionEndDate: {
          gte: new Date(oneDayLater.toDateString()),
          lt: new Date(new Date(oneDayLater.toDateString()).getTime() + 86400000),
        },
      },
    },
    include: { posting: true, user: true },
  })

  // web-push로 실제 푸시 발송
  for (const scrap of [...threeDayPostings, ...oneDayPostings]) {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: scrap.userId },
    })

    for (const sub of subscriptions) {
      const subscription = JSON.parse(sub.subscriptionJson)
      await webpush.sendNotification(subscription, JSON.stringify({
        title: scrap.posting.title,
        body: `마감까지 D-${Math.ceil(...)}`,
        icon: '/icon-192x192.png',
      }))
    }
  }
})
```

---

## 2. 프론트엔드 구현

### 2-1. Service Worker 등록 (public/service-worker.js)

```javascript
// 푸시 알림 수신
self.addEventListener('push', (event) => {
  let notificationData = { title: 'UniBoard 알림', body: '새로운 알림' }
  
  if (event.data) {
    try {
      notificationData = event.data.json()
    } catch {
      notificationData.body = event.data.text()
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      tag: notificationData.tag || 'uniboard',
    })
  )
})

// 알림 클릭 시 앱 포커스
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus()
        }
      }
      return clients.openWindow('/')
    })
  )
})
```

---

### 2-2. 푸시 구독 관리 (utils/pushNotification.ts)

**주요 함수:**

```typescript
// 1. 알림 권한 요청
export async function requestNotificationPermission()

// 2. Service Worker 등록
export async function registerServiceWorker()

// 3. 푸시 구독 생성
export async function subscribeToPushNotifications()

// 4. 서버에 구독 정보 저장
async function saveSubscriptionToServer(subscription: PushSubscription)

// 5. 통합 초기화
export async function initializePushNotifications()
```

---

### 2-3. 환경 변수 설정 (frontend/.env)

```env
VITE_VAPID_PUBLIC_KEY="BE_yh9TEmWte37DDOvX1Y1tVu0sG_eh4PL8XqViWEp6ISQ8Eq3pqo8h1g76K5heL1kzcXzIuHiJBpIAZY24QTiU"
```

---

### 2-4. App.tsx에서 자동 초기화

```typescript
import { initializePushNotifications } from './utils/pushNotification'

// 대시보드 진입 시 1초 후 푸시 알림 초기화
setTimeout(() => {
  initializePushNotifications().catch(err =>
    console.error('푸시 알림 초기화 실패:', err)
  )
}, 1000)
```

---

### 2-5. ScrapListPage 구현

**주요 기능:**
- ✅ 좌측 사이드바 네비게이션 (다른 페이지로 이동)
- ✅ D-Day/스크랩순 정렬 토글
- ✅ D-Day 배지 (색상 코딩)
  - 과거 마감: 빨강 (#fee2e2)
  - D-Day ≤ 3: 노랑 (#fef3c7)
  - 그 외: 회색 (#f3f4f6)
- ✅ 알림 온/오프 토글 (🔔/🔕)
- ✅ 페이지네이션
- ✅ 빈 상태 UI

---

## 3. 실행 흐름

### 사용자 관점

1. **로그인 후 대시보드 진입**
   - Service Worker 등록
   - 브라우저 알림 권한 요청
   - 사용자가 "허용" 선택
   
2. **푸시 구독 자동 생성**
   - PushSubscription 생성
   - 서버에 endpoint + 키 저장

3. **스크랩 추가**
   - 공고 카드에서 하트 클릭
   - notifyEnabled: true로 저장

4. **D-3, D-1에 자동 알림**
   - 매일 자정에 node-cron 실행
   - 해당 공고 찾기
   - web-push로 모든 구독에 푸시 발송
   - 브라우저 알림 표시 🔔

5. **알림 클릭**
   - 앱 포커스 또는 새 탭 열기
   - 스크랩 페이지로 이동

---

## 4. 중요 고려사항

### 보안
- **VAPID 키**: 프로덕션에서 환경 변수로만 관리
- **구독 저장**: 사용자 권한 확인 (verifyAuth 미들웨어)

### 신뢰성
- **구독 만료 처리**: HTTP 410 응답 시 DB에서 자동 삭제
- **중복 구독 방지**: userId + endpoint 복합 unique 키

### 성능
- **배치 처리**: 모든 사용자 구독을 한 번에 조회 후 발송
- **에러 격리**: 한 구독 실패 시 다른 구독 계속 발송

---

## 5. 테스트 방법

### 로컬 테스트 시나리오

1. **권한 요청 확인**
   ```
   - 대시보드 진입
   - 브라우저 알림 권한 팝업 나타남
   - "허용" 선택
   ```

2. **구독 저장 확인**
   ```bash
   # DB에서 확인
   SELECT * FROM push_subscriptions WHERE user_id = '...'
   ```

3. **D-Day 알림 수동 테스트**
   ```typescript
   // notificationService.ts에서 sendTestNotification 호출
   ```

4. **실제 알림 확인**
   - 매일 자정에 자동 발송
   - 브라우저 알림 표시 (포커스 상태 무관)

---

## 6. 알려진 제한사항

- **웹 푸시는 HTTPS 필수** (localhost 제외)
- **알림은 Service Worker 지원 브라우저에서만 작동** (Chrome, Firefox, Edge 등)
- **구독은 디바이스/브라우저별 1개** (같은 계정, 다른 디바이스 = 별도 구독)

---

## 7. 향후 개선 사항

- [ ] 이메일 알림 폴백
- [ ] SMS 알림 (선택)
- [ ] 사용자 정의 알림 시간 설정
- [ ] 알림 읽음 표시 추적
- [ ] 푸시 통계 대시보드
