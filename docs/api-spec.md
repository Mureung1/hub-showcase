# SUBZIP API 명세서

## 섹션 상태 표기

각 도메인 섹션 제목 끝에 상태 태그를 표기한다.

- `[확정]`: 구조/필드/응답 형태가 확정됨. 함부로 재작성하지 않으며, 바꾸려면 먼저 이 마커를 `[초안]`으로 내리거나 명시적으로 지시할 것.
- `[초안]`: DB 설계·구현 과정에서 조정될 수 있음. `api-db-designer` 에이전트를 포함해 이 섹션이 작업 범위에 포함되면 자유롭게 수정 가능.
- 새로 추가하는 섹션은 항상 `[초안]`으로 시작한다.

## 0. 공통 규칙

### Base URL

```
/api
```

: 모든 리소스는 `/api` 하위에 위치.

### 인증

- MVP는 회원 전용 — 모든 사용자는 구글 로그인으로 가입/로그인한 회원.
- `Authorization: Bearer <JWT>` 헤더로 인증. JWT는 `GET /api/auth/google/callback`에서 구글 로그인이 완료되는 시점에 발급.
- 인증 필요 여부는 각 엔드포인트 표의 `인증` 컬럼에 표시.

### 공통 응답/에러 포맷

- 성공 응답은 리소스를 그대로 JSON으로 반환.
- 에러 응답은 `backend/src/middleware/errorHandler.js`의 기존 구현을 그대로 따름.

```jsonc
// 404 (notFoundHandler)
{ "error": "Not Found: GET /api/subscriptions/999" }

// 4xx/5xx (errorHandler, err.status/err.message 사용)
{ "error": "메시지" }
```

### 상태 코드

| 코드 | 의미 |
| --- | --- |
| 200 | 조회/수정 성공 |
| 201 | 생성 성공 |
| 204 | 삭제 성공 (응답 본문 없음) |
| 400 | 유효성 검증 실패 |
| 401 | 인증 필요/토큰 만료 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 상태 충돌 |
| 500 | 서버 오류 |

### 공통 타입 표기

- 날짜/시각: ISO 8601 문자열 (`"2026-07-13T00:00:00.000Z"`)
- 금액: 정수(원 단위, KRW)
- ID: 문자열(cuid/uuid 가정, DB 설계 단계에서 확정)
- 정산 상태(`SettlementMemberStatus`): `"pending"` | `"done"`
- 만족도(`SatisfactionScore`): `"good"` (😊) | `"neutral"` (😐) | `"bad"` (😞)

---

## 1. 인증 (Auth) [확정]

- 회원가입/로그인은 구글 로그인만 지원. 최초 로그인 시 자동으로 계정 생성.
- 초대 링크(`joinUrl`)로 들어온 미로그인 사용자는 구글 로그인을 거치는 동안 `state` 파라미터로 초대된 구독 정보를 함께 전달, 가입/로그인과 동시에 해당 파티의 파티원으로 자동 등록. 이미 로그인된 사용자가 초대 링크를 클릭한 경우 FE가 보유 토큰으로 `POST /api/subscriptions/:id/join` 호출.

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/auth/google` | 구글 로그인 시작(리디렉션) | ✕ |
| GET | `/api/auth/google/callback` | 구글 콜백 처리, JWT 발급 | ✕ |
| GET | `/api/users/me` | 프로필 조회 | ✓ |

### 구글 로그인 시작: `GET /api/auth/google`

**Query**: `state` (선택, 초대 링크로 진입한 경우 초대된 구독의 `subscriptionId`)

- 초대 링크(`joinUrl`) 클릭 시 미로그인 상태인 경우 `GET /api/auth/google?state=sub_1`로 이동.
- 구글 OAuth consent 화면으로 302 리디렉션. `state`는 구글 콜백에 그대로 되돌아옴.

### 구글 콜백 처리, JWT 발급: `GET /api/auth/google/callback`

**Query**: `code`(구글 발급), `state`(요청 시 전달했던 값, 없을 수 있음)

- 구글에서 받은 `code`로 프로필(이메일, 구글 계정 고유 ID, 이름)을 가져와 기존 사용자인지 확인하고, 없으면 새로 생성(=최초 로그인이 곧 회원가입).
- JWT 발급.
- `state`가 유효한 `subscriptionId`이고, 아직 해당 구독의 파티원이 아닌 경우 파티원으로 등록 후 진행.
- `${FRONTEND_URL}/oauth/callback#token=<jwt>&joinedSubId=<id|null>` 형태로 302 리디렉션. FE는 URL 프래그먼트에서 토큰을 읽어 저장하고, `joinedSubId`가 있으면 해당 구독 화면으로 이동.

**Error `400`**: 유효하지 않은 `code`

### 프로필 조회: `GET /api/users/me`

**Response `200`**

```json
{ "id": "user_1", "email": "user@example.com", "username": "홍길동" }
```

**Error `401`**: 토큰 없음/만료

---

## 2. 구독 서비스 (Subscription) [초안]

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions` | 구독 등록 | ✓ |
| GET | `/api/subscriptions` | 구독 목록 조회 | ✓ |
| GET | `/api/subscriptions/:id` | 구독 상세 조회 | ✓ |
| PATCH | `/api/subscriptions/:id` | 구독 수정 | ✓ |
| DELETE | `/api/subscriptions/:id` | 구독 삭제 | ✓ |
| GET | `/api/subscriptions/dashboard` | 월별 실지출 조회 | ✓ |

### 구독 등록: `POST /api/subscriptions`

**Request**

```json
{
  "serviceName": "넷플릭스",
  "subAmount": 17000,
  "billingDay": 15,
  "memberCount": 4,
  "bankName": "국민은행",
  "accountNumber": "123456-78-901234",
  "accountHolderName": "홍길동"
}
```

**Response `201`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "subAmount": 17000,
  "billingDay": 15,
  "memberCount": 4,
  "myAmount": 4250,
  "ownerId": "user_1",
  "joinUrl": "https://subzip.app/join/sub_1",
  "bankAccount": { "bankName": "국민은행", "accountNumber": "123456-78-901234", "accountHolderName": "홍길동" },
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

- `myAmount`는 `subAmount / memberCount` (1/n) 자동 계산 값.
- `joinUrl`은 `id`를 그대로 담은 URL, FE가 `id`만으로도 조립 가능.
- `bankName`/`accountNumber`/`accountHolderName`은 파티장이 정산금을 받을 계좌 정보. 파티장 조회 시에만 응답에 포함, 파티원이 조회하는 응답에는 노출되지 않음.

**Error `400`**: 필수값 누락, 금액/파티원 수 범위 오류, 계좌 정보 형식 오류

### 구독 목록 조회: `GET /api/subscriptions`

- 파티장(owner)으로 소유한 구독과 파티원(member)으로 가입한 구독을 모두 합쳐 반환.
- `role`은 `ownerId`와 요청자 `id` 비교로 결정 (`"owner"` | `"member"`). 구독마다 달라질 수 있음.
- 항상 현재 시점 기준 목록.

**Response `200`**

```json
{
  "items": [
    { "id": "sub_1", "serviceName": "넷플릭스", "billingDay": 15, "memberCount": 4, "myAmount": 4250, "role": "owner" },
    { "id": "sub_2", "serviceName": "왓챠", "billingDay": 18, "memberCount": 4, "myAmount": 3225, "role": "owner" },
    { "id": "sub_3", "serviceName": "디즈니플러스", "billingDay": 3, "memberCount": 4, "myAmount": 3225, "role": "member" }
  ]
}
```

### 구독 상세 조회: `GET /api/subscriptions/:id`

- 파티장 또는 가입한 파티원이 조회 가능.

**Response `200`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "subAmount": 17000,
  "billingDay": 15,
  "memberCount": 4,
  "myAmount": 4250,
  "ownerId": "user_1",
  "role": "owner",
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

- `role`은 `ownerId`와 요청자 `id` 비교로 결정 (`"owner"` | `"member"`). FE는 이 값으로 수정/삭제/정산 등 버튼 노출 여부를 판단.
- 요청자가 파티장인 경우에만 `joinUrl`, `bankAccount` 필드를 응답에 추가로 포함.

**Error `403`**: 파티장도 아니고 파티원도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 구독 수정: `PATCH /api/subscriptions/:id`

- 파티장 전용.

**Request**

```json
{ "subAmount": 13900, "billingDay": 20, "accountNumber": "123456-78-909999" }
```

- 구독 등록 Request와 동일한 필드 중 변경할 필드만 전송. (부분 수정)
- `memberCount`도 변경 가능. (예: 파티원 삭제 후 정산 인원수를 줄이고 싶을 때 사용)

**Response `200`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "subAmount": 13900,
  "billingDay": 20,
  "memberCount": 4,
  "myAmount": 3475,
  "ownerId": "user_1",
  "joinUrl": "https://subzip.app/join/sub_1",
  "bankAccount": { "bankName": "국민은행", "accountNumber": "123456-78-909999", "accountHolderName": "홍길동" },
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

**Error `400`**: 값 형식/범위 오류

**Error `403`**: 파티장이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 구독 삭제: `DELETE /api/subscriptions/:id`

- 파티장 전용.

**Response `204`**

**Error `403`**: 파티장이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 월별 실지출 조회: `GET /api/subscriptions/dashboard`

- 지정한 달 기준, 총 구독료와 실지출 합계를 반환. 소유(owner)/가입(member) 구독의 `myAmount`를 모두 합산.
- FE는 `GET /subscriptions`를 함께 호출해 화면을 조합.

**Query**: `month` (예: `2026-07`, 생략 시 이번 달)

**Response `200`**

```json
{ "month": "2026-07", "totalSubAmount": 46900, "totalMyAmount": 10700 }
```

---

## 3. 파티원 (Party Member) [초안]

- 가입 링크(`joinUrl`)는 별도 토큰 없이 `subscriptionId`를 그대로 사용 — 구독당 1개, 가입 여부와 무관하게 항상 동일. 파티장이 카카오톡 공유하기로 그룹원에게 전달.
- 이미 로그인된 사용자가 초대 링크를 클릭한 경우 FE가 보유 토큰으로 POST /api/subscriptions/:id/join 호출. 미로그인 사용자는 구글 로그인을 거치는 동안 가입/로그인과 동시에 해당 파티의 파티원으로 자동 등록.
- 모든 파티원은 로그인 회원.
- `memberCount`는 구독 등록/수정 시 파티장이 입력하는 고정 정산 인원수이며, 실제 가입 완료 인원과 별개 — 초대는 보냈지만 아직 가입하지 않은 인원이 있으면 아래 파티원 목록 수가 `memberCount`보다 적을 수 있음. 파티원 가입/삭제로 자동으로 바뀌지 않으며, 정산 인원수를 바꾸려면 파티장이 `PATCH /subscriptions/:id`로 직접 조정.

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions/:id/join` | 파티 가입 (파티원 등록) | ✓ |
| GET | `/api/subscriptions/:id/members` | 파티원 목록 조회 (가입 완료자만) | ✓ (파티장) |
| DELETE | `/api/subscriptions/:id/members/:memberId` | 파티원 삭제 | ✓ (파티장 또는 본인) |

### 파티 가입: `POST /api/subscriptions/:id/join`

- 로그인된 회원이 호출(직접 호출 또는 구글 로그인 콜백에서 자동 호출) → 파티원으로 등록 (`memberId` 생성, `userId` 연결)

**Response `201`**

```json
{ "memberId": "member_1", "subscriptionId": "sub_1", "userId": "user_2" }
```

**Error `401`**: 로그인 필요

**Error `404`**: 존재하지 않는 구독

**Error `409`**: 이미 파티원인 상태

### 파티원 목록 조회: `GET /api/subscriptions/:id/members`

- 파티장 전용.

**Response `200`**

```json
{
  "items": [
    { "id": "member_1", "userId": "user_2", "name": "김철수", "joinedAt": "2026-07-13T00:00:00.000Z" }
  ]
}
```

**Error `403`**: 파티장이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 파티원 삭제: `DELETE /api/subscriptions/:id/members/:memberId`

- 파티장이 다른 파티원을 제외하거나, 파티원 본인이 스스로 나갈 때 사용.
- 해당 파티원의 멤버십 한 줄만 삭제되며, 구독 자체나 다른 파티원에게는 영향 없음.
- 파티원 삭제는 `memberCount`에 영향을 주지 않음. 정산 인원수를 줄이고 싶으면 파티장이 별도로 `PATCH /subscriptions/:id`로 `memberCount`를 조정.

**Response `204`**

**Error `403`**: 파티장도 아니고 본인도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 파티원

---

## 참고 / TODO

- 정산/만족도 설문 및 AI 리포트 API는 아직 미작성.
- 요청 바디 유효성 검증 로직(Zod 등)은 아직 미구현(`backend/src/middleware/errorHandler.js`에는 에러 포맷터만 존재) — 검증 미들웨어 구현 시 `400` 에러의 상세 필드 목록을 이 문서에 추가할 것.
- `1. 인증`, `2. 구독 서비스`, `3. 파티원` 섹션은 `backend/prisma/schema.prisma`의 `User`/`Subscription`/`PartyMember` 모델로 DB 설계 완료. 나머지(정산/만족도) 섹션은 아직 스키마 설계 전.
- 구글 OAuth 클라이언트 ID/시크릿을 `.env`에 반영 필요(`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` 등).
- 초대용 `state` 파라미터의 위변조 방지(서명/만료 검증) 방식 결정 필요.
- 계좌번호 등 민감정보 저장 시 암호화 여부/방식 결정 필요.
