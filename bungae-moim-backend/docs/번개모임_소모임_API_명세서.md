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
| PATCH | `/api/users/me` | 생년월일 등 최초 입력값 등록/수정 | 필요 |

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

### PATCH /api/users/me

**요청**
```json
{ "birthDate": "2001-05-20" }
```

> ⚠️ **아직 구현되지 않았습니다** (2026-07-20 기준). D5로 예정돼 있으며, 이것이 없으면 모든 사용자의
> `birthDate`가 `null`이라 "성인만 참여 가능" 모임에 아무도 참여할 수 없습니다. 참여 신청(F1)보다
> 먼저 구현해야 합니다.

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
        "capacity": 4, "status": "recruiting"
      }
    ],
    "page": 1, "totalPages": 3, "total": 47
  }
}
```

- `total`은 페이지네이션으로 잘리기 전의 **전체 건수**입니다. `items`는 한 페이지(20건)로 잘리므로, 총 개수를 표시해야 하는 화면은 `items.length`가 아니라 이 값을 써야 합니다.
- **`openChatUrl`은 목록 항목에 포함되지 않습니다.** 참여 확정자에게만 의미가 있어 상세 조회에서만 조건부로 내려갑니다.
- ⚠️ **`confirmedCount`는 아직 목록 응답에 구현되지 않았습니다** (2026-07-20 기준). 참여 신청(F1)이 들어오는 시점에 추가할 예정이며, 그 전까지 화면은 참여 인원을 0으로 표시합니다.

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
  "openChatUrl": "https://open.kakao.com/o/xxxxxxx"
}
```
- `type: "small"`이면 `capacity`는 무시(또는 null 강제), `endAt` 필수.
- `openChatUrl`은 `open.kakao.com` 패턴 검증만 수행 (기획서 11번 "오픈채팅 링크 오류" 행 — 그 이상 검증 없음).

### GET /api/meetings/:id

**응답** (로그인 사용자 기준으로 개인화됨)
```json
{
  "data": {
    "id": 10, "type": "flash", "title": "...", "status": "recruiting",
    "host": { "id": 5, "nickname": "A", "trustScore": 52.0 },
    "capacity": 4, "confirmedCount": 2,
    "openChatUrl": "https://open.kakao.com/o/xxxxxxx",
    "myParticipation": { "status": "confirmed" }
  }
}
```
- `openChatUrl`은 아직 참여 확정 전인 사용자에게는 내려주지 않습니다 (소모임은 승인 전, 번개모임은 신청 전) — 기획서 8번 화면 구성 원칙. **값을 `null`로 주는 것이 아니라 키 자체를 응답에서 제외**하므로, 프론트는 이 키의 존재 여부만으로 노출을 판단하면 됩니다.
- `myParticipation`은 비로그인이거나 신청 이력이 없으면 `null`.
- `confirmedCount`는 `confirmed`와 `approved` 상태만 셉니다(`pending`·`cancelled` 제외).
- 목록과 달리 **지난 모임과 취소된 모임도 그대로 반환**합니다. 상세 페이지에서 "종료된 모임"으로 표시해야 하기 때문입니다 (기획서 11번).
- `:id`가 숫자로만 이루어지지 않았거나(`1abc`, `1.9`) 안전한 정수 범위를 벗어나면 `NOT_FOUND`(404)입니다.

### DELETE /api/meetings/:id

모임 취소. 서버는 `meetings.status = 'cancelled'`로 갱신하고, 해당 모임의 `meeting_participants` 전원을 `cancelled`로 일괄 갱신합니다 (DB 설계서 4번).

---

## 3. 참여 신청

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| POST | `/api/meetings/:id/apply` | 참여 신청 | 필요 |
| DELETE | `/api/meetings/:id/apply` | 참여 신청 취소 | 필요 (신청자 본인) |
| GET | `/api/meetings/:id/participants` | 신청자 목록 조회 | 필요 (모임장만) |
| PATCH | `/api/meetings/:id/participants/:userId` | 승인/거절 | 필요 (모임장만, 소모임만) |

### POST /api/meetings/:id/apply

- `type: "flash"` 모임: 정원 여유 있으면 즉시 `status: "confirmed"`로 생성, 정원 초과면 `VALIDATION_ERROR`(`MEETING_FULL`).
- `type: "small"` 모임: `status: "pending"`으로 생성.
- `adultOnly: true` 모임에 미성년 계정이 요청하면 `FORBIDDEN`(`ADULT_ONLY`).

**응답**
```json
{ "data": { "status": "confirmed" } }
```

### PATCH /api/meetings/:id/participants/:userId

**요청**
```json
{ "status": "approved" }
```
`status`는 `approved` 또는 `rejected`만 허용. 모임장 본인이 아니면 `FORBIDDEN`.

---

## 4. 마이페이지

| Method | Path | 설명 | 인증 |
|---|---|---|---|
| GET | `/api/users/me/hosted-meetings` | 내가 등록한 모임 (신청자 수, 대기 중인 승인 건수 포함) | 필요 |
| GET | `/api/users/me/joined-meetings` | 내가 신청/참여한 모임과 상태 | 필요 |

### GET /api/users/me/joined-meetings

**응답**
```json
{
  "data": [
    { "meeting": { "id": 10, "title": "..." }, "status": "pending", "appliedAt": "..." },
    { "meeting": { "id": 7, "title": "..." }, "status": "cancelled", "appliedAt": "..." }
  ]
}
```

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

- **알림 관련 API** — 알림 기능 자체를 두지 않기로 했으므로 (기획서 6.3) 없음.
- **관리자(어드민) API** — 1차는 개발자가 DB에 직접 접근 (기획서 12.1). 신고 목록 조회 API조차 필요 없고, DB 클라이언트로 `reports` 테이블을 직접 봅니다.
- **차단 API** — 2차 개발 범위. 필요해지면 `POST/DELETE /api/users/:id/block` 형태로 추가하면 됩니다.
