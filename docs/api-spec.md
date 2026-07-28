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

모든 리소스는 `/api` 하위에 위치한다.

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
- 역할(`role`): `ownerId`와 요청자 `id` 비교로 결정 (`"owner"` | `"member"`). 구독/정산 응답에서 공통으로 사용.

---

## 1. 인증 (Auth) [확정]

- 회원가입/로그인은 구글 로그인만 지원. 최초 로그인 시 자동으로 계정 생성.
- 초대 링크로 진입한 사용자의 로그인→가입 전체 흐름은 3. 파티원 참고. 이 섹션은 그중 구글 로그인 자체(계정 생성, `state` 전달, JWT 발급)만 다룬다.

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
- `state`가 있으면 `/join/:state`를, 없으면 `/`를 복귀 경로로 계산(가입 처리는 하지 않음 — `state`의 유효성 검증은 FE가 복귀 경로에서 `POST /api/subscriptions/:id/join`을 호출할 때 이뤄짐).
- `${FRONTEND_URL}/oauth/callback#token=<jwt>&redirect=<path>` 형태로 302 리디렉션. FE는 URL 프래그먼트에서 토큰을 읽어 저장하고, `redirect` 경로로 이동.

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
| GET | `/api/subscriptions/:id/preview` | 초대 링크 미리보기(가입 전 유효성 확인) | ✕ |
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
- `role`은 구독마다 달라질 수 있음.
- 항상 현재 시점 기준 목록.
- `createdAt`은 대시보드 월별 추이 계산(아래 `/dashboard` 구현 노트 참고)에 FE가 사용.

**Response `200`**

```json
{
  "items": [
    { "id": "sub_1", "serviceName": "넷플릭스", "billingDay": 15, "memberCount": 4, "myAmount": 4250, "role": "owner", "createdAt": "2026-05-10T00:00:00.000Z" },
    { "id": "sub_2", "serviceName": "왓챠", "billingDay": 18, "memberCount": 4, "myAmount": 3225, "role": "owner", "createdAt": "2026-06-02T00:00:00.000Z" },
    { "id": "sub_3", "serviceName": "디즈니플러스", "billingDay": 3, "memberCount": 4, "myAmount": 3225, "role": "member", "createdAt": "2026-07-01T00:00:00.000Z" }
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

- FE는 `role` 값으로 수정/삭제/정산 등 버튼 노출 여부를 판단.
- 요청자가 파티장인 경우에만 `joinUrl`, `bankAccount` 필드를 응답에 추가로 포함.

**Error `403`**: 파티장도 아니고 파티원도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 초대 링크 미리보기: `GET /api/subscriptions/:id/preview`

- 인증 불필요. 초대 링크(`/join/:id`)로 들어온 미로그인 사용자가 로그인 절차를 거치기 전에 링크 유효성을 확인하기 위한 용도.
- `subAmount`, `bankAccount` 등 민감 정보는 응답에 포함하지 않는다.

**Response `200`**

```json
{ "id": "sub_1", "serviceName": "넷플릭스" }
```

**Error `404`**: 존재하지 않는 구독

### 구독 수정: `PATCH /api/subscriptions/:id`

- 파티장 전용.

**Request**

```json
{ "subAmount": 13900, "billingDay": 20, "accountNumber": "123456-78-909999" }
```

- 구독 등록 Request와 동일한 필드 중 변경할 필드만 전송. (부분 수정)
- `memberCount`도 변경 가능(3. 파티원 참고).

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
- **구현 노트**: 실제 정산(Settlement) 이력이 아니라 `Subscription.createdAt` 기준 추정치다 — 해당 구독이 그 달 말일 이전에 생성됐으면 현재 `subAmount`/`memberCount`만큼 그 달에도 지출했다고 가정해 역산한다. 과거 금액 변경이나 삭제된 구독 이력은 반영되지 않는다. `GET /subscriptions` 목록 응답에도 `createdAt`이 추가되어 FE가 최근 N개월 추이를 동일한 방식으로 클라이언트에서 계산할 수 있다.

**Query**: `month` (예: `2026-07`, 생략 시 이번 달)

**Response `200`**

```json
{ "month": "2026-07", "totalSubAmount": 46900, "totalMyAmount": 10700 }
```

---

## 3. 파티원 (Party Member) [초안]

- 가입 링크(`joinUrl`)는 별도 토큰 없이 `subscriptionId`를 그대로 사용 — 구독당 1개, 가입 여부와 무관하게 항상 동일. 파티장이 카카오톡 공유하기로 그룹원에게 전달.
- 가입 흐름:
  - 이미 로그인된 사용자가 초대 링크를 클릭 → FE가 보유 토큰으로 바로 `POST /api/subscriptions/:id/join` 호출.
  - 미로그인 사용자가 초대 링크를 클릭 → FE가 로그인 버튼을 보여주기 전에 먼저 `GET /api/subscriptions/:id/preview`로 링크 유효성을 확인 → 유효한 경우에만 `state=subscriptionId`로 구글 로그인 유도(1. 인증 참고) → 로그인 완료 후 `/join/:id`로 복귀해 동일하게 `POST /api/subscriptions/:id/join` 호출.
  - 무효한 링크는 로그인 여부와 무관하게 안내 문구만 표시.
- 모든 파티원은 로그인 회원.
- `memberCount`는 구독 등록/수정 시 파티장이 입력하는 고정 정산 인원수이며, 실제 가입 완료 인원과 별개 — 초대는 보냈지만 아직 가입하지 않은 인원이 있으면 아래 파티원 목록 수가 `memberCount`보다 적을 수 있음. 파티원 가입/삭제로 자동으로 바뀌지 않으며, 정산 인원수를 바꾸려면 파티장이 `PATCH /subscriptions/:id`로 직접 조정.

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions/:id/join` | 파티 가입 (파티원 등록) | ✓ |
| GET | `/api/subscriptions/:id/members` | 파티원 목록 조회(가입 완료자만) | ✓ (파티장) |
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
- 해당 파티원의 멤버십 한 줄만 삭제되며, 구독 자체나 다른 파티원에게는 영향 없음(`memberCount`에도 영향 없음).

**Response `204`**

**Error `403`**: 파티장도 아니고 본인도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 파티원

---

## 4. 정산 (Settlement) [초안]

- 정산은 구독(Subscription) 단위로, 결제월(`billingMonth`, `"YYYY-MM"`) 하나당 최대 1개만 생성된다. 같은 달에 중복 생성 시도는 `409`.
- 파티장이 정산을 생성(`POST .../settlements`)하는 시점의 `PartyMember` 목록을 스냅샷으로 떠서 파티원별 정산 항목(`SettlementMember`)을 함께 생성한다. 이후 파티원이 추가/삭제되어도 이미 생성된 정산의 항목에는 영향 없음.
- `SettlementMember`는 생성 시점의 `userId`+`name`을 직접 저장한다(파티원 관계 `PartyMember`를 거치지 않음). 따라서 이후 해당 파티원이 파티에서 나가 `PartyMember`가 삭제되어도 과거 정산 이력 자체(이름/금액/상태)는 전혀 영향이 없어 파티장은 계속 조회할 수 있다 — 단, 내보내진 파티원 본인은 즉시 조회 권한을 잃는다(아래 각 엔드포인트 설명 참고).
- `amount`는 생성 시점의 `subAmount / memberCount`(1/n) 값을 스냅샷으로 저장. 이후 구독 금액이 바뀌어도 과거 정산 금액은 변하지 않는다.
- 모든 정산 항목은 `"pending"`으로 시작하며, 파티원의 이체가 (파티장 육안 확인 등으로) 확인되면 파티장이 해당 항목만 `"done"`으로 변경한다 — 입금 자동 확인은 MVP 범위 밖.
- `transferLink`는 토스/카카오페이 딥링크 URL이며, 정확한 스킴/파라미터는 아직 미확정(하단 TODO 참고). 현재는 플레이스홀더 포맷으로 표기.
- 카카오톡 공유(정산 요청 메시지 전송)는 FE에서 카카오 SDK를 직접 호출하는 방식으로, 별도 BE 엔드포인트 없음(`3. 파티원`의 초대 링크 공유와 동일한 패턴).
- 정산은 별도 목록 페이지 없이 구독 상세 화면의 정산 카드로 접근한다. 구독 목록/전환은 기존 `GET /api/subscriptions`(2. 구독 서비스)를 그대로 쓰고, 상세 진입 후에는 `GET /api/subscriptions/:id/settlements`로 해당 구독의 월별 이력을 불러온다.
- 파티원은 `reportedAt`으로 이체 확인 요청을 할 수 있다(낮은 신뢰도 — `status`는 바뀌지 않음). 파티장은 요청을 보고 실제 확인 후 기존 상태 변경 엔드포인트로 **수락**(`status: "done"`) 또는 **거절**(`status: "pending"`)한다 — 어느 쪽이든 처리 시 `reportedAt`은 `null`로 초기화되어 안내가 사라지고, 거절된 파티원은 다시 요청할 수 있다.

| Method | Path | 설명 | 인증 |
| --- | --- | --- | --- |
| POST | `/api/subscriptions/:id/settlements` | 정산 생성(정산 요청 시작) | ✓ (파티장) |
| GET | `/api/subscriptions/:id/settlements` | 정산 이력 목록 조회(구독 하나) | ✓ |
| GET | `/api/subscriptions/:id/settlements/:settlementId` | 정산 상세 조회 | ✓ |
| POST | `/api/subscriptions/:id/settlements/:settlementId/members/:settlementMemberId/report` | 이체 확인 요청 | ✓ (본인) |
| PATCH | `/api/subscriptions/:id/settlements/:settlementId/members/:settlementMemberId` | 파티원 정산 상태 변경(수락/거절) | ✓ (파티장) |

### 정산 생성: `POST /api/subscriptions/:id/settlements`

- 파티장 전용. 요청 시점 기준 현재 결제월(`billingMonth`)로 생성.
- 현재 가입 완료된 `PartyMember` 전원에 대해 정산 항목을 생성(상태 `"pending"`).

**Response `201`**

```json
{
  "id": "settlement_1",
  "subscriptionId": "sub_1",
  "billingMonth": "2026-07",
  "members": [
    {
      "id": "sm_1",
      "userId": "user_2",
      "name": "김철수",
      "amount": 4250,
      "status": "pending",
      "doneAt": null,
      "reportedAt": null,
      "transferLink": "supertoss://send?amount=4250&bank=국민은행&accountno=123456-78-901234"
    }
  ],
  "createdAt": "2026-07-15T00:00:00.000Z"
}
```

**Error `403`**: 파티장이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

**Error `409`**: 이번 달(`billingMonth`) 정산이 이미 생성됨

### 정산 이력 목록 조회: `GET /api/subscriptions/:id/settlements`

- **파티장이면 무조건**, 파티원이면 **현재 `PartyMember`인 경우에만** 조회 가능(내보내진 파티원 본인은 즉시 조회 불가 — 단, 파티장 화면에는 그 사람의 과거 항목이 계속 보임).
- `role: "owner"`면 각 정산의 `memberCount`/`doneCount` 요약을 반환. `role: "member"`면 각 정산에서 본인의 `amount`/`status`/`reportedAt`/`settlementMemberId`/`transferLink`만 반환(다른 파티원 정보 제외) — 구독 상세 페이지의 정산 카드가 "지난 이력" 섹션을 채우고, 가장 최근 항목이 `pending`이면 그 자리에서 바로 이체·이체 확인 요청까지 할 수 있게 이 응답을 그대로 쓴다. `myReportedAt`은 목록에서도 대기/확인 대기중/확인 완료 3단계 상태를 구분해 보여주기 위한 필드. `mySettlementMemberId`/`myTransferLink`는 구독 상세에서 `GET .../settlements/:settlementId` 상세 조회 없이 바로 `POST .../report`를 호출하거나 토스 딥링크로 이동할 수 있게 하기 위한 필드.
- 월별 이력을 최신순으로 반환.

**Response `200`** (파티장 예시)

```json
{
  "items": [
    { "id": "settlement_3", "billingMonth": "2026-07", "memberCount": 3, "doneCount": 1, "createdAt": "2026-07-15T00:00:00.000Z" },
    { "id": "settlement_2", "billingMonth": "2026-06", "memberCount": 3, "doneCount": 3, "createdAt": "2026-06-15T00:00:00.000Z" }
  ]
}
```

**Response `200`** (파티원 예시 — 본인 항목만)

```json
{
  "items": [
    { "id": "settlement_7", "billingMonth": "2026-07", "myAmount": 3225, "myStatus": "pending", "myReportedAt": null, "mySettlementMemberId": "sm_10", "myTransferLink": "supertoss://send?amount=3225&bank=국민은행&accountno=12345678901234", "createdAt": "2026-07-03T00:00:00.000Z" },
    { "id": "settlement_6", "billingMonth": "2026-06", "myAmount": 3225, "myStatus": "done", "myReportedAt": null, "mySettlementMemberId": "sm_9", "myTransferLink": "supertoss://send?amount=3225&bank=국민은행&accountno=12345678901234", "createdAt": "2026-06-03T00:00:00.000Z" }
  ]
}
```

**Error `403`**: 파티장도 아니고 현재 파티원도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 구독

### 정산 상세 조회: `GET /api/subscriptions/:id/settlements/:settlementId`

- **파티장이면 무조건** 조회 가능(내보낸 파티원의 과거 항목 포함). 파티원이면 **현재 `PartyMember`이고 본인이 그 정산에 참여했던 경우에만** 조회 가능 — 내보내진 파티원 본인은 즉시 조회 불가.
- `role`이 `"owner"`이면 전체 파티원의 정산 항목(`members`)을 반환하며, FE는 파티원별 상태 리스트 + "카카오톡으로 정산 요청 공유" 버튼을 보여준다.
- `role`이 `"member"`이면 본인 항목 하나만 담긴 배열을 반환하고 `transferLink`도 포함한다. FE는 다른 파티원 목록을 보여주지 않고 본인 상태(대기중/완료)만 보여주며, 카카오톡 공유 버튼 대신 "토스로 이체하기"(`transferLink`) 버튼을 놓는다. 파티원의 일반적인 이체·이체 확인 요청 동선은 구독 상세 화면에 인라인으로 옮겨졌고(`GET .../settlements` 응답의 `myTransferLink`/`mySettlementMemberId` 사용), 이 엔드포인트의 member 응답은 주로 파티장이 "카카오톡으로 정산 요청" 버튼으로 공유한 링크를 파티원이 열었을 때(딥링크 진입) 쓰인다.

**Response `200`** (파티장 예시)

```json
{
  "id": "settlement_1",
  "subscriptionId": "sub_1",
  "billingMonth": "2026-07",
  "role": "owner",
  "members": [
    { "id": "sm_1", "userId": "user_2", "name": "김철수", "amount": 4250, "status": "done", "doneAt": "2026-07-16T00:00:00.000Z", "reportedAt": null },
    { "id": "sm_2", "userId": "user_3", "name": "이영희", "amount": 4250, "status": "pending", "doneAt": null, "reportedAt": "2026-07-16T08:00:00.000Z" }
  ],
  "createdAt": "2026-07-15T00:00:00.000Z"
}
```

- `sm_2`처럼 `status: "pending"`인데 `reportedAt`이 있으면 파티원이 이체 확인을 요청한 상태 — FE는 이 신호로 파티장에게 확인 요청 안내를 보여줄 수 있다.

**Response `200`** (파티원 예시 — 본인 항목만)

```json
{
  "id": "settlement_1",
  "subscriptionId": "sub_1",
  "billingMonth": "2026-07",
  "role": "member",
  "members": [
    {
      "id": "sm_2",
      "userId": "user_3",
      "name": "이영희",
      "amount": 4250,
      "status": "pending",
      "doneAt": null,
      "reportedAt": "2026-07-16T08:00:00.000Z",
      "transferLink": "supertoss://send?amount=4250&bank=국민은행&accountno=123456-78-901234"
    }
  ],
  "createdAt": "2026-07-15T00:00:00.000Z"
}
```

**Error `403`**: 파티장도 아니고 현재 파티원도 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 정산

### 이체 확인 요청: `POST /api/subscriptions/:id/settlements/:settlementId/members/:settlementMemberId/report`

- 파티원 본인 전용 — `:settlementMemberId`의 `SettlementMember.userId`가 요청자와 일치해야 한다.
- `reportedAt`을 현재 시각으로 설정한다(이미 설정돼 있어도 최신 시각으로 덮어씀 — 거절된 뒤 재요청하는 경우 포함). `status`는 변경하지 않는다.
- 최종 확정 권한은 여전히 파티장에게만 있다 — 이 호출은 파티장에게 "확인해보세요" 안내를 띄우는 용도일 뿐이다.

**Response `200`**

```json
{ "id": "sm_1", "status": "pending", "reportedAt": "2026-07-20T09:00:00.000Z" }
```

**Error `401`**: 로그인 필요

**Error `403`**: 본인의 정산 항목이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 정산 또는 파티원 항목

**Error `409`**: 이미 `"done"`으로 처리된 항목 — 이미 파티장이 확정한 항목은 요청할 필요가 없음

### 파티원 정산 상태 변경: `PATCH /api/subscriptions/:id/settlements/:settlementId/members/:settlementMemberId`

- 파티장 전용. 파티원의 확인 요청(`reportedAt`)를 확인한 뒤 실제로 입금됐으면 **수락**(`status: "done"`), 아니었으면 **거절**(`status: "pending"`)한다. 요청이 없었어도 파티장이 육안으로 직접 확인하고 바로 `"done"`으로 바꾸는 것도 그대로 허용(요청은 필수 전제 조건이 아니라 보조 신호).
- PATCH 호출 시(수락/거절 어느 쪽이든) `reportedAt`은 `null`로 초기화된다 — 요청 확인 처리했다는 의미이며, 거절된 파티원은 다시 요청(`POST .../report`)할 수 있다.
- `:settlementMemberId`는 `SettlementMember.id`(예: `sm_1`)이며, 파티원 목록의 `PartyMember.id`(`member_1`)와는 다른 값이다.

**Request**

```json
{ "status": "done" }
```

**Response `200`**

```json
{ "id": "sm_1", "status": "done", "doneAt": "2026-07-16T00:00:00.000Z", "reportedAt": null }
```

**Error `400`**: `status` 값이 `"pending"`/`"done"`이 아님

**Error `403`**: 파티장이 아닌 사용자의 접근

**Error `404`**: 존재하지 않는 정산 또는 파티원 항목

---

## 참고 / TODO

### 미해결 TODO

- 만족도 설문 및 AI 리포트 API는 아직 미작성.
- 요청 바디 유효성 검증 로직(Zod 등)은 아직 미구현(`backend/src/middleware/errorHandler.js`에는 에러 포맷터만 존재) — 검증 미들웨어 구현 시 `400` 에러의 상세 필드 목록을 이 문서에 추가할 것.
- `4. 정산`의 `transferLink` 딥링크 스킴/파라미터는 플레이스홀더 — 토스/카카오페이 딥링크 스펙 확인(`docs/plan.md`/`checklist.md` 2주차 기획 항목) 완료 후 실제 포맷으로 갱신 필요.

### 확정된 정책 · 구현 주의사항

- `1. 인증`, `2. 구독 서비스`, `3. 파티원`, `4. 정산` 섹션은 `backend/prisma/schema.prisma`의 `User`/`Subscription`/`PartyMember`/`Settlement`/`SettlementMember` 모델로 DB 설계 완료. 나머지(만족도) 섹션은 아직 스키마 설계 전.
- 구독 삭제(`DELETE /api/subscriptions/:id`) 시 연관 정산 이력(`Settlement`/`SettlementMember`)도 함께 삭제됨(cascade) — 확정.
- `GET /api/subscriptions/dashboard`는 `GET /api/subscriptions/:id`와 경로가 겹치므로, 백엔드 구현 시 반드시 `/:id`보다 먼저 라우터에 등록할 것(순서가 바뀌면 `dashboard`가 `:id` 파라미터로 매칭돼 영영 도달 불가).
- 초대용 `state` 파라미터는 `backend/src/lib/jwt.js`의 `signInviteState`/`verifyInviteState`로 서명·검증됨(만료 10분, `purpose: 'invite'` 클레임) — 위변조/만료된 state는 콜백에서 무조건 `/`로 리다이렉트되어 확정.
- `Subscription.accountNumber`/`accountHolderName`은 `backend/src/lib/crypto.js`(AES-256-GCM, `ACCOUNT_ENCRYPTION_KEY` 환경변수)로 암호화해 저장 — 확정. `bankName`은 평문 유지. API 응답 스키마(필드명/형태)는 변경 없음, DB 저장 형식만 암호문으로 바뀜.
