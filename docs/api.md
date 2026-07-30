# MentorING API 명세 초안

> 상태: 아래 API 전부 구현 완료 (`server/src/routes`, `server/src/controllers`, `server/src/services` 기준)  
> Base URL: `/api`  
> Content-Type: `application/json`  
> 최종 수정: 2026-07-24

## 1. 기본 규칙

- 프론트엔드는 Supabase DB에 직접 접근하지 않고 Express API만 호출한다.
- API 경로는 복수 명사를 기본으로 사용한다.
- DB 칼럼은 `snake_case`, JSON 요청과 응답 필드는 `camelCase`를 사용한다.
- 인증이 필요한 요청은 Supabase access token을 전송한다.

```http
Authorization: Bearer <access-token>
```

- 로그인 아이디는 사용하지 않으며 이메일과 비밀번호로 인증한다.
- 면담 방식 필드는 사용하지 않는다. 면담 정보는 시간과 장소만 관리한다.
- 상태값은 `pending`, `confirmed`, `completed`, `rejected` 중 하나다.

## 2. 공통 응답 형식

### 성공

```json
{
  "data": {}
}
```

목록 응답:

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

### 실패

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "요청 값을 확인해 주세요.",
    "details": {
      "field": "mentorIds"
    }
  }
}
```

주요 HTTP 상태 코드:

| 상태 | 의미 |
|---:|---|
| `200` | 조회·수정 성공 |
| `201` | 생성 성공 |
| `204` | 응답 본문 없는 성공 |
| `400` | 잘못된 요청 또는 비즈니스 규칙 위반 |
| `401` | 로그인 필요 또는 토큰 만료 |
| `403` | 역할 또는 소유권 권한 없음 |
| `404` | 리소스를 찾을 수 없음 |
| `409` | 중복 생성 또는 이미 처리된 상태 |
| `500` | 서버 내부 오류 |

## 3. 필요한 API 목록

### 인증

| 메서드 | 경로 | 인증 | 설명 |
|---|---|---|---|
| `POST` | `/api/auth/signup/mentee` | 불필요 | 멘티 계정과 프로필 생성 |
| `POST` | `/api/auth/signup/mentor` | 불필요 | 멘토 계정과 프로필 생성 |
| `POST` | `/api/auth/login` | 불필요 | 이메일 로그인 |
| `POST` | `/api/auth/logout` | 필요 | 현재 세션 로그아웃 |
| `GET` | `/api/auth/me` | 필요 | 현재 사용자와 역할 조회 |

이메일·비밀번호 변경은 별도 엔드포인트가 아니라 [프로필 수정](#52-내-멘티-프로필-수정) 요청에 포함해서 처리한다.

### 프로필과 멘토 조회

| 메서드 | 경로 | 역할 | 설명 |
|---|---|---|---|
| `GET` | `/api/mentees/me` | 멘티 | 내 멘티 프로필 조회 |
| `PATCH` | `/api/mentees/me` | 멘티 | 내 멘티 프로필 수정 |
| `PATCH` | `/api/mentees/me/onboarding` | 멘티 | 온보딩 코치마크 열람 완료 처리 |
| `GET` | `/api/mentors` | 멘티 | 멘토 프로필 목록·검색 |
| `GET` | `/api/mentors/me` | 멘토 | 내 멘토 프로필 조회 |
| `PATCH` | `/api/mentors/me` | 멘토 | 내 멘토 프로필 수정 |
| `GET` | `/api/mentors/:mentorId` | 멘티 | 멘토 프로필 상세 조회 |

### 면담 신청과 면담

| 메서드 | 경로 | 역할 | 설명 |
|---|---|---|---|
| `POST` | `/api/applications` | 멘티 | 질문지와 선택 멘토로 신청 생성 |
| `GET` | `/api/applications` | 멘티·멘토 | 현재 사용자의 신청 목록 조회 |
| `PATCH` | `/api/applications/:applicationId/accept` | 대상 멘토 | 신청 수락 |
| `PATCH` | `/api/applications/:applicationId/reject` | 대상 멘토 | 신청 거절 |
| `PATCH` | `/api/applications/:applicationId/complete` | 확정 멘토 | 면담 완료 처리 |
| `PATCH` | `/api/meetings/:meetingId` | 확정 멘토·신청 멘티 | 면담 시간·장소 수정 |
| `GET` | `/api/applications/:applicationId/messages` | 신청 참여자 | 채팅 메시지 목록 조회 |
| `POST` | `/api/applications/:applicationId/messages` | 신청 참여자 | 채팅 메시지 전송 |
| `POST` | `/api/applications/:applicationId/messages/read` | 신청 참여자 | 채팅 메시지 읽음 처리 |

신청 상세 단건 조회 API는 아직 구현되어 있지 않다 (신청 목록 조회 응답에 이미 필요한 정보가 포함되어 있어서).

## 4. 인증 API

### 4.1 멘티 회원가입

`POST /api/auth/signup/mentee`

요청:

```json
{
  "email": "mentee@example.com",
  "password": "example-password",
  "name": "백승주",
  "nickname": "진로탐색중",
  "school": "서울대학교",
  "major": "재료공학",
  "grade": "4",
  "enrollmentStatus": "enrolled"
}
```

검증:

- 이메일 형식과 중복 여부 (중복 시 `409 EMAIL_ALREADY_EXISTS`)
- 비밀번호 최소 8자
- `grade`: `1`, `2`, `3`, `4`, `5+`
- `enrollmentStatus`: `enrolled`, `leave`, `graduated`, `other`
- 위 검증을 통과하지 못하면 `400 VALIDATION_ERROR`를 반환한다.

응답 `201`:

```json
{
  "data": {
    "user": {
      "id": "user-uuid",
      "email": "mentee@example.com",
      "role": "mentee",
      "name": "백승주",
      "nickname": "진로탐색중"
    }
  }
}
```

### 4.2 멘토 회원가입

`POST /api/auth/signup/mentor`

요청:

```json
{
  "email": "mentor@example.com",
  "password": "example-password",
  "name": "김OO",
  "nickname": "나노멘토",
  "school": "KAIST",
  "major": "재료공학",
  "academicStatus": "박사과정",
  "program": "재료공학부 박사과정",
  "lab": "나노소자 연구실",
  "introduction": "전고체 배터리 소재를 연구합니다.",
  "detailedIntroduction": "대학원 진학과 연구 주제 선택 경험을 공유합니다.",
  "researchFields": ["GAA", "FinFET", "차세대반도체"],
  "counselingFields": ["대학원 진학 준비", "연구 활동 관련"],
  "careerHighlights": ["차세대 반도체 소재 공동연구 참여"],
  "internationalActivities": ["MRS 국제학회 포스터 발표"],
  "availableTime": "화요일 19:00, 금요일 15:00"
}
```

검증:

- 이메일 형식과 중복 여부 (중복 시 `409 EMAIL_ALREADY_EXISTS`)
- 비밀번호 최소 8자
- 연구 키워드 3개 이상 8개 이하
- 상담 분야 1개 이상 5개 이하
- 주요 이력 1개 이상 5개 이하
- 해외 활동 1개 이상 5개 이하
- `availableTime` 필수
- `introduction` 최대 120자
- 위 검증을 통과하지 못하면 `400 VALIDATION_ERROR`를 반환한다.

응답 `201`은 멘티 회원가입과 같은 사용자 구조를 반환하며 `role`은 `mentor`다.

### 4.3 로그인

`POST /api/auth/login`

요청:

```json
{
  "email": "mentor@example.com",
  "password": "example-password"
}
```

응답 `200`:

```json
{
  "data": {
    "accessToken": "supabase-access-token",
    "refreshToken": "supabase-refresh-token",
    "expiresIn": 3600,
    "user": {
      "id": "user-uuid",
      "email": "mentor@example.com",
      "role": "mentor",
      "name": "김OO",
      "nickname": "나노멘토"
    }
  }
}
```

이메일이 없거나 비밀번호가 틀리면 `401 INVALID_CREDENTIALS`를 반환한다. 등록되지 않은 이메일도 동일하게 처리해 계정 존재 여부를 노출하지 않는다.

### 4.4 로그아웃

`POST /api/auth/logout`

응답: `204 No Content`

### 4.5 현재 사용자

`GET /api/auth/me`

응답 `200`:

```json
{
  "data": {
    "id": "user-uuid",
    "email": "mentor@example.com",
    "role": "mentor",
    "name": "김OO",
    "nickname": "나노멘토"
  }
}
```

## 5. 프로필 API

### 5.1 내 멘티 프로필 조회

`GET /api/mentees/me`

응답 `200`:

```json
{
  "data": {
    "id": "mentee-uuid",
    "email": "mentee@example.com",
    "name": "백승주",
    "nickname": "진로탐색중",
    "school": "서울대학교",
    "major": "재료공학",
    "grade": "4",
    "enrollmentStatus": "enrolled"
  }
}
```

### 5.2 내 멘티 프로필 수정

`PATCH /api/mentees/me`

수정 가능한 필드:

```json
{
  "name": "백승주",
  "nickname": "대학원준비중",
  "school": "서울대학교",
  "major": "재료공학",
  "grade": "4",
  "enrollmentStatus": "enrolled",
  "email": "new-email@example.com",
  "password": "new-password"
}
```

모든 필드는 선택적으로 전달할 수 있다. `email`/`password`도 이 요청 본문에 함께 넣어 변경한다 (별도의 이메일·비밀번호 전용 엔드포인트는 없다). 이메일 중복 시 `409 EMAIL_ALREADY_EXISTS`, 형식/길이 검증 실패 시 `400 VALIDATION_ERROR`를 반환한다.

### 5.2.1 온보딩 코치마크 열람 완료 처리

`PATCH /api/mentees/me/onboarding`

요청 본문:

```json
{
  "tour": "mentorList"
}
```

`tour`는 `mentorList`(멘토 목록 6스텝 투어) 또는 `questionnaire`(사전 질문지 1스텝 투어) 중 하나여야 한다. 유효하지 않으면 `400 VALIDATION_ERROR`를 반환한다.

응답 `200`:

```json
{
  "data": {
    "mentorListOnboardedAt": "2026-07-30T12:00:00.000Z",
    "questionnaireOnboardedAt": null
  }
}
```

로그인 응답(`POST /api/auth/login`)과 `GET /api/auth/me`의 `user` 객체에도 `mentorListOnboardedAt`, `questionnaireOnboardedAt` 필드가 포함된다(둘 다 아직 완료 전이면 `null`).

### 5.3 멘토 목록 조회

`GET /api/mentors`

Query parameters:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `query` | 아니요 | 이름, 학교, 전공, 연구 분야 통합 검색 |
| `researchField` | 아니요 | 연구 키워드 |
| `counselingField` | 아니요 | 상담 분야 |
| `major` | 아니요 | 전공 |
| `academicStatus` | 아니요 | 학적 |
| `lab` | 아니요 | 연구실 |

예시:

```http
GET /api/mentors?query=AI&counselingField=취업
```

응답 `200`:

```json
{
  "data": [
    {
      "id": "mentor-uuid",
      "name": "이OO",
      "nickname": "AI멘토",
      "school": "KAIST",
      "major": "전산학",
      "academicStatus": "석사과정",
      "program": "전산학부 석사과정",
      "lab": "비전지능 연구실",
      "introduction": "딥러닝 기반 영상 분석을 연구합니다.",
      "researchFields": ["AI", "딥러닝", "컴퓨터비전"],
      "counselingFields": ["대학원 진학 준비", "취업"],
      "availableTime": "월요일 20:00, 목요일 18:30"
    }
  ],
  "meta": {
    "total": 1
  }
}
```

### 5.4 멘토 상세 조회

`GET /api/mentors/:mentorId`

목록 정보에 다음 필드를 추가로 반환한다.

```json
{
  "data": {
    "id": "mentor-uuid",
    "name": "김OO",
    "nickname": "나노멘토",
    "school": "KAIST",
    "major": "재료공학",
    "academicStatus": "박사과정",
    "program": "재료공학부 박사과정",
    "lab": "나노소자 연구실",
    "introduction": "전고체 배터리 소재를 연구합니다.",
    "detailedIntroduction": "대학원 진학과 연구 주제 선택 경험을 공유합니다.",
    "researchFields": ["GAA", "FinFET"],
    "counselingFields": ["대학원 진학 준비"],
    "availableTime": "화요일 19:00, 금요일 15:00",
    "careerHighlights": ["차세대 반도체 소재 공동연구 참여"],
    "internationalActivities": ["MRS 국제학회 포스터 발표"]
  }
}
```

### 5.5 내 멘토 프로필 조회

`GET /api/mentors/me`

응답은 멘토 상세 조회와 같은 프로필 필드를 반환하며 로그인 이메일을 추가로 포함한다.

Express 라우트에서는 `/:mentorId`보다 `/me`를 먼저 선언해야 한다.

### 5.6 내 멘토 프로필 수정

`PATCH /api/mentors/me`

요청 예시:

```json
{
  "nickname": "나노멘토",
  "school": "KAIST",
  "major": "재료공학",
  "academicStatus": "박사과정",
  "program": "재료공학부 박사과정",
  "lab": "나노소자 연구실",
  "introduction": "전고체 배터리 소재를 연구합니다.",
  "detailedIntroduction": "대학원 진학과 연구 주제 선택 경험을 공유합니다.",
  "researchFields": ["GAA", "FinFET"],
  "counselingFields": ["대학원 진학 준비"],
  "careerHighlights": ["차세대 반도체 소재 공동연구 참여"],
  "internationalActivities": ["MRS 국제학회 포스터 발표"],
  "availableTime": "화요일 19:00, 금요일 15:00"
}
```

모든 필드는 선택적으로 전달할 수 있지만 `availableTime`을 빈 값으로 변경할 수는 없다. 멘티 프로필 수정과 마찬가지로 `email`/`password`도 이 요청 본문에 함께 넣어 변경할 수 있다 (5.2절 참고).

## 6. 면담 신청 API

### 6.1 신청 생성

`POST /api/applications`

요청:

```json
{
  "mentorIds": ["mentor-uuid-1", "mentor-uuid-2"],
  "questionnaire": {
    "introduction": "재료공학과 4학년입니다.",
    "concern": "연구실 선택 기준이 고민입니다.",
    "goal": "대학원 준비 순서를 알고 싶습니다.",
    "preferredTime": "화요일 19:00, 목요일 18:30"
  }
}
```

검증:

- `mentorIds`는 중복 없이 1개 이상 3개 이하
- 모든 멘토 ID가 존재해야 함
- 질문지 네 문항 모두 필수
- 생성 작업은 `applications`와 `application_mentors`를 하나의 트랜잭션으로 처리

응답 `201`:

```json
{
  "data": {
    "id": "application-uuid",
    "status": "pending",
    "mentorIds": ["mentor-uuid-1", "mentor-uuid-2"],
    "questionnaire": {
      "introduction": "재료공학과 4학년입니다.",
      "concern": "연구실 선택 기준이 고민입니다.",
      "goal": "대학원 준비 순서를 알고 싶습니다.",
      "preferredTime": "화요일 19:00, 목요일 18:30"
    },
    "createdAt": "2026-07-16T12:00:00+09:00"
  }
}
```

### 6.2 신청 목록 조회

`GET /api/applications`

Query parameters:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `status` | 아니요 | 상태 필터 |

역할별 동작:

- 멘티: 자신이 생성한 신청을 반환한다.
- 멘토: 자신이 `application_mentors`에 포함된 신청을 반환한다.

멘티 응답 예시:

```json
{
  "data": [
    {
      "id": "application-uuid",
      "status": "confirmed",
      "acceptedMentorId": "mentor-uuid",
      "createdAt": "2026-07-08T15:10:00+09:00",
      "updatedAt": "2026-07-08T15:40:00+09:00",
      "mentors": [
        {
          "id": "mentor-uuid",
          "name": "박OO",
          "school": "POSTECH",
          "major": "생명과학",
          "academicStatus": "석박통합과정"
        }
      ],
      "questionnaire": {
        "introduction": "생명과학과 3학년입니다.",
        "concern": "융합 연구 준비가 고민입니다.",
        "goal": "필요한 역량을 알고 싶습니다.",
        "preferredTime": "수요일 17:00"
      },
      "meeting": {
        "id": "meeting-uuid",
        "scheduledAt": "2026-07-22T17:00:00+09:00",
        "place": "Google Meet · 링크는 면담 전 공개"
      },
      "unreadMessageCount": 3
    }
  ],
  "meta": {
    "total": 1
  }
}
```

`unreadMessageCount`는 로그인 사용자 기준으로, 본인이 보내지 않았고 마지막으로 읽은 시점(`message_read_states.last_read_at`) 이후에 온 메시지 수다(DB 함수 `get_unread_message_counts`, `supabase/migrations/20260725000000_create_message_read_states.sql`). 한 번도 읽지 않은 채팅방은 전체 메시지 수가 그대로 나온다. 신청 목록이 비어 있으면 이 계산을 위한 RPC 호출 자체를 하지 않는다.

멘토 응답은 멘티 응답과 필드 구성이 다르다. 상태를 `applicationStatus`(신청 전체 상태)와 `mentorStatus`(이 멘토 자신의 응답 상태)로 나눠서 주고, `mentors` 배열 대신 신청한 멘티 정보를 `mentee` 객체 하나로 준다.

```json
{
  "data": [
    {
      "id": "application-uuid",
      "applicationStatus": "pending",
      "mentorStatus": "pending",
      "acceptedMentorId": null,
      "mentee": {
        "id": "mentee-uuid",
        "name": "백승주",
        "school": "서울대학교",
        "major": "재료공학",
        "grade": "4",
        "enrollmentStatus": "enrolled"
      },
      "questionnaire": {
        "introduction": "재료공학과 4학년입니다.",
        "concern": "연구실 선택 기준이 고민입니다.",
        "goal": "대학원 준비 순서를 알고 싶습니다.",
        "preferredTime": "화요일 19:00, 목요일 18:30"
      },
      "createdAt": "2026-07-16T12:00:00+09:00",
      "updatedAt": "2026-07-16T12:00:00+09:00",
      "unreadMessageCount": 0
    }
  ],
  "meta": {
    "total": 1
  }
}
```

`meeting` 필드는 `applicationStatus`가 `confirmed` 또는 `completed`일 때만 포함된다 (멘티 응답과 동일). `unreadMessageCount`의 계산 기준도 멘티 응답과 같다 (6.2절 상단 참고).

### 6.3 신청 수락

`PATCH /api/applications/:applicationId/accept`

요청 본문 없음.

처리 규칙:

- 현재 로그인 멘토가 신청 대상이어야 한다.
- 신청 전체 상태와 해당 멘토 상태가 `pending`이어야 한다.
- 수락과 동시에 `meetings` 행을 생성한다. `scheduled_at`, `place`는 비어 있는 상태로 시작하며, 이후 프론트엔드에서 [7.1 면담 정보 수정](#71-면담-정보-수정)으로 채운다.

> **알려진 제한사항**: 신청/멘토 상태 확인과 이후 갱신이 하나의 트랜잭션이나 락으로 묶여 있지 않다 (상태를 먼저 읽고 별도로 update하는 방식). 두 멘토가 같은 신청을 동시에 수락하면 둘 다 상태 검사를 통과할 수 있고, `meetings.application_id`의 DB unique 제약 때문에 그중 한쪽만 `500`을 받는 식으로 우연히 걸러진다 — 의도적으로 설계된 동시성 제어가 아니다.

응답 `200`:

```json
{
  "data": {
    "id": "application-uuid",
    "status": "confirmed",
    "acceptedMentorId": "mentor-uuid",
    "updatedAt": "2026-07-16T13:00:00+09:00"
  }
}
```

이미 다른 멘토가 수락한 경우 `409 APPLICATION_ALREADY_CONFIRMED`를 반환한다.

### 6.4 신청 거절

`PATCH /api/applications/:applicationId/reject`

요청 본문 없음.

처리 규칙:

- 로그인 멘토 자신의 연결 상태만 `rejected`로 변경한다.
- 모든 대상 멘토가 거절하면 신청 전체 상태도 `rejected`가 된다.

응답 `200`:

```json
{
  "data": {
    "id": "application-uuid",
    "applicationStatus": "pending",
    "mentorStatus": "rejected",
    "respondedAt": "2026-07-16T13:10:00+09:00"
  }
}
```

## 7. 면담 API

`meetings` 행은 별도의 생성 API 없이, [6.3 신청 수락](#63-신청-수락) 시점에 `scheduled_at`, `place`가 빈 값인 상태로 자동 생성된다. 프론트엔드는 아래 수정 API로 값을 채우거나 변경한다.

### 7.1 면담 정보 수정

`PATCH /api/meetings/:meetingId`

요청:

```json
{
  "scheduledAt": "2026-07-23T18:00:00+09:00",
  "place": "교내 라운지"
}
```

검증:

- 로그인 사용자가 해당 신청의 `acceptedMentorId` 또는 신청을 생성한 멘티와 같아야 한다(확정 멘토와 신청 멘티만 수정 가능).
- `scheduledAt`, `place`는 각각 선택적으로 전달할 수 있으며, 전달한 필드만 갱신한다.
- `method` 필드는 받지 않는다.

응답 `200`:

```json
{
  "data": {
    "id": "meeting-uuid",
    "applicationId": "application-uuid",
    "mentorId": "mentor-uuid",
    "scheduledAt": "2026-07-23T18:00:00+09:00",
    "place": "교내 라운지",
    "updatedAt": "2026-07-16T13:20:00+09:00"
  }
}
```

### 7.2 면담 완료 처리

`PATCH /api/applications/:applicationId/complete`

요청 본문 없음.

처리 규칙:

- 신청 상태가 `confirmed`여야 한다 (`pending`/`rejected`면 `409 APPLICATION_NOT_CONFIRMED`, 이미 `completed`면 `409 APPLICATION_ALREADY_COMPLETED`).
- 현재 로그인 사용자가 그 신청의 확정 멘토(`acceptedMentorId`)여야 한다 (아니면 `403 FORBIDDEN`).
- `applications.status`와 확정 멘토의 `application_mentors.status`를 `completed`로, `meetings.completed_at`을 현재 시각으로 갱신한다.

응답 `200`:

```json
{
  "data": {
    "id": "application-uuid",
    "status": "completed",
    "acceptedMentorId": "mentor-uuid",
    "updatedAt": "2026-07-23T19:00:00+09:00"
  }
}
```

## 8. 채팅 API

확정(`confirmed`)된 신청의 멘티와 확정 멘토만 메시지를 주고받을 수 있다. 실시간 반영은 프론트엔드가 Supabase Realtime(`postgres_changes`)을 직접 구독해서 처리하고, 아래 두 API는 초기 로딩·과거 메시지 페이지네이션·전송을 담당한다. 참여자·상태 검증은 애플리케이션 계층과 DB의 Row Level Security 양쪽에서 이중으로 적용된다(`supabase/migrations/20260724000000_create_messages_table.sql`).

### 8.1 메시지 목록 조회

`GET /api/applications/:applicationId/messages`

Query parameters:

| 이름 | 필수 | 설명 |
|---|---:|---|
| `limit` | 아니요 | 페이지당 개수 (기본 50, 최대 100) |
| `cursor` | 아니요 | 이전 응답의 `meta.nextCursor` 값. 그 시점보다 이전 메시지를 가져온다 |

- 신청 참여자(신청 멘티 또는 확정 멘토)가 아니면 `403 FORBIDDEN`.
- 존재하지 않는 신청 id면 `404 APPLICATION_NOT_FOUND`.
- `cursor` 없이 호출하면 가장 최근 메시지부터 `limit`개를 반환한다. 응답의 `data`는 항상 시간 오름차순(오래된 → 최신)이다.

요청 예시:

```bash
curl "http://localhost:4000/api/applications/$APPLICATION_ID/messages?limit=50" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

응답 `200`:

```json
{
  "data": [
    {
      "id": "message-uuid",
      "applicationId": "application-uuid",
      "senderId": "mentee-uuid",
      "senderName": "백승주",
      "body": "안녕하세요, 잘 부탁드립니다.",
      "createdAt": "2026-07-24T02:37:27.471Z"
    }
  ],
  "meta": {
    "hasMore": true,
    "nextCursor": "eyJjcmVhdGVkQXQiOiIyMDI2LTA3LTI0VDAyOjI2OjU4LjY4MVoiLCJpZCI6IjIwY2EwODA5In0="
  }
}
```

과거 메시지를 이어서 불러올 때는 `nextCursor`를 그대로 `cursor`에 넣어 다시 호출한다:

```bash
curl -G "http://localhost:4000/api/applications/$APPLICATION_ID/messages" \
  --data-urlencode "limit=50" \
  --data-urlencode "cursor=$NEXT_CURSOR" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

`meta.hasMore`가 `false`이거나 `meta.nextCursor`가 `null`이면 더 이전 메시지가 없다는 뜻이다.

### 8.2 메시지 전송

`POST /api/applications/:applicationId/messages`

요청:

```json
{
  "body": "안녕하세요, 잘 부탁드립니다."
}
```

검증:

- 신청 참여자가 아니면 `403 FORBIDDEN`.
- 신청 상태가 `confirmed`가 아니면 `409 APPLICATION_NOT_CONFIRMED`.
- `body`가 비어 있거나 공백만 있으면 `400 VALIDATION_ERROR` (`details.field: "body"`). 2000자를 넘어도 동일하게 `400`.
- 존재하지 않는 신청 id면 `404 APPLICATION_NOT_FOUND`.

요청 예시:

```bash
curl -X POST "http://localhost:4000/api/applications/$APPLICATION_ID/messages" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body": "안녕하세요, 잘 부탁드립니다."}'
```

응답 `201`:

```json
{
  "data": {
    "id": "message-uuid",
    "applicationId": "application-uuid",
    "senderId": "mentee-uuid",
    "senderName": "백승주",
    "body": "안녕하세요, 잘 부탁드립니다.",
    "createdAt": "2026-07-24T02:37:27.471Z"
  }
}
```

`senderName`은 `nickname`이 아니라 `profiles.name`이다.

### 8.3 메시지 읽음 처리

`POST /api/applications/:applicationId/messages/read`

호출한 사용자의 이 신청(채팅방)에 대한 마지막 읽음 시각(`message_read_states.last_read_at`)을 현재 시각으로 갱신한다. `GET /api/applications` 응답의 `unreadMessageCount`는 이 값을 기준으로 계산된다.

검증:

- 신청 참여자(신청 멘티 또는 확정 멘토)가 아니면 `403 FORBIDDEN`.
- 존재하지 않는 신청 id면 `404 APPLICATION_NOT_FOUND`.

요청 예시:

```bash
curl -X POST "http://localhost:4000/api/applications/$APPLICATION_ID/messages/read" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

응답 `200`:

```json
{
  "data": {
    "applicationId": "application-uuid",
    "lastReadAt": "2026-07-25T05:00:00.000Z"
  }
}
```

## 9. 권한 요약

| 작업 | 멘티 | 멘토 |
|---|---:|---:|
| 멘토 목록·상세 조회 | 가능 | 필요 시 가능 |
| 내 멘티 프로필 조회·수정 | 가능 | 불가 |
| 내 멘토 프로필 조회·수정 | 불가 | 가능 |
| 신청 생성 | 가능 | 불가 |
| 자신의 신청 조회 | 가능 | 대상 신청만 가능 |
| 신청 수락·거절 | 불가 | 대상 멘토만 가능 |
| 신청 완료 처리 | 불가 | 확정 멘토만 가능 |
| 면담 정보 수정 | 자신의 신청만 가능 | 확정 멘토만 가능 |
| 채팅 메시지 조회·전송·읽음 처리 | 참여자(신청 멘티)만 가능 | 참여자(확정 멘토)만 가능 |

## 10. MVP 이후 API

다음 API는 현재 초안에서 제외한다.

- 찜한 멘토 생성·삭제·조회
- 리뷰 작성·조회
- 포인트 적립·사용 내역
- 포인트 상품과 상품권 신청
- 노쇼 신고와 이용 제한
- 이메일 알림 발송·재시도 내역
