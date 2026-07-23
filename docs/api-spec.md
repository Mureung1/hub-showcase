# 알리장 API 명세서 (v0)

PROJECT.md의 기능 정의를 기준으로 작성한 초안. 백엔드는 아직 없는 상태이며, Node.js + Express, REST/JSON을 가정한다. 프론트는 목업 데이터로 먼저 개발하고, 이 문서를 계약으로 삼아 백엔드를 붙인다.

## 공통 사항

- Base URL: `http://localhost:4000/api` (환경변수 `VITE_API_BASE_URL`로 프론트에서 주입, [client.js](../src/api/client.js) 참고)
- 인증: MVP 단계는 단일 사장님 = 단일 브랜드로 가정하고 인증 생략. 추후 세션/JWT 도입 시 이 문서에 추가
- 요청/응답: `Content-Type: application/json`
- 공통 에러 포맷

```json
{
  "error": { "code": "BRAND_PROFILE_NOT_FOUND", "message": "브랜드 프로필이 아직 생성되지 않았습니다." }
}
```

- 날짜/시간: ISO 8601 (`2026-07-09T11:00:00+09:00`)

---

## 데이터 모델

### BrandProfile (2-1)

```ts
{
  id: string
  businessType: string        // 업종
  storeName: string           // 상호명
  mainProduct: string         // 대표 상품(서비스)
  targetCustomer: string      // 주요 고객층
  brandMood: string           // 브랜드 분위기
  strength: string            // 우리 가게만의 강점
  tone: string                // 원하는 말투
  goal: string                // 홍보 목표
  summary: string             // AI가 생성한 한 줄 요약
  keywords: string[]          // AI가 생성한 브랜드 키워드 (# 없이 저장)
  createdAt: string
  updatedAt: string
}
```

### Post (2-4, 2-5, 2-6) — 홍보글/공지사항 공용

```ts
{
  id: string
  type: "promotion" | "notice"
  purpose: "new-menu" | "event" | "general" | null   // 홍보 목적 (promotion만)
  noticeType: string | null    // 공지 유형 (notice만: 휴무/품절/영업시간변경 등)
  title: string
  content: string
  seoKeywords: string[]
  hashtags: string[]
  images: { url: string; placement: string }[]
  thumbnailUrl: string | null
  viewCount: number
  status: "draft" | "scheduled" | "published"
  scheduledAt: string | null
  publishedAt: string | null
  suggestedPublishTime: { datetime: string; reason: string } | null
  createdAt: string
  updatedAt: string

  // purpose = "new-menu"
  menuName: string | null
  launchDate: string | null

  // purpose = "event"
  eventName: string | null
  eventType: "price-discount" | "buy-one-get-one" | "coupon-point" | "bundle" | "seasonal" | null
  eventDetail: string | null
  eventPeriodStart: string | null
  eventPeriodEnd: string | null

  // purpose = "general"
  generalTopic: "atmosphere" | "service" | "location" | "brand-story" | "etc" | null
  generalDetail: string | null
}
```

홍보글 인터뷰 답변(이벤트 유형, 기간, 일반 홍보 주제 등)은 title/content 생성에만 쓰고 버리지 않고,
위처럼 purpose별 필드로 구조화해서 함께 저장한다. 나중에 "이 가게가 어떤 이벤트를 자주 하는지" 같은
인사이트를 뽑을 때도 이 필드들을 그대로 활용할 수 있다.

### Briefing (2-2)

```ts
{
  date: string                 // YYYY-MM-DD
  blogHealth: { score: number; level: "good" | "normal" | "warning" }
  daysSinceLastPost: number
  seasonalTrend: string
  industryTrend: string
  recommendedTopic: string
  reason: string[]             // 추천 근거 bullet
  expectedEffect: {            // 예상 효과 카드 (대시보드 확장 섹션, design-reference/main.html 기준)
    icon: string                // Material Symbols 아이콘명
    color: "secondary" | "tertiary"
    title: string
    description: string
  }[]
}
```

### BlogAnalysis (2-3)

```ts
{
  connected: boolean
  postingCycle: string          // 게시글 작성 주기
  tone: string                  // 문체
  commonPhrases: string[]       // 자주 사용하는 표현
  contentTypes: string[]        // 콘텐츠 유형
  postingPattern: string        // 게시 패턴
  analyzedAt: string
}
```

### Insight (2-7)

```ts
{
  healthScore: {
    total: number               // 0~100
    level: "good" | "normal" | "warning"  // 🟢🟡🔴
    visitorCount: number         // 대시보드 블로그 건강도 카드에 필요해 추가 (WIREFRAME.md 1번 화면)
    breakdown: {
      postingCycle: number
      contentDiversity: number
      seasonalContent: number
      seoUsage: number
      monthlyPlanCompletion: number
    }
  }
  opportunities: {
    id: string
    message: string             // ex) "여름 시즌 콘텐츠가 부족합니다."
    reason: string[]            // Explainable AI 근거
    expectedEffect: string[]
  }[]
}
```

---

## 엔드포인트

### 2-1. AI 브랜드 프로필 생성

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/brand-profile` | 현재 브랜드 프로필 조회. 없으면 404 |
| POST | `/brand-profile/interview` | 인터뷰 답변 1건 전송 → AI의 다음 질문 또는 완료 신호 반환 |
| POST | `/brand-profile` | 인터뷰 완료 후 최종 프로필 생성 (summary/keywords는 서버가 생성) |
| PATCH | `/brand-profile` | 프로필 수정 |

`POST /brand-profile/interview` 요청/응답 예시

```json
// request
{ "step": "businessType", "answer": "디저트 카페" }

// response
{ "nextStep": "storeName", "question": "가게 이름이 어떻게 되나요?" }
```

### 2-2. 오늘의 AI 브리핑

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/briefing/today` | 오늘의 AI 브리핑 조회 (블로그 현황 + 계절/업종 트렌드 기반 추천) |

### 2-3. AI 블로그 운영 분석

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/blog/connect` | 네이버 블로그 연동 (blogId 또는 OAuth 콜백 처리) |
| GET | `/blog/analysis` | 연동된 블로그의 운영 패턴 분석 결과 조회 |

### 2-4. AI 홍보글 작성

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/posts/promotion/interview` | 홍보글 작성 인터뷰 진행 (질문-답변 반복) |
| POST | `/posts/promotion` | 인터뷰 결과로 홍보글 초안 생성 → `Post` 반환 |
| POST | `/posts/:id/images` | 사진 업로드 (multipart/form-data) → 배치 추천 포함 응답 (이후 과제로 이월, 아직 미구현) |

인터뷰는 홍보 목적(`purpose`: `new-menu` / `event` / `general`)에 따라 이후 질문이 갈라진다
(`my-app/src/pages/PromotionInterview.jsx`의 `STEPS_BY_PURPOSE`와 서버
`server/src/services/promotionInterviewFlow.js`가 동일한 구조를 각자 갖고 있음 — 프론트가
아직 이 엔드포인트를 호출하지 않아서 생긴 임시 중복, 프론트 연동 시 한쪽으로 합칠 예정).

`POST /posts/promotion/interview` 요청/응답 예시

```json
// 1) 첫 호출 — step 없이 보내면 첫 질문(목적 선택)을 받는다
// request
{}

// response
{
  "done": false,
  "nextStep": "purpose",
  "question": "무엇을 홍보하시나요?",
  "type": "choice",
  "options": [
    { "value": "new-menu", "label": "신메뉴", "description": "..." },
    { "value": "event", "label": "이벤트 / 할인", "description": "..." },
    { "value": "general", "label": "일반 홍보", "description": "..." }
  ]
}

// 2) 목적 선택 이후 — step이 "purpose"가 아니면 어느 분기인지 알 수 있도록
//    purpose를 함께 보내야 한다 (step id가 분기마다 겹칠 수 있어서, 예: "photo")
// request
{ "step": "event-name", "answer": "여름 시즌 빙수 20% 할인", "purpose": "event" }

// response
{ "done": false, "nextStep": "event-type", "question": "어떤 이벤트인가요?", "type": "choice", "options": [...] }

// 3) 마지막 질문까지 답하면 done: true
{ "done": true, "nextStep": null }
```

`POST /posts/promotion` 요청 예시 (인터뷰에서 모은 답변 전체를 한 번에 전송, 각 필드 키는
`PromotionInterview.jsx`의 질문 step id와 동일하게 맞췄다)

```json
// request (purpose = "event"인 경우)
{
  "purpose": "event",
  "event-name": "여름 시즌 빙수 20% 할인",
  "event-type": "seasonal",
  "event-detail": "아이스 메뉴 전체 20% 할인, 스탬프 5개 이상 고객 대상",
  "event-period": { "start": "2026-07-20", "end": "2026-07-25" }
}

// response: Post (title/content는 지금은 LLM 없이 규칙 기반 최소 템플릿으로 생성됨)
```

`purpose`별 필수 답변

| purpose | 필수 필드 |
| --- | --- |
| `new-menu` | `menu-name`, `launch-date` |
| `event` | `event-name`, `event-type`, `event-detail`, `event-period`(`start`/`end`) |
| `general` | `general-topic`, `general-detail` |

### 2-5. AI 공지사항 작성

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/posts/notice/interview` | 공지 작성 2~3단계 인터뷰 |
| POST | `/posts/notice` | 공지 생성 → `Post` 반환 |

### 2-6. AI 검토 및 예약 발행

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/posts` | 목록 조회 (`?status=draft\|scheduled\|published`) |
| GET | `/posts/:id` | 단건 조회 |
| PATCH | `/posts/:id` | 사용자 수정 내용 반영 |
| GET | `/posts/:id/suggested-time` | 업종/계절/게시 패턴 기반 추천 발행 시간 조회 |
| POST | `/posts/:id/schedule` | 예약 발행 시간 확정 (`{ "scheduledAt": "..." }`) |
| DELETE | `/posts/:id/schedule` | 예약 취소 |

실제 발행은 서버 스케줄러(node-cron 등)가 `scheduledAt`을 감시하다 네이버 블로그 API로 발행 후 `status`를 `published`로 갱신하는 방식을 가정. 수동 즉시발행이 필요하면 `POST /posts/:id/publish` 추가 예정.

### 2-7. AI 운영 인사이트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/insights/health-score` | 블로그 건강도 점수/등급/세부 항목 |
| GET | `/insights/opportunities` | AI 홍보 기회 추천 목록 (근거+예상효과 포함) |

---

## 미결정 사항 (다음에 정하기)

- 네이버 블로그 실제 발행 연동 방식 (공식 API 권한 범위 vs 스크래핑)
- 이미지 저장소 (S3 등) 및 업로드 용량 제한
- 인증/세션 방식 도입 시점
- LLM 호출 비용 관리 (인터뷰 단계별 호출 vs 배치 생성)
