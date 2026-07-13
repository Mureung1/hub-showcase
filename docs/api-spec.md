# SUBZIP API 명세서 (초안)

## 0. 공통 규칙

### Base URL

```
/api
```

`backend/src/index.js`에 이미 마운트된 `GET /api/health`를 기준으로 모든 리소스는 `/api` 하위에 위치.

### 인증

- 회원 전용 엔드포인트: `Authorization: Bearer <JWT>` 헤더 필요. JWT는 `POST /api/auth/login` 응답으로 발급.
- 비회원(파티원) 전용 엔드포인트(`/api/guest/*`): 별도 로그인 없이 URL의 `:token`(정산 요청 생성 시 발급되는 1회성 토큰)으로 접근 권한을 대체.
- 인증 필요 여부는 각 엔드포인트 표의 `인증` 컬럼에 표시.

### 공통 응답/에러 포맷

성공 응답은 리소스를 그대로 JSON으로 반환(리스트는 배열 또는 `{ items: [...] }`로 표기, 아래 각 절 참고). 에러 응답은 `backend/src/middleware/errorHandler.js`의 기존 구현을 그대로 따른다.

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
| 403 | 권한 없음 (예: 파티장이 아닌 사용자가 정산 상태 변경 시도) |
| 404 | 리소스 없음 |
| 409 | 상태 충돌 (예: 이미 확인 완료된 정산 재확인) |
| 500 | 서버 오류 |

### 공통 타입 표기

- 날짜/시각: ISO 8601 문자열 (`"2026-07-13T00:00:00.000Z"`)
- 금액: 정수(원 단위, KRW)
- ID: 문자열(cuid/uuid 가정, DB 설계 단계에서 확정)
- 정산 상태(`SettlementMemberStatus`): `"pending"` | `"done"`
- 만족도(`SatisfactionScore`): `"good"` (😊) | `"neutral"` (😐) | `"bad"` (😞)

---

## 1. 인증 (Auth)

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/auth/signup` | 회원가입 | ✕ |
| POST | `/api/auth/login` | 로그인, JWT 발급 | ✕ |
| GET | `/api/users/me` | 내 정보 조회 | ✓ |

### 회원가입: `POST /api/auth/signup`

**Request**

```json
{
  "email": "user@example.com",
  "password": "plaintext-password",
  "username": "홍길동"
}
```

**Response `201`**

```json
{
  "id": "user_1",
  "email": "user@example.com",
  "username": "홍길동",
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

**Error `400`**: 이메일 형식/비밀번호 정책 위반

**Error `409`**: 이메일 중복

### 로그인: `POST /api/auth/login`

**Request**

```json
{
  "email": "user@example.com",
  "password": "plaintext-password"
}
```

**Response `200`**

```json
{
  "token": "eyJhbGciOi...",
  "user": { "id": "user_1", "email": "user@example.com", "username": "홍길동" }
}
```

**Error `401`**: 이메일/비밀번호 불일치

### 내 정보 조회: `GET /api/users/me`

**Response `200`**

```json
{ "id": "user_1", "email": "user@example.com", "username": "홍길동" }
```

**Error `401`**: 토큰 없음/만료

---

## 2. 구독 (Subscription)

- 파티장(계정주) 기준 CRUD

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions` | 구독 등록 | ✓ |
| GET | `/api/subscriptions` | 구독 목록 조회 | ✓ |
| GET | `/api/subscriptions/:id` | 구독 상세 조회 | ✓ |
| PATCH | `/api/subscriptions/:id` | 구독 수정 | ✓ |
| DELETE | `/api/subscriptions/:id` | 구독 삭제 | ✓ |
| GET | `/api/subscriptions/dashboard` | 월별 실지출 대시보드 | ✓ |

### 구독 등록: `POST /api/subscriptions`

**Request**

```json
{
  "serviceName": "넷플릭스",
  "totalAmount": 17000,
  "billingDay": 15,
  "memberCount": 4
}
```

**Response `201`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "totalAmount": 17000,
  "billingDay": 15,
  "memberCount": 4,
  "myShareAmount": 4250,
  "ownerId": "user_1",
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

- `myShareAmount`는 `totalAmount / memberCount`(1/n) 자동 계산 값

**Error `400`**: 필수값 누락, 금액/파티원 수 범위 오류

### 구독 목록 조회: `GET /api/subscriptions`

**Response `200`**

```json
{
  "items": [
    { "id": "sub_1", "serviceName": "넷플릭스", "totalAmount": 17000, "myShareAmount": 4250, "billingDay": 15 }
  ]
}
```

### 구독 상세 조회: `GET /api/subscriptions/:id`

**Response `200`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "totalAmount": 17000,
  "billingDay": 15,
  "memberCount": 4,
  "myShareAmount": 4250,
  "settledCount": 2,
  "ownerId": "user_1",
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

**Error `403`**: 소유자가 아닌 사용자의 접근

**Error `404`**: 없는 구독

### 구독 수정: `PATCH /api/subscriptions/:id`

**Request**

```json
{ "totalAmount": 13900, "billingDay": 20 }
```

- 구독 등록 request와 동일한 필드 중 변경할 필드만 전송 (부분 수정)

**Response `200`**

```json
{
  "id": "sub_1",
  "serviceName": "넷플릭스",
  "totalAmount": 13900,
  "billingDay": 20,
  "memberCount": 4,
  "myShareAmount": 3475
}
```

**Error `400`**: 값 형식/범위 오류

**Error `403`**: 소유자가 아닌 사용자의 접근

**Error `404`**: 없는 구독

### 구독 삭제: `DELETE /api/subscriptions/:id`

**Response `204`**

**Error `403`**: 소유자가 아닌 사용자의 접근

**Error `404`**: 없는 구독

### 월별 대시보드: `GET /api/subscriptions/dashboard`

**Query**: `month` (예: `2026-07`, 생략 시 이번 달)

**Response `200`**

```json
{
  "month": "2026-07",
  "totalMyShare": 12750,
  "items": [
    { "subscriptionId": "sub_1", "serviceName": "넷플릭스", "myShareAmount": 4250, "billingDay": 15 }
  ]
}
```

---

## 3. 파티원 (Party Member)

- 구독 파티에 속한 파티원 관리
- 회원/비회원 모두 등록 가능 (비회원은 이름/연락처만으로 등록, 이후 정산 발송 시 `GET /api/guest/settlements/:token` 접근용 토큰 발급)

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions/:id/members` | 파티원 추가 | ✓ (파티장) |
| GET | `/api/subscriptions/:id/members` | 파티원 목록 조회 | ✓ (파티장) |
| PATCH | `/api/subscriptions/:id/members/:memberId` | 파티원 정보 수정 | ✓ (파티장) |
| DELETE | `/api/subscriptions/:id/members/:memberId` | 파티원 삭제 | ✓ (파티장) |

### 파티원 추가: `POST /api/subscriptions/:id/members`

**Request** (회원 파티원)

```json
{ "userId": "user_2" }
```

**Request** (비회원 파티원)

```json
{ "name": "김철수", "phone": "010-0000-0000" }
```

**Response `201`**

```json
{
  "id": "member_1",
  "subscriptionId": "sub_1",
  "userId": "user_2",
  "name": "김철수",
  "isRegistered": true
}
```

**Error `400`**: 회원/비회원 필드 둘 다 없음

**Error `403`**: 파티장이 아님

**Error `404`**: 존재하지 않는 구독

### 파티원 목록 조회: `GET /api/subscriptions/:id/members`

**Response `200`**

```json
{ "items": [ { "id": "member_1", "name": "김철수", "isRegistered": true } ] }
```

### 파티원 정보 수정: `PATCH /api/subscriptions/:id/members/:memberId`

**Request**

```json
{ "name": "김철수", "phone": "010-0000-0001" }
```

**Response `200`**

```json
{ "id": "member_1", "name": "김철수", "phone": "010-0000-0001", "isRegistered": true }
```

**Error `403`**: 파티장이 아님

**Error `404`**: 존재하지 않는 파티원

### 파티원 삭제: `DELETE /api/subscriptions/:id/members/:memberId`

**Response `204`**

**Error `403`**: 파티장이 아님

**Error `404`**: 존재하지 않는 파티원

---

## 4. 정산 (Settlement)

- 정산 상태는 `대기중(pending) -> 확인완료(done)` 2단계이며, 파티원별로 개별 관리

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions/:id/settlements` | 정산 요청 생성 | ✓ (파티장) |
| GET | `/api/settlements` | 내 정산 목록 조회 | ✓ |
| GET | `/api/settlements/:id` | 정산 상세 조회 (파티원별 상태 포함) | ✓ |
| PATCH | `/api/settlements/:id/members/:memberId` | 파티원별 정산 상태 변경 (입금 확인) | ✓ (파티장) |
| POST | `/api/settlements/:id/share` | 카카오톡 공유 메시지/링크 생성 | ✓ (파티장) |
| GET | `/api/settlements/:id/pay-link` | 간편이체 딥링크 URL 생성 | ✓ |
| GET | `/api/notifications` | 내 알림 목록 | ✓ |
| PATCH | `/api/notifications/:id/read` | 알림 읽음 처리 | ✓ |

### 정산 요청 생성: `POST /api/subscriptions/:id/settlements`

- 결제일(cron) 또는 파티장 수동 트리거로 생성
- 생성 시 구독에 속한 모든 파티원에 대해 정산 항목이 `pending` 상태로 함께 만들어지고, 비회원 파티원에게는 게스트 토큰이 발급

**Response `201`**

```json
{
  "id": "settlement_1",
  "subscriptionId": "sub_1",
  "billingMonth": "2026-07",
  "amountPerMember": 4250,
  "members": [
    { "memberId": "member_1", "status": "pending", "guestToken": "gt_abc123" }
  ],
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

**Error `403`**: 파티장 아님

**Error `409`**: 해당 월 정산 이미 존재

### 내 정산 목록 조회: `GET /api/settlements`

- 내가 파티장인 정산과 내가 파티원인 정산을 함께 반환.

**Response `200`**

```json
{
  "items": [
    { "id": "settlement_1", "subscriptionId": "sub_1", "serviceName": "넷플릭스", "billingMonth": "2026-07", "role": "owner", "myStatus": "pending" }
  ]
}
```

### 정산 상세 조회: `GET /api/settlements/:id`

파티원별 상태 배열 포함.

**Response `200`**

```json
{
  "id": "settlement_1",
  "subscriptionId": "sub_1",
  "billingMonth": "2026-07",
  "amountPerMember": 4250,
  "members": [
    { "memberId": "member_1", "name": "김철수", "status": "pending" }
  ]
}
```

**Error `403`**: 참여하지 않은 정산에 접근

**Error `404`**: 없는 정산

### 파티원별 정산 상태 변경: `PATCH /api/settlements/:id/members/:memberId`

**Request**

```json
{ "status": "done" }
```

**Response `200`**

```json
{ "memberId": "member_1", "settlementId": "settlement_1", "status": "done" }
```

**Error `403`**: 파티장 아님

**Error `409`**: 이미 `done` 상태

### 카카오톡 공유 메시지/링크 생성: `POST /api/settlements/:id/share`

- 비가입 파티원 대상 카카오톡 공유용 메시지 템플릿과 딥링크(`pay-link`) 묶음을 생성

**Response `200`**

```json
{
  "kakaoShareUrl": "https://...",
  "message": "이번 달 넷플릭스 4,250원, 정산 부탁드려요!",
  "guestLinks": [
    { "memberId": "member_1", "url": "https://subzip.app/guest/gt_abc123" }
  ]
}
```

### 간편이체 딥링크 URL 생성: `GET /api/settlements/:id/pay-link`

- 회원(파티장/파티원)이 자신의 이체 화면에서 딥링크를 조회할 때 사용
- 비회원은 이 엔드포인트 대신 `GET /api/guest/settlements/:token` 응답에 포함된 `payLink`를 사용

**Query**: `memberId`

**Response `200`**

```json
{ "provider": "toss", "deepLinkUrl": "supertoss://send?amount=4250&bank=..." }
```

### 내 알림 목록 조회: `GET /api/notifications`

- 알림은 결제일 cron이 생성(정산 시작 알림, 이체 링크 포함 알림)

**Response `200`**

```json
{
  "items": [
    { "id": "noti_1", "type": "settlement_started", "settlementId": "settlement_1", "message": "이번 달 넷플릭스 정산이 시작됐어요", "readAt": null }
  ]
}
```

### 알림 읽음 처리: `PATCH /api/notifications/:id/read`

**Response `200`**

```json
{ "id": "noti_1", "readAt": "2026-07-13T00:00:00.000Z" }
```

**Error `404`**: 존재하지 않는 알림

---

## 5. 비회원용 (Guest)

- SUBZIP 미가입 파티원이 `guestToken`만으로 접근하는 엔드포인트
- 인증 헤더 대신 URL의 `:token`이 권한을 대체하며, 토큰은 정산 생성 시 파티원별로 1회성 발급

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| GET | `/api/guest/settlements/:token` | 토큰 기반 정산 상세 조회 | 토큰 |
| POST | `/api/guest/settlements/:token/pay` | 이체 완료 처리 | 토큰 |
| POST | `/api/guest/settlements/:token/survey` | 비회원 만족도 설문 제출 | 토큰 |

### 토큰 기반 정산 상세 조회: `GET /api/guest/settlements/:token`

**Response `200`**

```json
{
  "settlementId": "settlement_1",
  "serviceName": "넷플릭스",
  "amount": 4250,
  "status": "pending",
  "payLink": { "toss": "supertoss://send?amount=4250" }
}
```

**Error `404`**: 유효하지 않거나 만료된 토큰

### 이체 완료 처리: `POST /api/guest/settlements/:token/pay`

파티원이 딥링크 이체 후 완료 버튼을 눌렀을 때 호출.

**Response `200`**

```json
{ "settlementId": "settlement_1", "status": "done" }
```

**Error `404`**: 유효하지 않거나 만료된 토큰

**Error `409`**: 이미 완료 처리된 정산

### 비회원 만족도 설문 제출: `POST /api/guest/settlements/:token/survey`

**Request**

```json
{ "score": "good" }
```

**Response `201`**

```json
{
  "id": "survey_1",
  "settlementId": "settlement_1",
  "score": "good",
  "signupUrl": "https://subzip.app/signup"
}
```

**Error `404`**: 유효하지 않거나 만료된 토큰

---

## 6. 만족도 설문 및 AI 리포트

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/settlements/:id/survey` | 회원 만족도 설문 제출 | ✓ |
| GET | `/api/subscriptions/:id/reports/personal` | 개인 만족도 리포트 | ✓ |
| GET | `/api/subscriptions/:id/reports/group` | 그룹 만족도 리포트 | ✓ |

### 회원 만족도 설문 제출: `POST /api/settlements/:id/survey`

**Request**

```json
{ "score": "neutral" }
```

**Response `201`**

```json
{
  "id": "survey_1",
  "settlementId": "settlement_1",
  "userId": "user_2",
  "score": "neutral",
  "createdAt": "2026-07-13T00:00:00.000Z"
}
```

**Error `409`**: 이미 제출한 설문

### 개인 만족도 리포트: `GET /api/subscriptions/:id/reports/personal`

**Response `200`**

```json
{
  "subscriptionId": "sub_1",
  "monthlyTrend": [
    { "month": "2026-06", "score": "good" },
    { "month": "2026-07", "score": "neutral" }
  ],
  "recommendation": { "action": "keep", "reason": "최근 3개월 만족도 양호" },
  "alternatives": [
    { "serviceName": "디즈니플러스", "reason": "유사 콘텐츠, 비용 절감" }
  ]
}
```

- `recommendation.action`은 `"keep" | "reconsider" | "cancel"`. `alternatives`는 Claude API 연동 결과

### 그룹 만족도 리포트: `GET /api/subscriptions/:id/reports/group`

**Response `200`**

```json
{
  "subscriptionId": "sub_1",
  "memberCount": 4,
  "satisfactionSummary": { "good": 2, "neutral": 1, "bad": 1 },
  "recommendation": { "action": "reconsider", "reason": "불만족 비율 25% 이상" },
  "alternatives": [
    { "serviceName": "디즈니플러스", "reason": "유사 콘텐츠, 비용 절감" }
  ]
}
```

- 익명 종합이므로 개별 파티원 식별 정보는 응답에 포함하지 않는다.

---

## 부록: 기능-엔드포인트 매핑 (검증용)

| `docs/plan.md` 기능 | 관련 엔드포인트 |
| --- | --- |
| 맞춤형 알림 제공 | `POST /settlements`(생성 시 알림 발생), `GET/PATCH /notifications` |
| 카카오톡 기반 원클릭 정산 요청 | `POST /settlements/:id/share` |
| 딥링크 기반 간편 이체 | `GET /settlements/:id/pay-link`, `GET /guest/settlements/:token` |
| 1초 만족도 설문 | `POST /settlements/:id/survey`, `POST /guest/settlements/:token/survey` |
| 개인 만족도 리포트 | `GET /subscriptions/:id/reports/personal` |
| 그룹 만족도 리포트 | `GET /subscriptions/:id/reports/group` |
| '내 진짜 몫' 실지출 계산/시각화 | `POST /subscriptions`(`myShareAmount`), `GET /subscriptions/dashboard` |

## 참고 / TODO

- 요청 바디 유효성 검증 로직(Zod 등)은 아직 미구현(`backend/src/middleware/errorHandler.js`에는 에러 포맷터만 존재) — 검증 미들웨어 구현 시 `400` 에러의 상세 필드 목록을 이 문서에 추가할 것.
- 엔드포인트/필드명은 이후 `DB 설계`(Prisma 모델링) 단계에서 실제 스키마에 맞춰 조정될 수 있음.
