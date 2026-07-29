# 번개모임 & 소모임 — API 명세서

`번개모임_소모임_DB_스키마_설계서.md`의 테이블 구조를 기준으로 작성했습니다. REST + JSON, 인증은 세션 쿠키 방식을 가정합니다 (프론트/백엔드 도메인이 분리되면 JWT로 바꿔도 이 명세는 그대로 적용됩니다).

**공통 응답 형식**
- 성공: `{ "data": ... }`
- 실패: `{ "error": { "code": "...", "message": "..." } }`

**공통 에러 코드**
| 코드 | 상황 |
|---|---|
| `UNAUTHENTICATED` | 로그인 필요 |
| `FORBIDDEN` | 권한 없음 (예: 모임장이 아닌 사람이 승인 시도) |
| `NOT_FOUND` | 대상 리소스 없음 |
| `VALIDATION_ERROR` | 요청 값 오류 |
| `SUSPENDED` | 정지된 계정의 요청 |

---

## 1. 인증 / 회원가입

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/auth/google` | 구글 OAuth 인가 코드를 받아 로그인 처리. 기존 계정 없으면 자동 회원가입 | 불필요 |
| POST | `/api/auth/kakao` | 카카오 OAuth 인가 코드를 받아 로그인 처리 | 불필요 |
| POST | `/api/auth/logout` | 세션 종료 | 필요 |
| GET | `/api/users/me` | 로그인한 사용자 정보 조회 | 필요 |
| PATCH | `/api/users/me` | 생년월일 최초 1회 등록 (이후 수정 불가) | 필요 |

### POST /api/auth/google

**요청**
```json
{ "code": "구글 OAuth 인가 코드" }
```

**응답**
```json
{
  "data": {
    "user": { "id": 1, "nickname": "홍길동", "email": "...", "birthDateRequired": true },
    "isNewUser": true
  }
}
```
`birthDateRequired: true`면 프론트에서 생년월일 입력 화면으로 보냅니다 (기획서 6.1).

### GET /api/users/me

**응답**
```json
{
  "data": {
    "id": 1, "nickname": "홍길동", "email": "...",
    "birthDate": "2001-05-20", "trustScore": 50.0, "evaluationCount": 2
  }
}
```
- `evaluationCount`: 신뢰도 점수에 **실제로 반영된**(진술 대조를 통과한) 평가 수입니다(8절). 진술이 엇갈려 무효 처리된 평가는 세지 않습니다 — "이 점수가 얼마나 많은 근거 위에 있는가"를 보여주는 게 목적이라, 무효표를 포함하면 그 목적을 배신하기 때문입니다. 평가·취소가 재계산을 트리거할 때만 갱신됩니다(8절 "재계산 시점" 참고).

### PATCH /api/users/me

**요청**
```json
{ "birthDate": "2001-05-20" }
```

`birthDate`는 **최초 1회만** 설정할 수 있습니다 (현재 값이 `null`일 때만 허용). 이미 값이 있는 상태에서
다시 요청하면 `VALIDATION_ERROR`(400) "생년월일은 수정할 수 없습니다"를 반환합니다.

**검증**: `YYYY-MM-DD` 형식 + 실재하는 날짜 + 미래 날짜가 아닐 것. 하나라도 어긋나면 `VALIDATION_ERROR`.

**응답**
```json
{ "data": { "id": 1, "nickname": "홍길동", "email": "...", "birthDate": "2001-05-20" } }
```

**`birthDate`의 형식**: 요청·응답 모두 `'YYYY-MM-DD'` 문자열입니다. 값이 없으면 `null`입니다.
`GET /api/users/me`와 로그인 응답도 같은 형식으로 내려갑니다 — PostgreSQL의 `date` 값을 그대로
직렬화하면 UTC로 변환되면서 KST 기준 하루가 밀리므로(`2001-05-20` → `2001-05-19T15:00:00.000Z`),
서버가 날짜 문자열로 변환해 내보냅니다.

---

## 2. 모임

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/meetings` | 목록/검색 | 불필요 |
| POST | `/api/meetings` | 모임 등록 | 필요 |
| GET | `/api/meetings/:id` | 상세 조회 | 불필요 |
| PATCH | `/api/meetings/:id` | 모임 정보 수정 | 필요 (모임장만) |
| DELETE | `/api/meetings/:id` | 모임 취소 | 필요 (모임장만) |

### GET /api/meetings

**쿼리 파라미터**

| 이름 | 타입 | 설명 |
|---|---|---|
| type | `flash` \| `small` | 모임 유형 |
| category | string | 카테고리 |
| keyword | string | 제목/설명 검색 |
| regionSido | string | 시/도 |
| regionSigungu | string | 시/군/구 |
| status | `recruiting` \| `closed` | 모집 상태. 생략하면 둘 다 포함. 그 외 값은 `VALIDATION_ERROR` |
| sort | `recent` | 정렬. 생략하면 임박순(`start_at` 오름차순), `recent`면 등록순(`created_at` 내림차순). 그 외 값은 `VALIDATION_ERROR` |
| page | int | 기본 1. 숫자가 아니거나 범위를 벗어나면 조용히 1페이지로 처리 (에러 아님) |

지난 모임(`finished`)과 취소된 모임(`cancelled`)은 기본적으로 결과에서 제외됩니다 (DB 설계서 3번).

**응답**
```json
{
  "data": {
    "items": [
      {
        "id": 10, "type": "flash", "title": "오늘 저녁 풋살 4명",
        "category": "운동", "regionSigungu": "강남구",
        "startAt": "2026-07-09T19:00:00+09:00",
        "capacity": 4, "status": "recruiting", "confirmedCount": 2
      }
    ],
    "page": 1, "totalPages": 3, "total": 47
  }
}
```

- `total`은 페이지네이션으로 잘리기 전의 **전체 건수**입니다. `items`는 한 페이지(20건)로 잘리므로, 총 개수를 표시해야 하는 화면은 `items.length`가 아니라 이 값을 써야 합니다.
- **`openChatUrl`은 목록 항목에 포함되지 않습니다.** 참여 확정자에게만 의미가 있어 상세 조회에서만 조건부로 내려갑니다.
- `confirmedCount`는 각 항목의 참여 확정 인원 수입니다 (`confirmed`·`approved` 상태 합산 — 상세 응답과 동일한 정의).

### POST /api/meetings

**요청**
```json
{
  "type": "flash",
  "title": "오늘 저녁 풋살 4명",
  "category": "운동",
  "description": "OO풋살장에서 즐겁게 뛰실 분 구해요",
  "regionSido": "서울특별시", "regionSigungu": "강남구", "regionEupmyeondong": "역삼동",
  "startAt": "2026-07-09T19:00:00+09:00",
  "endAt": null,
  "capacity": 4,
  "adultOnly": false,
  "openChatUrl": "https://open.kakao.com/o/xxxxxxx",
  "applyQuestion": "왜 참여하고 싶으신가요?"
}
```
- `type: "small"`이면 `capacity`는 무시(또는 null 강제), `endAt` 필수.
- `openChatUrl`은 `open.kakao.com` 패턴 검증만 수행 (기획서 11번 "오픈채팅 링크 오류" 행 — 그 이상 검증 없음).
- `category`는 `운동`·`스터디`·`취미`·`식사`만 허용합니다. `전체`는 목록 필터 전용 값이라 등록에는 쓸 수 없고, 그 외 값과 함께 `VALIDATION_ERROR`(400)입니다.
- `regionSido`/`regionSigungu`는 공용 지역 데이터(`shared/regions.json`, 17개 시/도·229개 시/군/구)에 있는 **조합**만 허용합니다. `regionSido`가 목록에 없거나 `regionSigungu`가 그 시/도 하위가 아니면 `VALIDATION_ERROR`(400)입니다. 세종특별자치시는 하위 구분이 없어 `regionSigungu`도 `세종특별자치시`로 보냅니다.
- `applyQuestion`(선택): 신청자에게 보여줄 가입 질문입니다. **소모임(`small`)에서만 의미가 있습니다** — `type: "flash"`에서는 값을 보내도 무시하고 `null`로 저장합니다(`capacity`/`endAt`을 type별로 무시하는 것과 같은 방식). 최대 200자(코드포인트 기준, 이모지 1자 = 1자). 빈 문자열/공백만 보내면 `null`(질문 없음)로 저장됩니다.
- 이 두 검증은 `PATCH /api/meetings/:id`(모임 수정, 모임장만)에도 동일하게 적용됩니다. 모임 수정은 부분 수정이 아니라 이 섹션과 같은 본문 전체를 다시 검증하는 **전체 교체(full-replace)**이며(`type`만 기존 값과 같아야 함), 같은 검증 함수를 재사용합니다. **단, `applyQuestion`은 예외입니다** — body에 이 키 자체가 없으면(`undefined`) 기존 질문을 그대로 유지하고, 키가 있으면(값이 `null`이어도) 그 값으로 교체합니다. 또한 **활성 신청자(`pending`/`confirmed`/`approved`)가 1명이라도 있는 상태에서 질문을 기존과 다른 값으로 바꾸려 하면** `VALIDATION_ERROR`(400) — 이미 받은 답변이 엉뚱한 질문에 붙는 것을 막기 위해서입니다. 같은 값을 다시 보내는 것은 변경이 아니므로 허용됩니다.

### GET /api/meetings/:id

**응답** (로그인 사용자 기준으로 개인화됨)
```json
{
  "data": {
    "id": 10, "type": "flash", "title": "...", "status": "recruiting",
    "host": { "id": 5, "nickname": "A", "trustScore": 52.0 },
    "capacity": 4, "confirmedCount": 2,
    "openChatUrl": "https://open.kakao.com/o/xxxxxxx",
    "applyQuestion": "왜 참여하고 싶으신가요?",
    "myParticipation": { "status": "confirmed" },
    "canApply": false, "blockReason": "ALREADY_APPLIED"
  }
}
```
- `openChatUrl`은 아직 참여 확정 전인 사용자에게는 내려주지 않습니다 (소모임은 승인 전, 번개모임은 신청 전) — 기획서 8번 화면 구성 원칙. **값을 `null`로 주는 것이 아니라 키 자체를 응답에서 제외**하므로, 프론트는 이 키의 존재 여부만으로 노출을 판단하면 됩니다.
- `applyQuestion`은 항상 포함됩니다. 질문이 없으면 `null`입니다.
- `myParticipation`은 비로그인이거나 신청 이력이 없으면 `null`.
- `confirmedCount`는 `confirmed`와 `approved` 상태만 셉니다(`pending`·`cancelled` 제외).
- `canApply`(boolean)·`blockReason`(string|null): 지금 이 사용자가 참여 신청을 할 수 있는지와, 할 수 없다면 그 이유. `blockReason`은 `LOGIN_REQUIRED`·`HOST`·`ALREADY_APPLIED`·`REJECTED`·`CANCELLED_MEETING`·`ENDED`·`FULL`·`BIRTHDATE_REQUIRED`·`ADULT_ONLY` 중 하나이며, `canApply`가 `true`면 `null`입니다.
- 목록과 달리 **지난 모임과 취소된 모임도 그대로 반환**합니다. 상세 페이지에서 "종료된 모임"으로 표시해야 하기 때문입니다 (기획서 11번).
- `:id`가 숫자로만 이루어지지 않았거나(`1abc`, `1.9`) 안전한 정수 범위를 벗어나면 `NOT_FOUND`(404)입니다.

### DELETE /api/meetings/:id

모임 취소. 서버는 `meetings.status = 'cancelled'`로 갱신하고, 해당 모임의 `meeting_participants` 전원을 `cancelled`로 일괄 갱신합니다 (DB 설계서 4번).

**실패**
- 모임장 본인 아님 → `FORBIDDEN`(403)
- 이미 취소된 모임 → `VALIDATION_ERROR`(400)
- 없는 모임 → `NOT_FOUND`(404)
- 비로그인 → `UNAUTHENTICATED`(401)

**응답**
```json
{ "data": { "status": "cancelled" } }
```

---

## 3. 참여 신청

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/meetings/:id/apply` | 참여 신청 | 필요 |
| DELETE | `/api/meetings/:id/apply` | 참여 신청 취소 | 필요 (신청자 본인) |
| GET | `/api/meetings/:id/participants` | 신청자 목록 조회 | 필요 (모임장만) |
| PATCH | `/api/meetings/:id/participants/:userId` | 승인/거절 | 필요 (모임장만, 소모임만) |

### POST /api/meetings/:id/apply

**요청** (선택)
```json
{ "answer": "책을 좋아해서요" }
```
- `type: "flash"` 모임: 정원 여유 있으면 즉시 `status: "confirmed"`로 생성됩니다. 이 신청으로 마지막 자리가 차면 모임이 `closed` 상태로 전환됩니다.
- `type: "small"` 모임: `status: "pending"`으로 생성됩니다.
- 내가 취소(`cancelled`)했던 모임에는 재신청할 수 있지만, 모임장이 거절(`rejected`)한 모임에는 재신청할 수 없습니다.
- `answer`: 모임에 `applyQuestion`(가입 질문)이 설정돼 있으면 **필수**입니다 — 비어 있거나(공백만 포함) 보내지 않으면 `VALIDATION_ERROR`(400) "가입 질문에 답변해야 신청할 수 있습니다". 질문이 없는 모임에서는 `answer`를 보내도 무시되고 `null`로 저장됩니다. 최대 500자(코드포인트 기준). 신청 자격 자체가 없는 경우(자기 모임, 거절 이력 등)에는 답변 검증보다 자격 판정이 먼저 이뤄지므로 그쪽 사유가 우선 반환됩니다.

**응답**
```json
{ "data": { "status": "confirmed" } }
```
(`type: "small"`이면 `"pending"`)

**실패**
- 자기 모임에 신청 / 이미 신청함 / 거절된 모임에 재신청 / 취소된 모임 / 종료된 모임 / 정원 마감 → `VALIDATION_ERROR`(400)
- 미성년 계정이 `adultOnly` 모임에 신청 → `FORBIDDEN`(`ADULT_ONLY`, 403)
- 생년월일 미입력 상태로 신청 → `FORBIDDEN`(403)
- 비로그인 → `UNAUTHENTICATED`(401)
- 없는 모임 → `NOT_FOUND`(404)

### DELETE /api/meetings/:id/apply

참여/신청 취소.
- **취소는 신뢰도를 즉시 깎지 않습니다.** `confirmed`·`approved` 상태였던 신청을 취소하면 `participation_cancellations`에 이력만 남고(8절 참고), 같은 요청 안에서 신뢰도가 그 이력을 포함해 재계산됩니다 — 모임 시작 **24시간 이내**의 확정 취소만 감점(−1.5 상당)으로 반영되고, 그보다 이른 취소나 `pending` 상태였던 취소는 감점이 없습니다. "확정 후 취소 = −3"이던 옛 규칙은 2026-07-29에 폐기됐습니다(`docs/superpowers/specs/2026-07-22-신뢰도-알고리즘-design.md` 7장). 이 취소로 자리가 빈 flash 모임이 `closed` 상태였다면 다시 `recruiting`으로 재오픈됩니다.
- `pending` 상태였던 신청을 취소해도 이력은 남지만(`was_confirmed=false`) 감점은 없습니다.

**응답**
```json
{ "data": { "status": "cancelled" } }
```

취소할 신청이 없으면(이미 취소됨·거절됨·애초에 신청한 적 없음) `NOT_FOUND`(404).

### GET /api/meetings/:id/participants

모임장이 보는 신청자 목록. 모임장 본인이 아니면 `FORBIDDEN`(403). 조회는 부작용이 없으므로 **번개모임에서도 허용**합니다(승인 절차가 있는 것은 소모임뿐이지만, 모임장은 누가 오는지 알아야 합니다).

**응답**
```json
{
  "data": {
    "items": [
      {
        "userId": 7, "nickname": "홍길동", "trustScore": 50,
        "status": "pending",
        "appliedAt": "2026-07-22T01:00:00.000Z", "respondedAt": null,
        "applyAnswer": "책을 좋아해서요"
      }
    ]
  }
}
```

- `pending`·`approved`·`rejected`·`cancelled`를 **전부** 포함합니다. 승인·거절 결과가 목록에 남아야 모임장이 자기 처리 결과를 확인할 수 있기 때문입니다. 화면의 "신청자 N명" 집계에서 취소·거절을 뺄지는 프론트가 정합니다.
- `applyAnswer`: 신청 시 답변입니다(없으면 `null`). **이 모임장 전용 엔드포인트에만 실립니다** — 상세 조회(`GET /api/meetings/:id`) 응답에는 포함되지 않습니다.
- 정렬은 `appliedAt` 오름차순이며, 같은 시각이면 `userId` 오름차순입니다(Postgres는 동률 행의 순서를 보장하지 않습니다).
- 신청자가 없으면 `items`는 빈 배열입니다.
- `appliedAt`·`respondedAt`은 `timestamp`(타임존 없음) 컬럼이라 서버 로컬 시각(KST)으로 해석돼 UTC 문자열로 직렬화됩니다. 예시의 `01:00Z`는 KST `10:00`입니다.

### PATCH /api/meetings/:id/participants/:userId

**요청**
```json
{ "status": "approved" }
```

**응답**
```json
{ "data": { "userId": 7, "status": "approved" } }
```

- `status`는 `approved` 또는 `rejected`만 허용합니다. 그 외(누락·`pending`·임의 문자열)는 `VALIDATION_ERROR`(400).
- **소모임에서만** 가능합니다. 번개모임은 승인 절차가 없으므로 `VALIDATION_ERROR`(400).
- 모임장 본인이 아니면 `FORBIDDEN`(403).
- **`pending`인 신청만** 처리할 수 있습니다. 이미 처리된 신청(`approved`/`rejected`/`cancelled`)은 `VALIDATION_ERROR`(400), 신청 이력 자체가 없으면 `NOT_FOUND`(404)로 구분합니다.
- 승인 철회(`approved` → `rejected`)는 지원하지 않습니다. 확정 참여자를 강제로 내보내는 것이라 신뢰도 감점 정책이 먼저 필요합니다.
- 소모임은 `capacity`가 `NULL`(무제한)이므로 승인에 정원 검사가 없습니다.
- 승인하면 `responded_at`이 기록되고, 그 신청자는 다음 상세 조회부터 `openChatUrl`을 받게 됩니다.

---

## 4. 마이페이지

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/users/me/hosted-meetings` | 내가 등록한 모임 (신청자 수, 대기 중인 승인 건수 포함) | 필요 |
| GET | `/api/users/me/joined-meetings` | 내가 신청/참여한 모임과 상태 | 필요 |

### GET /api/users/me/hosted-meetings

**응답**
```json
{
  "data": {
    "items": [
      { "id": 4, "title": "...", "type": "small",
        "startAt": "...", "endAt": "...", "status": "recruiting",
        "applicantCount": 3, "pendingCount": 2 }
    ]
  }
}
```
- `applicantCount`: 활성 신청자(pending+approved+confirmed). `pendingCount`: 승인 대기(pending).
- 취소·종료된 내 모임도 포함. 정렬 `created_at DESC`.

### GET /api/users/me/joined-meetings

**응답**
```json
{
  "data": {
    "items": [
      { "meeting": { "id": 10, "title": "...", "type": "small",
                     "startAt": "...", "endAt": "...",
                     "host": { "nickname": "홍길동" } },
        "status": "pending", "appliedAt": "..." }
    ]
  }
}
```
- 모든 상태(pending/confirmed/approved/rejected/cancelled) 이력 포함. 정렬 `applied_at DESC`.

---

## 5. 신고

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/reports` | 모임 신고 접수 | 필요 |

### POST /api/reports

**요청**
```json
{
  "meetingId": 10,
  "reason": "minor_violation",
  "description": "미성년자가 포함된 모임에서 음주가 있었다고 함"
}
```
`reason`: `inappropriate_content` \| `minor_violation` \| `broken_chat_link` \| `other`

신고는 접수만 하고 자동 조치는 없습니다. 검토·삭제·계정 정지는 개발자가 DB를 직접 확인해 처리합니다 (기획서 12.1) — 이 API 명세에는 관리자용 엔드포인트를 따로 두지 않았습니다.

---

## 6. 엔드포인트에 없는 것 (의도적으로 제외)

- **관리자(어드민) API** — 1차는 개발자가 DB에 직접 접근 (기획서 12.1). 신고 목록 조회 API조차 필요 없고, DB 클라이언트로 `reports` 테이블을 직접 봅니다.
- **차단 API** — 2차 개발 범위. 필요해지면 `POST/DELETE /api/users/:id/block` 형태로 추가하면 됩니다.
- **알림 실시간 푸시·이메일 발송** — 헤더 뱃지 + 목록(아래 7번)까지만 하기로 했습니다. 브라우저 권한·서비스워커·HTTPS·발송 서비스가 따라붙어 범위가 급증하기 때문입니다. 알림 자체는 있습니다 — 7번을 보세요.

---

## 7. 알림

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/notifications` | 최근 알림 목록 + 미읽음 수 조회 | 필요 |
| POST | `/api/notifications/read` | 내 미읽음 알림 전체 읽음 처리 | 필요 |

### GET /api/notifications

**응답**
```json
{
  "data": {
    "items": [
      {
        "id": 12, "type": "application_approved", "meetingId": 3,
        "meetingTitle": "등산 번개", "isRead": false,
        "createdAt": "2026-07-28T01:00:00.000Z"
      }
    ],
    "unreadCount": 2
  }
}
```
- 최근 **20건**만 반환합니다. 정렬은 `createdAt` 내림차순이며, 같은 시각이면 `id` 내림차순입니다(Postgres가 동시각 행의 순서를 보장하지 않아 tiebreak가 필요합니다 — 참여 신청자 목록 정렬과 같은 이유, 3절 참고).
- `unreadCount`는 20건 상한과 무관하게 **전체 미읽음 수**입니다.
- `meetingTitle`은 알림 발생 시점이 아니라 **조회 시점**의 모임 제목입니다(제목을 알림에 복사 저장하지 않고 매번 조회 시 `meetings`와 조인) — 모임 제목이 나중에 바뀌면 과거 알림도 최신 제목으로 보입니다.
- 비로그인 → `UNAUTHENTICATED`(401).

**`type` 값 5종**

| type | 의미 | 생성 시점 | 수신자 |
|---|---|---|---|
| `new_application` | 내 소모임에 새 신청이 들어옴 | 참여 신청(3절)에서 소모임 신청이 `pending`으로 생성될 때. 번개모임은 즉시 `confirmed`라 알림이 생기지 않습니다 | 모임장 |
| `application_approved` | 내 신청이 승인됨 | 승인/거절(3절 `PATCH .../participants/:userId`)에서 모임장이 승인할 때 | 신청자 |
| `application_rejected` | 내 신청이 거절됨 | 위와 같은 엔드포인트에서 모임장이 거절할 때 | 신청자 |
| `meeting_cancelled` | 참여 중이던 모임이 취소됨 | 모임 취소(2절 `DELETE /api/meetings/:id`)에서 모임장이 취소할 때. **취소 직전 활성 참여자(`pending`/`confirmed`/`approved`)에게만** 갑니다 — 이미 거절·취소된 신청자는 받지 않습니다 | 활성 참여자(여러 명) |
| `evaluation_requested` | 평가할 모임이 생김 | 앞의 4종과 달리 **행위 시점에 생성되지 않습니다.** 크론이 없어 "모임이 방금 끝났다"를 감지할 수단이 없기 때문에, **`GET /api/notifications` 조회 시점에** 호출자 본인에 대해서만 `listPendingEvaluations`(8절)를 돌려 대상 모임을 lazy 생성합니다. 멱등성은 `(user_id, meeting_id) WHERE type='evaluation_requested'` 부분 유니크 인덱스 + `ON CONFLICT DO NOTHING`이 보장합니다. 이 lazy 생성이 실패해도 격리돼 있어 알림 목록 조회 자체는 200으로 정상 응답합니다(로그만 남김) | 모임장·확정 참여자 |

알림 INSERT는 원인 행위(신청 생성·승인/거절·모임 취소)와 **같은 트랜잭션 안**에서 일어나는 것이 원칙입니다 — 행위는 커밋됐는데 알림만 유실되는 상황을 막기 위해서입니다. 승인/거절 엔드포인트는 원래 트랜잭션 없이 조건부 `UPDATE` 한 문장(CAS)으로 처리했으나, 알림을 같은 트랜잭션에 묶기 위해 트랜잭션을 새로 감쌌습니다. **`evaluation_requested`만 예외**입니다 — "행위"가 아니라 조회 시점의 최선 노력형(best-effort) 보강이라 별도 트랜잭션 없이 생성되고, 실패해도 원래 요청(알림 목록 조회)을 막지 않습니다.

### POST /api/notifications/read

바디 없음. 내 미읽음 알림을 전부 읽음 처리합니다(항목별 읽음 처리는 없습니다).

**응답**
```json
{ "data": { "unreadCount": 0 } }
```
비로그인 → `UNAUTHENTICATED`(401).

---

## 8. 신뢰도 평가

모임 후 모임장↔확정 참여자 상호 평가(3단계, 2026-07-29 구현). `users.trust_score`는 이제 이 평가·취소 이력에서 계산되는 **파생값**입니다 — 설계는 `docs/superpowers/specs/2026-07-22-신뢰도-알고리즘-design.md`, 산식·진술 대조 규칙이 전부 그 문서에 있습니다. 이 절은 API 계약만 다룹니다.

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/evaluations/pending` | 내가 아직 평가하지 않은 모임 목록 | 필요 |
| POST | `/api/meetings/:id/evaluations` | 그 모임에 대한 평가 제출(모임장은 여러 명 일괄, 참여자는 모임장 한 명) | 필요 |

### GET /api/evaluations/pending

**응답**
```json
{
  "data": {
    "items": [
      {
        "meeting": { "id": 10, "title": "등산 번개", "type": "small",
                     "startAt": "2026-07-01T01:00:00.000Z", "endAt": "2026-07-01T03:00:00.000Z" },
        "role": "host",
        "targets": [ { "userId": 7, "nickname": "홍길동" }, { "userId": 8, "nickname": "김철수" } ]
      }
    ],
    "count": 1
  }
}
```
- **평가 창**: 모임 종료(`COALESCE(end_at, start_at) < now()`) 후 **14일간**만 열립니다. `status = 'cancelled'`인 모임은 열리지 않습니다.
- **자격**: 확정이었던 사람만(`meeting_participants.status IN ('confirmed','approved')`) 대상입니다. `role: "host"`면 그 모임에서 내가 확정 참여자 전원(`targets`, 여러 명)을 평가해야 하고, `role: "participant"`면 모임장 한 명(`targets`에 1건)을 평가해야 합니다.
- 이미 평가를 제출한 대상은 `targets`에서 빠집니다. 모임의 대상을 전부 평가하면 그 모임 자체가 `items`에서 사라집니다.
- `count`는 **모임 수**입니다(대상 인원 수 합이 아님) — 헤더 뱃지·마이페이지 섹션 제목("평가할 모임 (N)")에 그대로 씁니다.
- 비로그인 → `UNAUTHENTICATED`(401).

### POST /api/meetings/:id/evaluations

**요청**
```json
{
  "evaluations": [
    { "rateeId": 7, "attended": true, "tags": ["punctual", "friendly"] },
    { "rateeId": 8, "attended": false, "tags": [] }
  ]
}
```
- `evaluations`: 평가 항목 배열, **필수**. 비어 있으면 `VALIDATION_ERROR`(400).
- `rateeId`: 평가 대상 사용자 id(양의 정수), 필수.
- `attended`: 출석 여부(boolean), 필수. 소모임은 "성실히 참여했나요", 번개모임은 "오셨나요"로 화면 문구만 다르고 데이터 구조는 동일합니다.
- `tags`: 선택. 알려진 태그 코드만 허용하고, 중복 불가, **긍정·부정 각각 최대 3개**까지만 반영됩니다(그 이상이면 400).

**태그 코드 7종** — `punctual`(시간 약속을 잘 지켜요) · `friendly`(분위기를 좋게 만들어요) · `good_talk`(대화가 즐거웠어요) · `again`(또 만나고 싶어요) / `late`(시간 약속을 안 지켰어요) · `rude`(예의가 부족했어요) · `different`(공지와 달랐어요). 모임장→참여자와 참여자→모임장이 같은 목록을 씁니다.

**응답**
```json
{ "data": { "submitted": 2 } }
```

**동작**
- **모임장**은 `evaluations`에 확정 참여자 여러 명을 한 번에 담아 보낼 수 있습니다. **참여자**는 모임장 한 명만 평가할 수 있습니다(대상이 아니면 400).
- 제출·수정과 **rater·모든 ratee의 신뢰도 재계산이 한 트랜잭션 안**에서 일어납니다. 내 제출이 상대의 판정을 뒤집을 수 있기 때문에(아래 진술 대조), 나뿐 아니라 이번에 평가한 상대들도 함께 재계산됩니다.
- **진술 대조**: 같은 모임에서 두 사람 사이의 평가가 양쪽 다 제출되면, 둘 다 `attended: true`일 때만 유효합니다. 한쪽만 제출했으면 그 한쪽이 그대로 유효(노쇼 포함). 엇갈리면(예: 한쪽은 왔다, 한쪽은 안 왔다) **양쪽 다 무효**가 되어 점수에 반영되지 않습니다. 상대가 나중에 반대 진술을 제출하면 이미 반영된 판정도 실시간으로 뒤집힙니다.
- **수정**: 처음 제출 후 **24시간 이내 1회**만 수정할 수 있습니다. 두 번째 수정 시도는 `VALIDATION_ERROR`(400) "평가는 한 번만 수정할 수 있습니다", 24시간이 지난 뒤의 첫 수정 시도는 "평가 수정 시간(24시간)이 지났습니다".

**실패**
- 비로그인 → `UNAUTHENTICATED`(401)
- 없는 모임 → `NOT_FOUND`(404)
- 내가 모임장도 확정 참여자도 아님 → `FORBIDDEN`(403) "이 모임을 평가할 수 없습니다" — 거절당한 신청자의 보복 평가도 여기서 막힙니다
- 취소된 모임 → `VALIDATION_ERROR`(400) "취소된 모임은 평가할 수 없습니다"
- 아직 끝나지 않은 모임 → `VALIDATION_ERROR`(400) "아직 끝나지 않은 모임입니다"
- 종료 후 14일 초과 → `VALIDATION_ERROR`(400) "평가 기간이 지났습니다"
- 평가 대상 자격 없음(모임장이 비확정 참여자를 지정 / 참여자가 모임장이 아닌 사람을 지정) → `VALIDATION_ERROR`(400) "평가할 수 없는 대상입니다"
- `evaluations` 누락·빈 배열, `rateeId`가 유효한 정수가 아님, `attended`가 boolean이 아님, `tags`에 알 수 없는 코드·중복·부호당 4개 이상 → `VALIDATION_ERROR`(400)

### `evaluationCount`와 `trustScore`

`GET /api/users/me`(1절)의 `evaluationCount`는 이 절에서 유효로 판정된 평가 수만 셉니다. `trustScore`(1절·2절 `host.trustScore`·3절 `participants[].trustScore`)는 소수 1자리로 반올림된 캐시값이며, 평가·취소가 재계산을 트리거할 때만 갱신됩니다 — 조회할 때마다 다시 계산하지 않습니다(설계 5.5, 읽기가 쓰기를 유발하지 않기 위해서입니다).
