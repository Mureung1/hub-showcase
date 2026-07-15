# API 명세

MVP(P0/P1) 범위의 API를 정리한다. 도메인 값의 기준은 DB의 check 제약(`db_schema.md`)이다.

- **확정** 표시는 이미 결정·검증된 항목이다.
- **결정 필요** 표시는 구현 전에 정해야 하는 항목이다. 임의로 확정하지 않는다.
- 검증 기준은 `docs/quality/api-smoke.md`와 함께 관리한다.

## 공통 규약

### 경로와 형식

- 모든 엔드포인트는 `/api` 아래에 둔다.
- 요청/응답 본문은 JSON. 필드명은 **camelCase** (백엔드 스키마에서 snake_case ↔ camelCase 변환).
- 요청 스키마는 `extra="forbid"`. 알 수 없는 필드가 오면 `422`. **확정**

### 인증

- 사용자 인증은 Supabase 익명 세션을 쓴다. **세션 생성은 프론트엔드가 `@supabase/supabase-js`로 직접 한다. 백엔드 엔드포인트가 아니다.** **확정**
- 인증이 필요한 요청은 헤더에 `Authorization: Bearer <access_token>`을 싣는다.
- 백엔드는 토큰을 검증하고 `user_id`를 뽑는다. **`user_id`를 요청 본문에서 받지 않는다.** **확정**
- 사용자 데이터(`user_interests`, `mission_records`)는 `create_user_client(token)`로 접근해 RLS를 적용받는다. **확정**

### 공통 에러 응답

| 코드 | 언제 | 본문 |
| --- | --- | --- |
| `400` | 요청 형식은 맞으나 값이 유효하지 않음 | `{ "detail": "..." }` |
| `401` | 토큰 없음 / 만료 / 위조 | `{ "detail": "..." }` |
| `403` | 인증은 됐으나 권한 없음 (RLS 차단 등) | `{ "detail": "..." }` |
| `404` | 리소스 없음 | `{ "detail": "..." }` |
| `422` | 스키마 검증 실패 (필드 누락, 타입 불일치, 허용 밖 값, 알 수 없는 필드) | FastAPI 기본 검증 에러 형식 |
| `429` | 요청 한도 초과 (익명 가입 rate limit 등) | `{ "detail": "..." }` |
| `500` | 서버 오류. **FK 위반·제약 위반이 그대로 500으로 새면 안 된다** | `{ "detail": "..." }` |

- 에러 본문 형식은 **결정 필요**: FastAPI 기본(`detail`)을 그대로 쓸지, 공통 에러 스키마(`{ code, message }`)를 만들지.

---

## 엔드포인트 목록

| 메서드 | 경로 | 인증 | 기능 | 상태 |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | — | 헬스체크 | 구현됨 |
| GET | `/api/interests` | — | 선택 가능한 관심사 목록 | 구현됨 |
| GET | `/api/user-interests` | 필요 | 내가 저장한 관심사 조회 | 결정 필요 |
| POST | `/api/user-interests` | 필요 | 관심사 저장 (전체 교체) | 설계 확정, 미구현 |
| GET | `/api/articles/today` | 필요 | 오늘의 글 1~3개 | 미설계 |
| GET | `/api/articles/{articleId}` | 필요 | 원문 읽기 (문장 포함) | 미설계 |
| POST | `/api/mission-records` | 필요 | 미션 기록 저장 | 부분 설계 |
| GET | `/api/mission-records` | 필요 | 나의 깸 (사고 로그) 목록 | 미설계 |

---

## P0. 관심사 설정

### GET /api/interests — 구현됨

선택 가능한 관심사 목록. 인증 불필요 (공개 마스터 데이터).

**응답 200**

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

- `launchStatus`가 `active` 또는 `curated_only`인 항목만 포함한다. `hidden`, `preparing`은 응답에서 제외한다. **확정**
- `displayOrder` 오름차순.

### POST /api/user-interests — 설계 확정, 미구현

관심사 저장. **전체 교체** 방식 (기존 행 삭제 후 삽입). **확정**

**요청**

```json
{ "interestIds": ["dc0cef12-...", "09384a82-..."] }
```

**응답 201**

```json
{ "interestIds": ["dc0cef12-...", "09384a82-..."] }
```

**규칙** (전부 **확정**, `api-smoke.md`와 동일)

| 상황 | 응답 |
| --- | --- |
| 정상 (1~3개) | `201` |
| 토큰 없음 / 위조 | `401` |
| 본문에 `userId` 등 알 수 없는 필드 | `422` |
| `interestIds`가 4개 이상 | `422` (최대 3개) |
| `hidden`/`preparing` 관심사의 id | `422` |
| 존재하지 않는 `interestId` | `400` 또는 `422` (FK 위반이 500으로 새면 안 됨) |
| 빈 배열 | `422` |

- `user_id`는 토큰에서만 뽑는다. **확정**
- **결정 필요**: 최소 개수. 빈 배열을 `422`로 막으면 "관심사 0개"가 불가능하다. 온보딩에서 최소 1개를 강제하는지 확인한다.

### GET /api/user-interests — 결정 필요

**결정 필요 (엔드포인트 존재 여부부터)**

`04-scenario-ia.md`: "앱 접속 시 관심사 설정 이력이 있는지 확인한다. 없으면 온보딩으로."

이 판단을 어떻게 하는가:
1. 이 엔드포인트로 저장된 관심사를 조회해 빈 배열이면 온보딩으로 보낸다.
2. 프론트가 Supabase에서 직접 읽는다. (단, 아키텍처상 데이터는 `/api` 경유가 원칙)
3. 재저장 화면에서 기존 선택을 미리 체크해두려면 어차피 조회가 필요하다.

1번이 아키텍처에 맞다. **응답 형식과 필요 여부를 확정해야 한다.**

---

## P0. 오늘의 깸 (미션)

### POST /api/mission-records — 부분 설계

미션 기록 저장. DB 스키마(`mission_records`)를 그대로 따른다.

**요청 (초안 — 결정 필요)**

```json
{
  "articleId": "...",
  "missionType": "connection",
  "missionPrompt": "내 상황이나 프로젝트와 연결해보면?",
  "userAnswer": "우리 팀 온보딩도 결국 같은 문제다.",
  "selectedQuote": "실제로 한 연구는...",
  "anchorType": "highlight"
}
```

**응답 201** — 저장된 기록.

**규칙** (전부 **확정**, `api-smoke.md`와 동일)

| 상황 | 응답 |
| --- | --- |
| 토큰 없음 | `401` |
| 본문에 다른 `userId` | `422` (user_id는 토큰에서) |
| `missionType`이 목록 밖 | `422` (`question`/`rebuttal`/`connection`/`expression`) |
| `userAnswer`가 빈 문자열 | `422` (DB 제약 `char_length > 0`) |
| `anchorType`이 목록 밖 | `422` (`whole_content`/`highlight`/`timestamp`/`user_quote`) |

**결정 필요**

1. **`missionPrompt`를 클라이언트가 보내는가, 서버가 채우는가.** 미션 프롬프트는 4종 고정 문구(`missions.ts` = 프론트, 서버에도 같은 정의 필요)다. 클라이언트가 보내면 위조 가능하니, 서버가 `missionType`으로 채우는 게 안전하다.
2. **무성의한 답변 판정** (`03-feature-details.md`: "네", "ㅇㅇ" 불충족). DB 제약은 길이 0만 막는다. 이 규칙을 서버에서 검증할지, MVP에서 뺄지.
3. **하이라이트 없이 넘어간 경우** (`anchorType = whole_content`). `selectedQuote`가 `null`이어도 되는지 (DB상 nullable이라 가능).
4. **작성 중 미션 LIFO 3개 임시저장** (`03-feature-details.md`). 별도 저장소가 필요하다. **MVP 범위인지 결정 필요** — 과할 수 있다.
5. **읽기 참여 지표** (`opened_original_at`, `returned_from_original_at`, `minimum_engagement_met`). MVP에서 채울지, 나중으로 미룰지.

---

## P1. 오늘의 글 추천

### GET /api/articles/today — 미설계

오늘의 글 1~3개. 사용자 관심사 기반 큐레이션.

**응답 200 (초안)**

```json
[
  {
    "id": "...",
    "title": "숏폼 시대, 우리는 정말 더 많이 이해하고 있을까",
    "sourceName": "요즘IT",
    "interestName": "IT·개발",
    "officialExcerpt": "...",
    "readingTimeMinutes": 4,
    "contentType": "article"
  }
]
```

**결정 필요**

1. **추천 로직.** `03-feature-details.md`는 "초기엔 클릭 수 기준 인기글" → 이후 개인화. MVP 초기 큐레이션 방식을 확정해야 한다.
2. **`content_type`(article/blog/video)과 화면 라벨(칼럼/뉴스레터/에세이)의 매핑.** 프론트가 "칼럼" 같은 라벨을 쓰는데 DB엔 없다. 매핑 규칙을 정하거나 라벨을 `sources`에 둔다.
3. **관심사에 글이 0개일 때** (`emptyStateMessage`, `curated_only`). 빈 배열 + 안내인지, 대체 관심사 글을 채우는지.
4. **"오늘"의 기준.** 발행일 기준인가, 사용자에게 노출된 날 기준인가. (기획엔 `article_assignments`로 노출 이력을 남기는 설계가 있으나 MVP 테이블에서 제외됨)
5. `access_type`이 `free`/`partial_free`만 노출 (`content_strategy.md`). 필터 위치.

### GET /api/articles/{articleId} — 미설계

원문 읽기 화면용. 문장 단위 하이라이트를 위해 본문이 문장으로 나뉘어야 한다.

**결정 필요**

1. **본문을 어떻게 주는가.** 저작권상 원문 전문을 저장하지 않는다(`official_excerpt`만). 그렇다면 읽기 화면의 문장들은 어디서 오는가 — 발췌문만 보여주는지, 원문 링크로 보내는지. **이게 읽기·미션 플로우 전체를 좌우하는 핵심 결정이다.**
2. 문장 분리를 서버가 하는가, 프론트가 하는가.

---

## P1. 나의 깸 (사고 로그)

### GET /api/mission-records — 미설계

내 사고 기록 목록. RLS로 본인 것만 조회된다.

**응답 200 (초안)**

```json
[
  {
    "id": "...",
    "articleTitle": "...",
    "missionType": "connection",
    "missionPrompt": "...",
    "userAnswer": "...",
    "createdAt": "2026-07-14T..."
  }
]
```

**결정 필요**

1. **정렬·필터.** `03-feature-details.md`: "시간순, 관심사별로 쌓인다". 쿼리 파라미터(`?interestId=`, 페이지네이션)를 둘지.
2. **재사고 유도 질문** (AI 생성). `03-feature-details.md`의 핵심 기능이나 별도 엔드포인트가 필요하고 AI 호출이 든다. **MVP 범위인지 결정 필요.**
3. **원문이 삭제된 경우** (`url_status = removed`). 기록은 유지하되 원문 링크 대신 안내. 응답에 상태를 포함할지.

---

## 결정 대기 요약

구현 순서상 먼저 정해야 하는 것부터.

1. `POST /api/user-interests` 최소 개수 (빈 배열 허용 여부)
2. `GET /api/user-interests` 필요 여부와 형식 (온보딩 이력 판단)
3. `POST /api/mission-records`의 `missionPrompt`를 서버가 채우는지
4. **읽기 화면 본문을 어떻게 주는가** (저작권 — 플로우 전체를 좌우)
5. 오늘의 글 초기 추천 로직
6. 에러 응답 본문 형식 (`detail` vs 공통 스키마)
