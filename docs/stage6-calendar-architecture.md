# 6단계 — 캘린더 연동 아키텍처 설계

> 전략: **Google Calendar API 우선 구현** + **Provider 패턴으로 iCalendar 추가 대비**

---

## 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────┐
│                    CalendarService (Interface)               │
│  - sync(userId, postingId, title, date, description)        │
│  - unsync(userId, eventId)                                  │
│  - export(userId, postingIds?) → string (ics content)       │
└─────────────────────────────────────────────────────────────┘
                              △
                              │
                ┌─────────────┴──────────────┐
                │                            │
    ┌───────────▼─────────────┐  ┌──────────▼──────────────┐
    │ GoogleCalendarProvider  │  │ ICalendarProvider       │
    │ (6단계 ✅ 구현)          │  │ (차후 구현 가능)        │
    ├─────────────────────────┤  ├──────────────────────────┤
    │ • Google OAuth          │  │ • .ics 파일 생성        │
    │ • API 토큰 관리         │  │ • webcal:// 링크        │
    │ • Event 생성/삭제       │  │ • 캘린더 앱 호환        │
    │ • 실시간 동기화         │  │ • 단방향 구독           │
    └─────────────────────────┘  └──────────────────────────┘
```

---

## 6단계: Google Calendar API 구현

### 1. 패키지 설치

```bash
# 백엔드
npm install googleapis google-auth-library

# 프론트엔드
npm install @react-oauth/google
```

### 2. 백엔드 구조

```
backend/src/
├── services/
│   ├── calendarService.ts           # 인터페이스 (추상)
│   └── providers/
│       ├── googleCalendarProvider.ts # 구현 (6단계)
│       └── icalendarProvider.ts      # 인터페이스만 (차후)
├── routes/
│   └── calendar.ts                  # 캘린더 API
└── middleware/
    └── googleAuth.ts                # Google OAuth 검증
```

### 3. CalendarService 인터페이스

```typescript
// backend/src/services/calendarService.ts

interface ICalendarProvider {
  // 공고 동기화
  sync(userId: string, posting: {
    id: string
    title: string
    receptionEndDate: Date
    sourceUrl: string
  }): Promise<{ eventId: string }>

  // 이벤트 삭제
  unsync(userId: string, eventId: string): Promise<void>

  // iCalendar 내보내기
  export(userId: string, postingIds?: string[]): Promise<string>

  // 사용자 캘린더 정보 조회
  getCalendars(userId: string): Promise<Array<{ id: string; name: string }>>
}

export class CalendarService {
  private provider: ICalendarProvider

  constructor(provider: ICalendarProvider) {
    this.provider = provider
  }

  async sync(userId: string, posting: Posting) {
    return this.provider.sync(userId, posting)
  }

  async unsync(userId: string, eventId: string) {
    return this.provider.unsync(userId, eventId)
  }

  async export(userId: string, postingIds?: string[]) {
    return this.provider.export(userId, postingIds)
  }
}
```

### 4. Google Calendar Provider 구현

```typescript
// backend/src/services/providers/googleCalendarProvider.ts

import { google } from 'googleapis'
import { PrismaClient } from '@prisma/client'

class GoogleCalendarProvider implements ICalendarProvider {
  private prisma = new PrismaClient()

  async sync(userId: string, posting: Posting) {
    // 1. DB에서 사용자 Google 토큰 조회
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true }
    })

    if (!user?.googleAccessToken) {
      throw new Error('Google Calendar not connected')
    }

    // 2. Google Calendar API 클라이언트 생성
    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: user.googleAccessToken })
    const calendar = google.calendar({ version: 'v3', auth })

    // 3. 이벤트 생성
    const event = {
      summary: posting.title,
      description: `🔗 ${posting.sourceUrl}`,
      start: { date: posting.receptionEndDate.toISOString().split('T')[0] },
      end: { date: posting.receptionEndDate.toISOString().split('T')[0] },
      reminders: {
        useDefault: true,
        overrides: [
          { method: 'notification', minutes: 1440 },  // D-1
          { method: 'notification', minutes: 4320 }   // D-3
        ]
      }
    }

    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event
    })

    // 4. DB에 eventId 저장 (Scrap 테이블 확장)
    await this.prisma.scrap.update({
      where: { userId_postingId: { userId, postingId: posting.id } },
      data: { googleEventId: result.data.id }
    })

    return { eventId: result.data.id }
  }

  async unsync(userId: string, eventId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true }
    })

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: user.googleAccessToken })
    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: 'primary',
      eventId
    })
  }

  async export(userId: string, postingIds?: string[]): Promise<string> {
    // 추후 iCalendar 표준 형식으로 .ics 생성
    throw new Error('Not implemented yet')
  }

  async getCalendars(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { googleAccessToken: true }
    })

    const auth = new google.auth.OAuth2()
    auth.setCredentials({ access_token: user.googleAccessToken })
    const calendar = google.calendar({ version: 'v3', auth })

    const result = await calendar.calendarList.list()
    return result.data.items || []
  }
}

export default GoogleCalendarProvider
```

### 5. 캘린더 API 라우트

```typescript
// backend/src/routes/calendar.ts

import { Router } from 'express'
import { verifyAuth, AuthRequest } from '../middleware/auth'
import GoogleCalendarProvider from '../services/providers/googleCalendarProvider'
import { CalendarService } from '../services/calendarService'

const router = Router()
const provider = new GoogleCalendarProvider()
const calendarService = new CalendarService(provider)

// POST /api/calendar/oauth-callback
// Google OAuth 콜백 - 액세스 토큰 저장
router.post('/oauth-callback', verifyAuth, async (req: AuthRequest, res) => {
  const { code } = req.body

  try {
    // Google OAuth 토큰 교환 (별도 구현)
    const { accessToken, refreshToken } = await exchangeGoogleCode(code)

    // DB에 저장
    await prisma.user.update({
      where: { id: req.userId! },
      data: {
        googleAccessToken: accessToken,
        googleRefreshToken: refreshToken,
        googleConnectedAt: new Date()
      }
    })

    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: 'Failed to connect Google Calendar' })
  }
})

// POST /api/calendar/sync
// 공고 → Google Calendar 동기화
router.post('/sync', verifyAuth, async (req: AuthRequest, res) => {
  const { postingId } = req.body

  try {
    const posting = await prisma.posting.findUnique({
      where: { id: postingId }
    })

    const result = await calendarService.sync(req.userId!, posting)
    res.json({ success: true, eventId: result.eventId })
  } catch (error) {
    res.status(400).json({ error: 'Sync failed' })
  }
})

// DELETE /api/calendar/events/:eventId
// Google Calendar에서 삭제
router.delete('/events/:eventId', verifyAuth, async (req: AuthRequest, res) => {
  const { eventId } = req.params

  try {
    await calendarService.unsync(req.userId!, eventId)
    res.json({ success: true })
  } catch (error) {
    res.status(400).json({ error: 'Delete failed' })
  }
})

// GET /api/calendar/status
// Google Calendar 연동 상태
router.get('/status', verifyAuth, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: {
      googleConnectedAt: true,
      email: true
    }
  })

  res.json({
    connected: !!user?.googleConnectedAt,
    email: user?.email,
    connectedAt: user?.googleConnectedAt
  })
})

export default router
```

### 6. Prisma 스키마 확장

```prisma
// prisma/schema.prisma

model User {
  // ... 기존 필드
  googleAccessToken    String?
  googleRefreshToken   String?
  googleConnectedAt    DateTime?

  // ... 관계
  scraps               Scrap[]
}

model Scrap {
  // ... 기존 필드
  googleEventId        String?   // Google Calendar 이벤트 ID
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  @@unique([userId, postingId])
}
```

---

## 프론트엔드 구현

### 1. Google OAuth 설정

```typescript
// frontend/src/utils/googleAuth.ts

import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'

export function GoogleCalendarButton() {
  const login = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      // 1. 백엔드로 코드 전송
      const response = await fetch('http://localhost:3000/api/calendar/oauth-callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ code: codeResponse.code })
      })

      if (response.ok) {
        alert('Google Calendar 연동 완료!')
        // UI 업데이트
      }
    },
    flow: 'auth-code'
  })

  return (
    <button onClick={() => login()}>
      🔗 Google Calendar 연동
    </button>
  )
}
```

### 2. 스크랩 시 자동 동기화

```typescript
// PostingCard.tsx 수정

const handleScrap = async () => {
  try {
    // 1. 공고 스크랩
    await postingsApi.scrap(posting.id)
    setIsScrapped(!isScrapped)

    // 2. Google Calendar 동기화 (연동 상태 확인 후)
    if (isGoogleConnected) {
      await fetch('http://localhost:3000/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenManager.getAccessToken()}`
        },
        body: JSON.stringify({ postingId: posting.id })
      })
    }
  } catch (error) {
    console.error('Scrap failed:', error)
  }
}
```

---

## 차후 확장 (iCalendar)

### ICalendarProvider 인터페이스

```typescript
// backend/src/services/providers/icalendarProvider.ts

class ICalendarProvider implements ICalendarProvider {
  async sync(userId: string, posting: Posting) {
    // .ics 파일에 이벤트 추가 (로컬 파일 또는 메모리)
    throw new Error('Not implemented yet')
  }

  async export(userId: string, postingIds?: string[]): Promise<string> {
    // 사용자의 스크랩된 공고 또는 필터링된 공고를
    // iCalendar 형식으로 변환
    const ics = require('ics')

    const events = postingIds
      ? await prisma.posting.findMany({ where: { id: { in: postingIds } } })
      : await prisma.posting.findMany({
          where: {
            scraps: { some: { userId } }
          }
        })

    const icsEvents = events.map(e => ({
      title: e.title,
      start: [e.receptionEndDate.getFullYear(), e.receptionEndDate.getMonth() + 1, e.receptionEndDate.getDate()],
      duration: { hours: 1 },
      description: e.sourceUrl
    }))

    const { error, value } = ics.createEvents(icsEvents)
    if (error) throw error

    return value
  }
}
```

---

## 구현 순서 (6단계)

| 단계 | 작업 | 예상 시간 |
|------|------|---------|
| 1 | Prisma 스키마 확장 (googleAccessToken, googleEventId) | 15분 |
| 2 | Google Cloud 설정 & OAuth 2.0 구성 | 30분 |
| 3 | 백엔드: GoogleCalendarProvider + CalendarService | 1시간 |
| 4 | 백엔드: 캘린더 API 라우트 | 45분 |
| 5 | 프론트엔드: Google OAuth 버튼 | 30분 |
| 6 | 프론트엔드: 스크랩 시 자동 동기화 | 30분 |
| 7 | 테스트 & 디버깅 | 1시간 |
| **총합** | | **~4.5시간** |

---

## 테스트 시나리오

```
1. 사용자가 "Google Calendar 연동" 버튼 클릭
   → Google OAuth 로그인
   → 토큰 저장 ✓

2. 공고 카드에서 스크랩 버튼 클릭
   → DB에 Scrap 생성
   → Google Calendar에 이벤트 자동 추가 ✓
   → 마감 D-1, D-3 알림 설정 ✓

3. 스크랩 해제
   → Google Calendar에서 이벤트 삭제 ✓

4. 다른 캘린더 앱 확인
   → Google Calendar에 공고 마감일 표시됨 ✓
```

---

## 다음 문서

→ `docs/stage7-smart-matching.md` (스마트 매칭 로직)

