# 6단계 — Google Calendar API 연동 구현

> 상태: ✅ **백엔드 완료** (2026-07-13)

---

## 개요

Provider 패턴을 사용하여 **Google Calendar API 우선 구현** + **iCalendar 추가 대비** 설계를 완료했습니다.

사용자가 Google Calendar를 연동하면, 공고를 스크랩할 때 자동으로 Google Calendar에 마감일 이벤트가 생성됩니다.

---

## 구현 사항

### 백엔드

#### 1. Prisma 스키마 확장
- **User 모델**: `googleAccessToken`, `googleRefreshToken`, `googleConnectedAt` 추가
- **Scrap 모델**: `googleEventId` 필드 추가 (Google Calendar 이벤트 ID 저장)
- 마이그레이션: `20260713092641_add_google_calendar`

#### 2. CalendarService 인터페이스 (추상 설계)
```typescript
interface ICalendarProvider {
  sync(userId, posting): Promise<{ eventId }>
  unsync(userId, eventId): Promise<void>
  export(userId, postingIds?): Promise<string>
  getCalendars(userId): Promise<{ id, name }[]>
}
```

- Google Calendar 구현 준비 (6단계 ✅)
- iCalendar 인터페이스 정의 (차후 확장 가능)

#### 3. GoogleCalendarProvider 구현
- **sync()**: 공고 정보로 Google Calendar 이벤트 생성
  - 마감일 기준 all-day event
  - 알림: D-1 (1440분), D-3 (4320분)
  - 설명: 공고 원문 링크
- **unsync()**: Google Calendar에서 이벤트 삭제
- **getCalendars()**: 사용자 캘린더 목록 조회
- **export()**: iCalendar 형식 내보내기 (미구현, 인터페이스만 정의)

#### 4. Calendar API 라우트
```
POST   /api/calendar/oauth-callback    Google OAuth 토큰 저장
POST   /api/calendar/sync              공고 → Google Calendar 동기화
DELETE /api/calendar/events/:eventId   이벤트 삭제
GET    /api/calendar/status            연동 상태 확인
```

#### 5. 스크랩 시 자동 동기화
- `POST /api/postings/:id/scrap` 수정
- 스크랩 생성 시 Google Calendar 연동 확인 후 자동 동기화
- 스크랩 삭제 시 Google Calendar에서 이벤트 삭제

### 프론트엔드

#### 1. Google OAuth 설정
- `@react-oauth/google` 패키지 설치
- App.tsx에서 GoogleOAuthProvider로 감싸기
- VITE_GOOGLE_CLIENT_ID 환경변수 설정

#### 2. GoogleCalendarButton 컴포넌트
- "🔗 Google Calendar 연동" 버튼
- 클릭 시 Google OAuth 로그인
- 연동 상태 표시 (✓ 연동됨 / 연동 필요)
- 자동 상태 확인 (onMount)

#### 3. API 클라이언트 (calendarApi)
```typescript
calendarApi.getStatus()           // 연동 상태 확인
calendarApi.oauthCallback(code)   // OAuth 콜백
calendarApi.sync(postingId)       // 수동 동기화 (선택)
calendarApi.unsync(eventId)       // 수동 삭제 (선택)
```

#### 4. 대시보드 통합
- DashboardLayout 우측 패널에 GoogleCalendarButton 추가
- Google Calendar 버튼을 다음 마감 일정 위에 배치

---

## 기술 스택

| 계층 | 기술 |
|------|------|
| **백엔드** | Express, googleapis v6, google-auth-library, Prisma |
| **프론트엔드** | React 18, @react-oauth/google, TypeScript |
| **데이터** | PostgreSQL (Supabase) |
| **패턴** | Provider Pattern (전략 패턴) |

---

## 데이터 흐름

### 1. Google Calendar 연동 (첫 사용)
```
사용자 "Google Calendar 연동" 클릭
    ↓
Google OAuth 로그인 (권한 요청)
    ↓
authorization code 획득
    ↓
POST /api/calendar/oauth-callback (code 전송)
    ↓
백엔드: Google API로 access/refresh token 교환
    ↓
DB에 토큰 저장 (User.googleAccessToken 등)
    ↓
"✓ Google Calendar 연동됨" 표시
```

### 2. 공고 스크랩 시 자동 동기화
```
사용자 "스크랩" 클릭
    ↓
POST /api/postings/:id/scrap
    ↓
1. Scrap 레코드 생성
    ↓
2. 사용자 Google Calendar 연동 확인
    ↓
3. 연동된 경우:
   - CalendarService.sync(userId, posting)
   - Google Calendar API에 이벤트 생성
   - eventId를 Scrap에 저장
    ↓
클라이언트: "스크랩 완료" (자동 동기화도 완료)
```

### 3. 스크랩 해제 시 동기화 제거
```
사용자 "스크랩 해제" 클릭
    ↓
POST /api/postings/:id/scrap (재클릭)
    ↓
1. Scrap 레코드 조회
    ↓
2. googleEventId 있으면:
   - CalendarService.unsync(userId, eventId)
   - Google Calendar에서 이벤트 삭제
    ↓
3. Scrap 삭제
    ↓
클라이언트: "스크랩 해제 완료"
```

---

## 파일 구조

```
backend/src/
├── services/
│   ├── calendarService.ts              # ICalendarProvider 인터페이스
│   └── providers/
│       └── googleCalendarProvider.ts   # Google Calendar 구현 (6단계 ✅)
├── routes/
│   ├── calendar.ts                     # 캘린더 API 라우트
│   └── postings.ts                     # 스크랩 시 자동 동기화 추가
└── index.ts                            # 캘린더 라우트 등록

frontend/src/
├── components/
│   └── GoogleCalendarButton.tsx        # OAuth 버튼 컴포넌트
├── pages/
│   ├── App.tsx                         # GoogleOAuthProvider 감싸기
│   └── DashboardLayout.tsx             # 우측 패널에 버튼 추가
└── utils/
    └── apiClient.ts                    # calendarApi 클라이언트

backend/prisma/
├── schema.prisma                       # User/Scrap 필드 확장
└── migrations/
    └── 20260713092641_add_google_calendar/

.env.example 파일들
├── backend/.env.example               # GOOGLE_CLIENT_ID 등 추가
└── frontend/.env.example              # VITE_GOOGLE_CLIENT_ID 추가
```

---

## 환경변수 설정

### 백엔드 (.env)
```bash
# Google Calendar OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3001/api/calendar/oauth-callback"
```

### 프론트엔드 (.env)
```bash
# Google OAuth
VITE_GOOGLE_CLIENT_ID="your-client-id"
```

---

## 구현 완료 체크리스트

### 백엔드
- ✅ Prisma 스키마 확장 (User, Scrap)
- ✅ 마이그레이션 생성 및 적용
- ✅ CalendarService 인터페이스 정의
- ✅ GoogleCalendarProvider 구현
- ✅ 캘린더 API 라우트 (4개 엔드포인트)
- ✅ 스크랩 시 자동 동기화 로직
- ✅ 타입 체크 (기본 에러 해결)

### 프론트엔드
- ✅ @react-oauth/google 패키지 설치
- ✅ GoogleCalendarButton 컴포넌트 구현
- ✅ App.tsx GoogleOAuthProvider 통합
- ✅ DashboardLayout에 버튼 배치
- ✅ calendarApi 클라이언트 구현
- ✅ 타입 체크 (기본 에러 해결)

### 환경설정
- ✅ .env.example 업데이트 (Google OAuth 항목)
- ⏳ 실제 Google Cloud 설정 (사용자 수동)

---

## 다음 단계

### 즉시 필요 (배포 전)
1. **Google Cloud Console에서 OAuth 설정**
   - Google Cloud 프로젝트 생성
   - Google Calendar API 활성화
   - OAuth 2.0 Credentials (Web application) 생성
   - Client ID / Client Secret 발급
   - Authorized Redirect URI 등록

2. **환경변수 설정**
   - 발급받은 Client ID/Secret을 .env에 입력
   - 로컬/프로덕션 환경 분리 설정

3. **테스트**
   ```bash
   cd frontend && npm run dev
   cd backend && npm run dev
   ```
   - 대시보드에서 Google Calendar 버튼 클릭
   - Google OAuth 로그인
   - 공고 스크랩 → Google Calendar 자동 이벤트 생성 확인

### 향후 확장 (선택)
- [ ] iCalendar 구현 (ICalendarProvider)
- [ ] .ics 파일 다운로드 기능
- [ ] 캘린더 커스터마이징 UI (알림 시간 조정 등)
- [ ] FullCalendar.js 통합 (개인 일정 관리)

---

## 설계 원칙 (Provider Pattern)

**현재**: GoogleCalendarProvider (구현 ✅)
```typescript
class GoogleCalendarProvider implements ICalendarProvider { ... }
```

**미래**: ICalendarProvider (인터페이스만 정의, 구현 대기)
```typescript
class ICalendarProvider implements ICalendarProvider { ... }
```

**CalendarService**: 프로바이더를 교체 가능하게 wrapping
```typescript
const provider = new GoogleCalendarProvider() // 또는 ICalendarProvider()
const service = new CalendarService(provider)
```

이 구조는 **Google Calendar에서 iCalendar로 전환**할 때 CalendarService를 건드리지 않고 Provider만 교체하면 됩니다.

---

## 알려진 제한사항

- **Google OAuth 설정 필수**: Google Cloud 프로젝트 없이는 작동 불가
- **Production 배포 시**: Redirect URI를 배포 도메인으로 수정 필요
- **Token Refresh**: refresh_token이 없으면 토큰 재발급 안 됨 (장기 사용 고려 필요)
- **iCalendar export**: 미구현 상태 (인터페이스만 정의)

---

## 다음 문서

→ `docs/stage7-smart-matching.md` (스마트 매칭 로직)
