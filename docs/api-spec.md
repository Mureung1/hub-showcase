# 알리장 API 명세서 (v0)

PROJECT.md의 기능 정의를 기준으로 작성한 초안. 백엔드는 아직 없는 상태이며, Node.js + Express, REST/JSON을 가정한다. 프론트는 목업 데이터로 먼저 개발하고, 이 문서를 계약으로 삼아 백엔드를 붙인다.

## 공통 사항

- Base URL: `http://localhost:4000/api` (환경변수 `VITE_API_BASE_URL`로 프론트에서 주입, [client.js](../src/api/client.js) 참고)
- 인증: MVP 단계는 단일 사장님 = 단일 브랜드로 가정하고 API 자체엔 인증(세션/JWT)이 없다. 온보딩의 네이버 로그인(2-3, `/auth/naver*`)은 지금은 blogId를 알아내기 위한 용도로만 쓰고, 로그인 이후 요청을 보호하는 세션까지는 만들지 않는다 — 보안 강화 차원에서 필요하다고 판단되면 별도로 세션/JWT 인증을 도입한다 (8. 이후 과제 참고)
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
  naverId: string | null      // 네이버 로그인(OAuth)으로 확인된 사용자 식별자
  blogId: string | null       // 연동된 네이버 블로그 ID (blog.naver.com/{blogId})
  blogIdConfirmed: boolean    // blogId를 사용자가 확정했는지 (자동 후보 확인 또는 수동 입력)
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
  publishedUrl: string | null  // 반자동 발행 후 사용자가 직접 입력한 실제 네이버 게시글 URL
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
  connected: boolean            // blogId 연동 + RSS 조회 성공 여부
  postCount: number             // RSS 피드에 실린 최근 게시물 수 (전체 게시물 수 아님 — 네이버 RSS가 최근 항목만 제공)
  latestPostDate: string | null // 최근 게시물의 ISO 날짜, 게시물 없으면 null
  postingCycle: string | null   // "주 2~3회" 등 pubDate 간격 기반 추정 문구, 계산 불가 시 null
  analyzedAt: string
}
```

`tone`/`commonPhrases`/`contentTypes`/`postingPattern`(문체·자주 쓰는 표현·콘텐츠 유형 등 내용 기반 분석)은 RSS(title/link/pubDate만 제공)만으로는 계산할 수 없어 스키마에서 제외했다 — LLM 연동 시 별도로 추가 예정 ([8. 이후 과제](#8-이후-과제-범위-밖-다음-발전-방향) 참고).

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
| GET | `/auth/naver` | 네이버 로그인(OAuth) 시작 — 브라우저를 네이버 인증 페이지로 리다이렉트 |
| GET | `/auth/naver/callback` | 네이버 OAuth 콜백 — 로그인 처리 후 온보딩 화면으로 다시 리다이렉트 |
| GET | `/blog/analysis` | 연동된 블로그의 운영 패턴 분석 결과 조회 |

**네이버 로그인 + blogId 확보 흐름 (2026-07-28 결정)**: 네이버 블로그 데이터 API는 폐지됐지만 "네이버 아이디로 로그인"(OAuth)은 지금도 공식 지원된다. 다만 이 OAuth의 프로필 응답(`/v1/nid/me`)엔 blogId가 없어서, 로그인 후 얻은 `id`/`닉네임`으로 실제 `blog.naver.com/{후보}`가 존재하는지 서버가 확인하고 사용자에게 "맞나요?" 확인을 받는 방식을 쓴다. fetch 기반 API 호출이 아니라 **브라우저 전체 리다이렉트**로 동작한다.

1. 프론트: "네이버로 로그인" 클릭 → 온보딩 1단계 입력값을 `sessionStorage`에 저장 → `window.location.href`로 `GET /auth/naver` 이동 (풀 페이지 이동, fetch 아님)
2. 서버: 네이버 인증 페이지로 리다이렉트. 사용자는 네이버의 실제 로그인 페이지에 본인이 직접 로그인한다 — 비밀번호가 이 서버를 거치지 않는다
3. 네이버 → `GET /auth/naver/callback?code=...&state=...`로 콜백
4. 서버: `code`를 토큰으로 교환 → `/v1/nid/me`로 `{ id, nickname }` 조회 → `nickname`(우선) 또는 `id`로 `blog.naver.com/{후보}` 존재 여부 확인
5. 서버 → 프론트 `/onboarding`으로 리다이렉트하며 쿼리 파라미터로 결과 전달:
   - 성공 + 후보 존재: `?naverId=...&blogIdCandidate=...&candidateExists=true`
   - 성공 + 후보 불명: `?naverId=...&blogIdCandidate=...&candidateExists=false` (후보는 확인 안 된 추정값, 수동 입력 폼 프리필용)
   - 실패: `?naverAuthError=NAVER_OAUTH_NOT_CONFIGURED|NAVER_OAUTH_TOKEN_FAILED|NAVER_OAUTH_PROFILE_FAILED|NAVER_OAUTH_STATE_INVALID`
6. 프론트: `sessionStorage`에서 1단계 입력값을 복원하고, `candidateExists=true`면 "blog.naver.com/{후보} 맞나요?" 확인 카드를, 아니면(또는 "아니요" 선택 시) blogId 직접 입력 폴백을 보여준다
7. 최종 확정된 `naverId`/`blogId`/`blogIdConfirmed`는 온보딩 3단계의 `POST /brand-profile` 호출에 함께 실려 저장된다 (이 단계 전까지는 서버에 저장하지 않음)

blog.naver.com 존재 여부 판별은 정식 API가 없어 "존재하지 않는 블로그입니다" 문구 유무로 추정하는 휴리스틱이다 — 그래서 항상 사용자 확인을 거치게 하고 최종 신뢰 소스로 쓰지 않는다. `GET /blog/analysis`는 blogId가 연동돼 있으면 RSS(`rss.blog.naver.com/{blogId}.xml`)를 조회해 게시물 수/최근 게시일/게시 주기를 계산한다 — blogId가 없거나 RSS 조회에 실패하면(비공개 블로그 등) `connected: false`와 빈 값을 반환한다.

### 2-4. AI 홍보글 작성

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/posts/promotion/interview` | 홍보글 작성 인터뷰 진행 (질문-답변 반복) |
| POST | `/posts/promotion` | 인터뷰 결과로 홍보글 초안 생성 → `Post` 반환 |
| POST | `/posts/:id/images` | 사진 업로드 (multipart/form-data, 필드명 `image`) → Supabase Storage(`post-images` 버킷)에 저장, `thumbnailUrl`/`images`에 반영된 `Post` 반환. 사진을 분석해 배치를 추천하는 AI 기능은 비전 모델이 필요해 범위 밖(이후 과제로 유지) |

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
| GET | `/posts/:id/detect-published` | 연동된 블로그 RSS에서 이 글과 비슷한 최근 글 자동 탐지 |
| POST | `/posts/:id/schedule` | (현재 프론트에서는 미사용) 예약 발행 시간 확정 `{ "scheduledAt": "..." }` — 실제 예약 실행은 네이버 자체 기능에 맡기므로 지금은 호출하는 화면이 없음 |
| DELETE | `/posts/:id/schedule` | 위 예약 취소 |
| DELETE | `/posts/:id` | 게시글 기록 삭제. 네이버에 이미 올라간 글 자체는 지우지 않고 우리 쪽 기록만 지움 |
| GET | `/posts/:id/check-deleted` | 저장된 `publishedUrl`을 서버가 직접 요청해서 네이버에서 삭제됐는지 확인. `{ "result": "exists" \| "deleted" \| "unknown" \| "no_url" }` — 404/410이거나 응답 본문에 "삭제된 게시물" 류 문구가 있으면 `deleted`, 그 외 정상 응답이면 `exists`, 네트워크 오류 등으로 판별 불가하면 `unknown`. 확정적인 판별이 아닌 휴리스틱이라 프론트가 결과를 그대로 믿지 않고 사용자 확인을 거쳐야 함 |

**반자동 발행 흐름 (2026-07-27 결정, 2026-07-28 게시 완료 확인 방식 보강)**: 네이버 블로그 포스팅 공식 API가 폐지되어 완전 자동 발행(Playwright 등) 대신 반자동 방식을 쓴다. 서버가 대신 발행하지 않고, 프론트에서 아래 순서로 처리한다.

1. 사용자가 "네이버에 게시" 클릭 → 프론트가 `title`+`content`를 클립보드에 복사하고 네이버 블로그 글쓰기 페이지를 새 탭으로 연다 (백엔드 호출 없음)
2. 사용자가 네이버 에디터에 붙여넣고 직접 게시(또는 네이버 자체 예약 발행 기능으로 예약)
3. 앱으로 돌아와 "게시 확인하기" 클릭 → `GET /posts/:id/detect-published`가 연동된 블로그의 RSS(`rss.blog.naver.com/{blogId}.xml`)에서 제목이 비슷하고 30분 이내에 올라온 글을 찾아본다
   - 찾으면(`{ "found": true, "url": "..." }`) "이 글이 맞나요?" 확인 후 맞으면 확정
   - 못 찾으면(`{ "found": false, "reason": "NO_BLOG_ID" | "NOT_FOUND" }`, 또는 "아니요" 선택 시) 게시된 글 URL을 직접 입력하는 폴백으로 넘어감
4. 확정되면 `PATCH /posts/:id`에 `{ "status": "published", "publishedAt": "...", "publishedUrl": "..." }` 전달

RSS 제목 매칭은 네이버가 "이 글이 그 글이다"를 확인해주는 API가 없어서 쓰는 휴리스틱이라 오탐/누락 가능성이 있다 — 그래서 항상 사용자 확인을 거치게 하고 최종 신뢰 소스로 쓰지 않는다.

`GET /posts/:id/suggested-time`은 여전히 AI가 추천 요일/시간을 보여주는 용도로 쓰이지만, 실제 예약 실행은 네이버 자체 기능에 맡기고 이 서버는 시간을 추천만 한다 — 무인 자동 발행(서버 스케줄러 + 네이버 API)은 [backlog-12days.md](backlog-12days.md)의 "8. 이후 과제"로 유지.

### 2-7. AI 운영 인사이트

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/insights/health-score` | 블로그 건강도 점수/등급/세부 항목 |
| GET | `/insights/opportunities` | AI 홍보 기회 추천 목록 (근거+예상효과 포함) |

---

## 미결정 사항 (다음에 정하기)

- ~~네이버 블로그 실제 발행 연동 방식~~ → 2026-07-27 반자동(클립보드+새 탭) 방식으로 결정, 2-6 섹션 참고
- 이미지 저장소 (S3 등) 및 업로드 용량 제한
- 인증/세션 방식 도입 시점
- LLM 호출 비용 관리 (인터뷰 단계별 호출 vs 배치 생성)
