# API 명세

MVP(P0/P1) API 계약을 정의한다. 도메인 enum은 2026-07-15 기준 실제 Supabase DB의 `check` 제약을 기준으로 확인했다.

- 데이터는 모두 `프론트 → /api (FastAPI) → Supabase` 경로를 사용한다. Auth만 프론트가 Supabase에 직접 연결한다.
- 요청/응답 필드는 camelCase이며, snake_case 변환은 백엔드 Pydantic 스키마에서만 한다.
- 요청 스키마는 `extra="forbid"`로 알 수 없는 필드를 `422`로 거부한다.
- `userId`는 요청에서 받지 않고 access token에서만 얻는다.

## 이번 설계 결론

| 결정 항목 | 결론 | 근거 |
| --- | --- | --- |
| 관심사 최소 개수 | **1개, 최대 3개. 빈 배열은 `422`** | 온보딩의 다음 버튼이 0개일 때 비활성이고, 추천 함수는 사용자 관심사가 없으면 후보를 만들 수 없다. |
| 저장 관심사 조회 | **`GET /api/user-interests` 제공** | 온보딩 이력 판단과 재설정 시 기존 선택 복원에 모두 필요하며, 데이터 `/api` 경유 원칙에 맞다. |
| `missionPrompt` 생성 주체 | **서버** | 요청은 `missionType`만 받고, 서버가 현재 확정 프롬프트를 채워 실제 노출 문구를 기록한다. 클라이언트 위조와 프론트/서버 중복 정의를 막는다. |
| 읽기·미션 흐름 | **하이라이트 없이 글 전체를 대상으로 미션을 낸다** | 원문(외부 저자 원글)을 읽고 돌아오면 글 전체에 대한 미션 하나를 던진다. 앱 내 하이라이트도, 문장 직접 입력도 하지 않는다. `anchorType`은 `whole_content`, `selectedQuote`는 `null`이다. |
| 읽기 참여 측정 | **MVP에서 하지 않음** | 하이라이트도 문장 입력도 없으면 "실제로 읽었는지" 신호가 약하다. 읽었다고 보고 미션을 준다. `POST /api/articles/{id}/open`과 engagement token은 만들지 않는다. |
| 초기 추천 | **실제 `get_recommended_articles` 규칙 기반 추천 함수 사용** | 클릭 수 데이터와 노출 이력 테이블이 없는 현재 스키마에서 인기글은 계산할 수 없다. 관심사 일치·최신성·소스 품질·반복 패널티를 사용한다. |
| 에러 본문 | **공통 `{ code, message, details? }`** | 프론트가 상태 코드별 문구와 재시도 동작을 안정적으로 분기할 수 있다. FastAPI 검증 오류도 예외 처리기로 같은 외피에 맞춘다. |

`03-feature-details.md`와 `04-scenario-ia.md`의 앱 내 문장 하이라이트 흐름은 저작권(본문 전문 저장 금지)과 남의 페이지에 UI를 얹을 수 없다는 제약 때문에 사용하지 않는다. 화면 흐름은 **오늘의 글 → 원문 읽기(외부) → 미션(글 전체 대상) → 한 줄 기록**이다. `officialExcerpt`는 카드의 소개문일 뿐 하이라이트 대상이 아니다.

## 공통 규약

### 인증

- 공개: `GET /api/health`, `GET /api/interests`
- 그 외 엔드포인트: `Authorization: Bearer <access_token>` 필수
- 토큰 누락·만료·위조는 `401`이다.
- 사용자 소유 데이터는 access token의 사용자 ID로만 조회·변경한다.

### 공통 에러 응답

```json
{
  "code": "VALIDATION_ERROR",
  "message": "요청 값을 확인해 주세요.",
  "details": [
    { "field": "interestIds", "reason": "최소 1개를 선택해야 합니다." }
  ]
}
```

- `code`: 프론트 분기용 고정 문자열
- `message`: 사용자에게 표시 가능한 기본 문구
- `details`: 선택 필드. 검증 실패의 필드별 원인처럼 필요한 경우에만 포함
- DB 오류 메시지, SQL, 스택 트레이스, 토큰을 응답이나 로그에 노출하지 않는다.

| 상태 | `code` | 사용 조건 |
| --- | --- | --- |
| `400` | `INVALID_REQUEST` | 스키마는 맞지만 리소스 조합이나 상태가 유효하지 않음 |
| `401` | `UNAUTHORIZED` | 토큰 없음·만료·위조 |
| `403` | `FORBIDDEN` | 인증됐지만 해당 리소스에 권한 없음 |
| `404` | `NOT_FOUND` | 리소스가 없거나 사용자에게 공개할 수 없음 |
| `409` | `CONFLICT` | 현재 상태와 요청이 충돌함 |
| `422` | `VALIDATION_ERROR` | 필드 누락·타입·enum·길이·개수·알 수 없는 필드 오류 |
| `429` | `RATE_LIMITED` | 요청 한도 초과 |
| `500` | `INTERNAL_ERROR` | 예상하지 못한 서버 오류 |

FK/check 위반을 그대로 `500`으로 보내지 않는다. API에서 사전 검증 가능한 값은 `422`, 요청 시점의 리소스 부재는 `404`, 상태 충돌은 `409`로 변환한다.

### 도메인 값

실제 DB `check` 제약의 허용값은 다음과 같다.

| 대상 | 허용값 |
| --- | --- |
| `interests.launch_status` | `active`, `curated_only`, `hidden`, `preparing` |
| `interests.risk_level` | `low`, `medium`, `high` |
| `articles.content_type` | `article`, `blog`, `video` |
| `articles.source_type` | `news`, `official_blog`, `expert_article` |
| `articles.access_type` | `free`, `partial_free`, `paywalled`, `unknown` |
| `articles.url_status` | `active`, `broken`, `paywalled`, `removed` |
| `mission_records.mission_type` | `question`, `rebuttal`, `connection`, `expression` |
| `mission_records.anchor_type` | `whole_content`, `highlight`, `timestamp`, `user_quote` |

## 엔드포인트 목록

| 메서드 | 경로 | 인증 | 기능 |
| --- | --- | --- | --- |
| GET | `/api/health` | — | 헬스체크 |
| GET | `/api/interests` | — | 선택 가능한 관심사 목록 |
| GET | `/api/user-interests` | 필요 | 온보딩 이력과 저장 관심사 조회 |
| POST | `/api/user-interests` | 필요 | 관심사 전체 교체 |
| GET | `/api/articles/today` | 필요 | 오늘의 추천 1~3개 |
| GET | `/api/articles/{articleId}` | 필요 | 미션 화면에 표시할 글 메타데이터 조회 |
| POST | `/api/mission-records` | 필요 | 완료된 사고 기록 저장 |
| GET | `/api/mission-records` | 필요 | 나의 깸 목록 |

---

## GET /api/health

**응답 `200`**

```json
{ "status": "ok" }
```

## GET /api/interests

선택 가능한 공개 관심사 목록이다.

**응답 `200`**

```json
[
  {
    "id": "dc0cef12-...",
    "name": "AI",
    "displayOrder": 1,
    "launchStatus": "active",
    "riskLevel": "low",
    "emptyStateMessage": null
  }
]
```

- `launchStatus in ('active', 'curated_only')`만 포함한다.
- `displayOrder` 오름차순이다.

## GET /api/user-interests

저장된 관심사와 온보딩 완료 여부를 한 번에 반환한다. 이력 판단을 단순히 배열 길이에 맡기지 않고 응답에 명시한다.

**응답 `200`**

```json
{
  "hasCompletedOnboarding": true,
  "interests": [
    {
      "id": "dc0cef12-...",
      "name": "AI",
      "displayOrder": 1,
      "launchStatus": "active",
      "selectable": true
    }
  ]
}
```

- 저장 행이 1개 이상이면 `hasCompletedOnboarding = true`다.
- 저장 행이 없으면 `200`과 `{ "hasCompletedOnboarding": false, "interests": [] }`를 반환한다. 빈 상태는 오류가 아니다.
- 응답 순서는 `interests.display_order` 오름차순이다.
- `hidden`/`preparing`으로 바뀐 기존 관심사도 `selectable: false`로 포함해 사용자가 상태를 보고 해제할 수 있게 한다. 단, 재저장 요청에서는 선택 불가능하므로 그대로 유지하려면 운영 정책이 필요하다.

**에러**: `401`.

## POST /api/user-interests

요청 목록으로 사용자의 관심사를 **전체 교체**한다.

**요청**

```json
{ "interestIds": ["dc0cef12-...", "09384a82-..."] }
```

**응답 `201`**

```json
{ "interestIds": ["dc0cef12-...", "09384a82-..."] }
```

**검증과 에러**

| 상황 | 결과 |
| --- | --- |
| 1~3개의 서로 다른 선택 가능 ID | `201` |
| 빈 배열, 4개 이상, 중복 ID | `422 VALIDATION_ERROR` |
| UUID 형식 오류, 알 수 없는 필드 | `422 VALIDATION_ERROR` |
| 존재하지 않는 ID | `422 VALIDATION_ERROR` |
| `hidden`/`preparing` ID | `422 VALIDATION_ERROR` |
| 토큰 없음·위조 | `401 UNAUTHORIZED` |

- 허용되는 상태는 `active`, `curated_only`다.
- 삭제 후 삽입을 한 트랜잭션으로 처리해야 한다. 현재 REST 호출 두 번으로 처리하면 삽입 실패 시 기존 설정이 사라지므로 RPC/DB 함수 또는 백엔드 DB 트랜잭션이 필요하다.

---

## GET /api/articles/today

현재 사용자의 관심사에 맞는 추천을 최대 3개 반환한다.

**쿼리**

- `limit`: 선택, `1..3`, 기본값 `3`

**응답 `200`**

```json
{
  "items": [
    {
      "id": "...",
      "title": "숏폼 시대, 우리는 정말 더 많이 이해하고 있을까",
      "translatedTitle": null,
      "sourceName": "요즘IT",
      "sourceType": "expert_article",
      "contentType": "article",
      "publishedAt": "2026-07-14T03:00:00Z",
      "interestTags": [{ "id": "...", "name": "IT·개발" }],
      "officialExcerpt": "원출처가 제공한 소개문",
      "translatedExcerpt": null,
      "thumbnailUrl": null,
      "readingTimeMinutes": 5,
      "language": "ko",
      "accessType": "free",
      "originalUrl": "https://example.com/article",
      "recommendationReason": "IT·개발 관심사와 맞는 글이에요."
    }
  ],
  "emptyStateMessage": null
}
```

**초기 추천 규칙**

1. 실제 DB 함수 `get_recommended_articles(user_id, limit)`를 호출한다.
2. 후보는 사용자 관심사 태그가 하나 이상 일치하고, 완료한 `mission_records`가 없는 글이다.
3. `urlStatus = active`, `qualityScore >= 0.65`, 소스 `trustLevel in (high, medium)`, `defaultExposure = primary`만 허용한다.
4. `accessType = free`를 자동 추천한다. `partial_free`는 `content_strategy.md` 최종 운영 원칙에 따라 운영자가 무료 범위를 확인해 수동 큐레이션한 글만 허용해야 한다. 현재 DB 함수가 `free`, `partial_free`를 모두 자동 허용하므로 구현 전에 함수 조건을 맞춰야 한다.
5. 정렬 점수는 관심사 일치 + 최신성 + 소스 품질 - 최근 14일 같은 소스 반복 - 태깅된 논쟁 주제의 같은 stance 반복이다.
6. 동점이면 결과가 흔들리지 않도록 `published_at desc nulls last, article_id`를 보조 정렬로 추가한다.

클릭 수 인기글, 연령·성별 협업 필터링, “오늘” 배정 고정, 미완료 글 반복 방지는 필요한 데이터/테이블이 없어 MVP에서 제외한다. 이 API는 호출 시점의 상위 후보를 반환하며 달력 날짜별 고정 배정을 보장하지 않는다.

**빈 상태**

- 관심사가 없으면 `200`, `items: []`, 온보딩 이동용 메시지를 반환한다.
- 후보가 없으면 `200`, `items: []`와 선택 관심사의 `emptyStateMessage`를 우선 반환한다.
- 다른 관심사 글이나 영어 optional 소스를 자동으로 섞지 않는다.
- `recommendationReason`은 점수 전체를 설명하지 않고, 가장 높은 일치 관심사와 적용된 반복 보정 중 하나만 정해진 문구로 반환한다. AI 생성 문구는 사용하지 않는다.
- 화면 라벨은 `sourceType`을 기준으로 `news → 뉴스`, `official_blog → 공식 블로그`, `expert_article → 전문 아티클`로 표시한다. DB에 없는 `칼럼`/`뉴스레터` enum을 API가 임의로 만들지 않는다.

**에러**: `401`, 잘못된 `limit`의 `422`, 추천 함수 실패의 `500`.

## GET /api/articles/{articleId}

앱 내부 본문이 아니라 원문 이동과 미션 시작에 필요한 메타데이터를 반환한다.

**응답 `200`**

```json
{
  "id": "...",
  "title": "...",
  "translatedTitle": null,
  "sourceName": "Toss Tech",
  "sourceType": "official_blog",
  "contentType": "blog",
  "publishedAt": "2026-07-14T03:00:00Z",
  "author": null,
  "officialExcerpt": "원출처가 제공한 소개문",
  "translatedExcerpt": null,
  "readingTimeMinutes": 5,
  "language": "ko",
  "accessType": "free",
  "urlStatus": "active",
  "originalUrl": "https://example.com/article"
}
```

- `body`, `sentences`, AI 요약을 반환하지 않는다. 앱은 원문을 대체하지 않는다.
- `originalUrl`은 미션 화면의 "원문 다시 보기"와 나의 깸의 원문 링크에 쓴다.
- 추천 가능한 글이 아니더라도 과거 기록에서 접근할 수 있으므로 존재하는 메타데이터는 반환한다. 단, `removed`/`broken`/`paywalled`이면 상태를 반환하고 프론트가 원문 버튼을 비활성화한다.

**에러**: 토큰 `401`, 존재하지 않는 ID `404`, UUID 형식 `422`.

---

## POST /api/mission-records

완료된 사고 기록만 저장한다. 임시저장 API가 아니다.

**요청**

```json
{
  "articleId": "...",
  "missionType": "connection",
  "userAnswer": "우리 팀 온보딩도 결국 같은 문제다."
}
```

`missionPrompt`, `userId`, `anchorType`, `selectedQuote`는 요청에서 받지 않는다. 서버가 채운다.

**응답 `201`**

```json
{
  "id": "...",
  "articleId": "...",
  "missionType": "connection",
  "missionPrompt": "내 상황이나 프로젝트와 연결해보면?",
  "userAnswer": "우리 팀 온보딩도 결국 같은 문제다.",
  "selectedQuote": null,
  "anchorType": "whole_content",
  "createdAt": "2026-07-15T09:02:00Z"
}
```

**서버 규칙**

- `missionType`으로 서버의 고정 프롬프트를 조회해 `missionPrompt`에 저장한다.
- MVP 프롬프트는 `question: 이 글의 핵심 주장은 뭐지?`, `rebuttal: 이 주장에 반대한다면?`, `connection: 내 상황이나 프로젝트와 연결해보면?`, `expression: 이 글이 놓친 관점은 뭐지?`다.
- **미션은 글 전체를 대상으로 한다.** 서버가 `anchorType = whole_content`, `selectedQuote = null`로 고정 저장한다. 하이라이트·문장 입력이 없으므로 클라이언트가 이 두 값을 보내지 않는다.
- 읽기 참여 지표(`openedOriginalAt`, `returnedFromOriginalAt`, `minimumEngagementMet`)는 MVP에서 채우지 않는다. DB 기본값(`null`, `null`, `false`)으로 둔다.

**무성의 답변**

- 앞뒤 공백 제거 후 빈 문자열은 `422` (DB 제약 `char_length(user_answer) > 0`).
- MVP는 이 이상의 무성의 답변 판정(차단 목록·최소 글자 수·AI 판정)을 하지 않는다. 오탐 위험이 크고, 실제 사용 데이터를 본 뒤 결정한다. `03-feature-details.md`의 "조금 더 생각해봐요" 유도는 프론트 UX로 처리하되 저장은 막지 않는다.

**에러**

| 상황 | 결과 |
| --- | --- |
| 알 수 없는 `missionType`, 빈 답변 | `422` |
| 요청에 `missionPrompt`, `userId`, `anchorType`, `selectedQuote` 등 서버가 채우는 필드 포함 | `422` (`extra="forbid"`) |
| article 없음 | `404` |
| 동일 사용자가 동일 article에 다시 제출 | 현재 DB에는 unique 제약이 없어 허용됨. 중복 완료를 막으려면 사람 결정 필요 (아래 결정 항목) |
| 토큰 없음·위조 | `401` |

## GET /api/mission-records

본인의 완료된 사고 기록을 최신순으로 반환한다.

**쿼리**

- `interestId`: 선택. 해당 관심사 태그의 글만 조회
- `cursor`: 선택. 이전 응답의 `nextCursor`
- `limit`: 선택, `1..50`, 기본 `20`

**응답 `200`**

```json
{
  "items": [
    {
      "id": "...",
      "articleId": "...",
      "articleTitle": "...",
      "sourceName": "요즘IT",
      "interestTags": [{ "id": "...", "name": "IT·개발" }],
      "missionType": "connection",
      "missionPrompt": "내 상황이나 프로젝트와 연결해보면?",
      "userAnswer": "...",
      "selectedQuote": null,
      "anchorType": "whole_content",
      "originalUrl": null,
      "urlStatus": "removed",
      "createdAt": "2026-07-14T03:00:00Z"
    }
  ],
  "nextCursor": null
}
```

- 기본 정렬은 `created_at desc, id desc`다.
- cursor는 두 정렬 키를 함께 담아 동일 시각 누락/중복을 막는다.
- `interestId`가 사용자의 선택 관심사일 필요는 없고, 기록의 콘텐츠 태그 필터다.
- 삭제된 원문도 기록은 반환하되 `originalUrl = null`, `urlStatus = removed`로 반환한다.
- AI 재사고 질문 생성은 MVP에서 제외한다. 별도 엔드포인트도 만들지 않는다.

**에러**: `401`, 잘못된 쿼리·cursor `422`.

---

## MVP에서 제외하는 API와 기능

### LIFO 임시저장

사용자당 3개 draft, LIFO 복원은 `mission_records`와 의미가 다르고 현재 draft 테이블·상태·API가 없다. 미완료 이력을 저장하지 않기로 한 DB 결정과도 충돌하므로 MVP API에서 제외한다. 프론트 로컬 저장만 쓰면 기기 간 복원과 사용자별 3개 보장을 할 수 있어 요구사항을 충족했다고 볼 수 없다.

### AI 재사고 질문

생성 비용, 프롬프트/안전 기준, AI 생성 표시 계약이 추가되므로 P1 이후로 미룬다. MVP `GET /api/mission-records`는 기록 조회만 한다.

### 클릭 수 인기글·협업 필터링·오늘 배정

클릭 이벤트, 사용자 프로필, `article_assignments`가 없으므로 MVP에서 제공하지 않는다. 현재 추천 함수의 규칙 기반 결과를 사용한다.

## 완료 기준 체크리스트

### 공통·보안

- [ ] 모든 데이터 API가 `/api`를 거치고 프론트가 테이블을 직접 읽고 쓰지 않는다.
- [ ] 인증 API에서 토큰 누락·만료·위조가 `401`이며 DB 변경이 없다.
- [ ] 본문 `userId`, `missionPrompt`, 알 수 없는 필드는 `422`로 실패한다.
- [ ] 응답은 camelCase이고 enum은 실제 DB `check` 값과 일치한다.
- [ ] 모든 오류가 `{ code, message, details? }` 외피를 사용하고 내부 DB 메시지를 노출하지 않는다.
- [ ] 다른 사용자 토큰으로 관심사·미션 기록을 조회하거나 변경할 수 없다.

### 관심사

- [ ] 저장 전 `GET /api/user-interests`는 `200`, `hasCompletedOnboarding=false`, 빈 배열이다.
- [ ] 관심사 1~3개 저장과 재저장이 정확히 전체 교체되고 `201`이다.
- [ ] 빈 배열, 4개, 중복, 존재하지 않는 ID, `hidden`/`preparing` ID가 `422`로 실패하며 기존 값이 유지된다.
- [ ] 재조회 시 `hasCompletedOnboarding=true`이고 `displayOrder` 순으로 반환한다.

### 추천·콘텐츠

- [ ] 추천은 1~3개이며 사용자 관심사 태그가 하나 이상 일치한다.
- [ ] 완료한 글, inactive URL, 품질 미달, low-trust, optional/advanced 소스가 결과에 없다.
- [ ] 검증 없는 `partial_free`, `paywalled`, `unknown` 콘텐츠가 자동 추천되지 않는다.
- [ ] 후보가 없거나 관심사가 없어도 `200` 빈 목록이며 `500`이 아니다.
- [ ] 상세 응답에 본문 전문·문장 배열·AI 요약이 없다.

### 미션·나의 깸

- [ ] 요청에 없는 `missionPrompt`가 서버의 `missionType`별 문구로 저장된다.
- [ ] 서버가 `anchorType = whole_content`, `selectedQuote = null`로 고정 저장한다.
- [ ] 공백 답변은 `422`이고 기록이 생성되지 않는다.
- [ ] 요청에 `missionPrompt`/`anchorType`/`selectedQuote`/`userId`를 넣으면 `422`다.
- [ ] 읽기 참여 세 필드는 저장되지 않고 DB 기본값으로 남는다.
- [ ] 나의 깸은 `createdAt desc, id desc`이고 cursor 페이지 사이에 누락·중복이 없다.
- [ ] 삭제된 원문 기록은 유지되고 원문 URL은 노출하지 않는다.

## 확정된 제품 방향 (2026-07-15)

읽기·미션 흐름을 **하이라이트 없이 글 전체 대상**으로 확정했다. 결정 근거는 응더님과의 논의(`docs/notes/`)에 있다.

- 앱은 원문 본문을 저장·표시하지 않는다. 원문(외부 저자 원글)을 읽고 돌아온다.
- 미션은 특정 문장이 아니라 **글 전체**에 대해 낸다. `anchorType = whole_content`.
- 앱 내 하이라이트, 문장 직접 입력, 발췌문 하이라이트를 모두 하지 않는다.
- 읽기 참여 측정(`POST /api/articles/{id}/open` + engagement token)은 MVP에서 만들지 않는다.
- 흐름: **오늘의 글 → 원문 읽기(외부) → 미션(글 전체) → 한 줄 기록**.

## 여전히 사람이 결정해야 하는 항목

### 1. 관심사 전체 교체의 트랜잭션 처리

`POST /api/user-interests`는 삭제 후 삽입이다. 삽입이 실패하면 관심사가 0개로 남는다.

- **어제(07-14) 결정: Sprint 1은 트랜잭션 없이, Sprint 2에서 RPC로 승격.** (`progress.md` 결정 기록)
- 이번 설계: RPC/DB 함수로 한 트랜잭션 처리를 요구.

**두 문서가 충돌한다. 하나로 정해야 한다.** 온보딩 첫 저장은 기존 행이 0개라 실패 창이 없어 어제 결정(트랜잭션 없이)이 MVP에 무리 없다. 설정 재저장까지 안전하게 하려면 RPC가 필요하다.

### 2. 동일 글에 여러 미션 기록을 허용할지

현재 추천 함수는 한 번 완료한 글을 제외하지만 DB에는 `(user_id, article_id)` unique가 없어 직접 재요청하면 중복 기록이 가능하다.

- 1회만 허용: API에서 `409`, DB unique 제약 추가. MVP의 “완료 글 제외”와 가장 일관된다.
- 여러 번 허용: 재사고 기능에 유리하지만 어떤 기록이 “당일 완료”인지 구분할 배정/날짜 모델이 필요하다.

**권장: MVP는 1회만 허용하고, 재사고 기능 도입 때 별도 모델로 확장한다.**

### 3. 비활성화된 기존 관심사의 재저장 처리

사용자가 예전에 선택한 관심사가 나중에 `hidden`/`preparing`으로 바뀌면 조회에는 보여야 해제할 수 있지만, 그대로 전체 교체 요청하면 검증과 충돌한다.

- 자동 제거: 저장 시 비활성 관심사를 빼고 저장한다. 단순하지만 사용자 선택이 묵시적으로 바뀐다.
- 명시적 해제 요구: 화면에서 비활성 표시 후 사용자가 해제해야 저장 가능하다. 투명하지만 UX 마찰이 있다.

**권장: 비활성 표시와 안내 후 저장 시 자동 제거하되, 응답에 제거된 ID를 별도 반환하는 방식은 API 복잡도가 늘어 MVP에서는 명시적 해제를 권장한다.**
