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
  purpose: string | null       // 홍보 목적 (promotion만)
  noticeType: string | null    // 공지 유형 (notice만: 휴무/품절/영업시간변경 등)
  title: string
  content: string
  seoKeywords: string[]
  hashtags: string[]
  images: { url: string; placement: string }[]
  thumbnailUrl: string | null
  status: "draft" | "scheduled" | "published"
  scheduledAt: string | null
  publishedAt: string | null
  suggestedPublishTime: { datetime: string; reason: string } | null
  createdAt: string
  updatedAt: string
}
```

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
  expectedEffect: string[]     // 예상 효과 bullet
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
| POST | `/posts/:id/images` | 사진 업로드 (multipart/form-data) → 배치 추천 포함 응답 |

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
