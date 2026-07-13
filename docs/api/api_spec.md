# API Specification

## 1. 목적

프론트엔드와 백엔드가 같은 API 경로와 요청·응답 형식을 사용하기 위한 기준 문서이다.

현재 우선 범위는 다음 핵심 흐름이다.

```text
Google 로그인
→ 레시피 목록
→ 레시피 추가
→ AI 구조화
→ AI 결과 수정
→ 레시피 저장
→ 레시피 상세 조회
```

개인 메모는 이번 계약에 포함한다. 공유 API 계약은 확정했지만 현재 핵심 흐름 구현 이후로 미루며, 조리 팁은 후속 범위로 둔다.

---

## 2. 공통 규칙

### Base URL

```text
/api
```

### 인증과 세션

- MVP 인증은 Google Identity Services 기반 Google 로그인만 지원한다.
- Google 로그인 성공 후 Express가 서버 세션을 생성하고 브라우저에는 의미 없는 세션 ID만 쿠키로 전달한다.
- 세션 쿠키는 운영 환경에서 `__Host-recipebook.sid` 이름과 `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` 속성을 사용하며 `Domain` 속성을 설정하지 않는다.
- 인증 토큰과 세션 ID를 `localStorage`, `sessionStorage`, 애플리케이션 로그에 저장하지 않는다.
- 세션은 마지막 활동 후 24시간이 지나면 만료되고, 계속 활동하더라도 로그인 후 7일이 지나면 만료된다.
- 로그인 성공 시 세션 ID를 새로 발급해 세션 고정 공격을 방지한다.
- 세션 ID는 암호학적으로 안전한 난수로 생성하며 사용자 정보나 권한을 포함하지 않는다.
- 인증되지 않았거나 만료된 세션은 `401 UNAUTHORIZED`를 반환한다.
- 메모리 세션 저장소는 로컬 개발에서만 사용하며 운영 환경에서는 PostgreSQL `sessions` 테이블을 사용한다.

서버 세션을 선택한 이유는 다음과 같다.

- 현재 서비스는 React 웹과 Express API로 구성된 단일 웹 서비스이므로 JWT 기반 분산 인증이 필요하지 않다.
- 탈취가 의심되는 세션을 서버에서 즉시 폐기할 수 있다.
- 사용자의 모든 세션을 한 번에 폐기하는 기능을 단순하게 구현할 수 있다.
- JWT의 refresh token, 토큰 회전, 폐기 목록을 별도로 운영하지 않아도 되어 3주 MVP에 적합하다.

### CSRF 방어

- `POST /api/auth/google`을 제외한 인증된 상태 변경 요청은 세션에 연결된 CSRF 토큰이 필요하다.
- 프론트엔드는 `GET /api/auth/csrf-token`으로 토큰을 받은 뒤 `X-CSRF-Token` 헤더에 담는다.
- 서버는 토큰 누락 또는 불일치 요청을 `403 CSRF_TOKEN_INVALID`로 거부한다.
- 상태를 변경하는 동작은 `GET` 요청으로 구현하지 않는다.
- `POST /api/auth/google`은 아직 서비스 세션이 없으므로 CSRF 토큰 대신 Google credential 검증과 허용된 `Origin` 검사를 수행한다.

### 성공 응답

```json
{
  "data": {}
}
```

### 오류 응답

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "오류 메시지"
  }
}
```

필드 검증 오류가 있는 경우:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "details": [
      {
        "field": "title",
        "message": "제목은 필수입니다."
      }
    ]
  }
}
```

---

## 3. Health Check

### `GET /api/health`

서버 실행 상태를 확인한다.

#### 인증

불필요

#### 성공 응답

```json
{
  "data": {
    "message": "Recipebook API is running"
  }
}
```

---

## 4. 인증

### `POST /api/auth/google`

Google Identity Services가 발급한 ID token credential을 검증하고 서비스 세션을 생성한다. 처음 로그인한 Google 사용자는 서비스 사용자로 함께 생성한다.

#### 인증

불필요

#### 요청

```json
{
  "credential": "google-id-token"
}
```

#### 처리 규칙

- 서버에서 Google ID token의 서명, issuer, audience, 만료 시간을 검증한다.
- Google 사용자의 변경되지 않는 `sub` 값을 외부 사용자 식별자로 사용한다.
- 이메일은 사용자 표시와 연락 정보로만 사용하고 외부 사용자 식별자로 사용하지 않는다.
- 로그인 성공 시 기존 요청의 세션 ID를 재사용하지 않고 새 세션을 생성한다.

#### 성공 응답

```json
{
  "data": {
    "user": {
      "id": "user-id",
      "email": "user@example.com",
      "name": "사용자",
      "profileImageUrl": null
    }
  }
}
```

#### 오류

- `VALIDATION_ERROR`
- `GOOGLE_CREDENTIAL_INVALID`
- `ORIGIN_NOT_ALLOWED`

---

### `GET /api/auth/me`

현재 로그인한 사용자 정보를 조회한다.

#### 인증

필요

#### 성공 응답

```json
{
  "data": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "사용자",
    "profileImageUrl": null
  }
}
```

#### 오류

- `UNAUTHORIZED`

---

### `GET /api/auth/csrf-token`

현재 세션에 연결된 CSRF 토큰을 조회한다.

#### 인증

필요

#### 성공 응답

```json
{
  "data": {
    "csrfToken": "csrf-token"
  }
}
```

#### 오류

- `UNAUTHORIZED`

---

### `POST /api/auth/logout`

현재 세션을 폐기한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 성공 응답

```json
{
  "data": {
    "message": "로그아웃되었습니다."
  }
}
```

---

### `POST /api/auth/logout-all`

현재 사용자의 모든 세션을 폐기한다. 세션 탈취가 의심될 때 계정 보안 화면에서 사용한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 성공 응답

현재 요청의 세션을 포함한 모든 세션을 폐기하므로 응답 후 다시 로그인해야 한다.

```json
{
  "data": {
    "message": "모든 기기에서 로그아웃되었습니다."
  }
}
```

---

## 5. 레시피 목록

### `GET /api/recipes`

현재 사용자의 레시피 목록을 조회한다. 휴지통으로 이동한 레시피는 반환하지 않는다.

#### 인증

필요

#### 성공 응답

```json
{
  "data": [
    {
      "id": "recipe-id",
      "type": "EXTERNAL",
      "title": "김치찌개",
      "description": "돼지고기를 넣은 김치찌개",
      "source": {
        "url": "https://example.com/recipe",
        "title": "김치찌개 만들기",
        "author": "작성자"
      },
      "receivedInfo": null,
      "createdAt": "2026-07-13T12:30:00.000Z"
    }
  ]
}
```

#### 정렬

최신 생성 순

#### 오류

- `UNAUTHORIZED`

---

## 6. 레시피 상세

### `GET /api/recipes/:recipeId`

현재 사용자가 소유한 특정 레시피의 상세 정보를 조회한다. 휴지통으로 이동한 레시피는 일반 상세 API에서 조회할 수 없다.

#### 인증

필요

#### 경로 변수

| 이름 | 타입 | 설명 |
|---|---|---|
| `recipeId` | string | 조회할 레시피 ID |

#### 성공 응답

```json
{
  "data": {
    "id": "recipe-id",
    "ownerId": "user-id",
    "type": "OWNED",
    "title": "김치찌개",
    "description": "돼지고기를 넣은 김치찌개",
    "servings": "2인분",
    "cookingTimeMinutes": 30,
    "ingredients": [
      {
        "name": "김치",
        "amount": "200",
        "unit": "g",
        "order": 1
      }
    ],
    "steps": [
      {
        "order": 1,
        "description": "김치를 볶는다."
      }
    ],
    "source": null,
    "memo": "다음에는 두부를 더 넣기",
    "receivedInfo": null,
    "createdAt": "2026-07-13T12:30:00.000Z",
    "updatedAt": "2026-07-13T12:30:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `RECIPE_NOT_FOUND`

다른 사용자의 레시피 ID를 요청한 경우에도 존재 여부를 노출하지 않도록 `RECIPE_NOT_FOUND`를 반환한다.

---

## 7. AI 레시피 구조화

### `POST /api/ai/recipes/structure`

URL 또는 직접 입력 내용을 AI가 레시피 초안으로 정리한다. 결과는 데이터베이스에 자동 저장하지 않는다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 요청

```json
{
  "sourceUrl": "https://example.com/recipe",
  "rawText": "설탕은 조금 적게 넣어 주세요."
}
```

#### 요청 규칙

- `sourceUrl`, `rawText` 중 하나 이상 필요하다.
- 두 값이 모두 있으면 URL 내용을 기반으로 하고 `rawText`를 사용자의 보완 정보로 함께 참고한다.
- `sourceUrl`은 `http` 또는 `https` 형식만 허용한다.
- localhost, loopback 주소, link-local 주소, 사설 IP 및 내부 네트워크 대상 접근을 차단한다.
- redirect가 발생하면 각 목적지를 같은 규칙으로 다시 검증한다.
- 외부 요청에 timeout과 redirect 횟수 제한을 적용한다.
- 외부 응답 크기와 AI에 전달하는 추출 본문 길이를 제한한다.
- HTML 전체를 AI에 그대로 전달하지 않고 레시피 관련 텍스트만 추출한다.

구체적인 timeout, redirect 횟수, 응답 크기와 본문 길이는 URL 수집 구현 시 환경 설정으로 확정하고 README에 기록한다.

#### 성공 응답

```json
{
  "data": {
    "draft": {
      "title": "김치찌개",
      "description": "돼지고기를 넣은 김치찌개",
      "servings": "2인분",
      "cookingTimeMinutes": 30,
      "ingredients": [
        {
          "name": "김치",
          "amount": "약 2컵",
          "unit": null,
          "order": 1
        }
      ],
      "steps": [
        {
          "order": 1,
          "description": "김치를 볶는다."
        }
      ],
      "source": {
        "url": "https://example.com/recipe",
        "title": "김치찌개 만들기",
        "author": "작성자"
      }
    },
    "warnings": [
      {
        "field": "ingredients[0].amount",
        "message": "원문의 '적당히'를 약 2컵으로 정리했습니다.",
        "suggestedValue": "약 2컵"
      }
    ]
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `VALIDATION_ERROR`
- `INVALID_URL`
- `URL_NOT_ALLOWED`
- `URL_FETCH_FAILED`
- `AI_REQUEST_FAILED`
- `AI_RESPONSE_INVALID`

URL 수집에 실패하면 사용자가 직접 입력으로 계속 진행할 수 있는 메시지를 반환한다.

---

## 8. 레시피 저장

### `POST /api/recipes`

사용자가 수정한 레시피 초안을 저장한다. 클라이언트는 `ownerId`와 `type`을 보내지 않는다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 요청

```json
{
  "title": "김치찌개",
  "description": "돼지고기를 넣은 김치찌개",
  "servings": "2인분",
  "cookingTimeMinutes": 30,
  "ingredients": [
    {
      "name": "김치",
      "amount": "200",
      "unit": "g",
      "order": 1
    }
  ],
  "steps": [
    {
      "order": 1,
      "description": "김치를 볶는다."
    }
  ],
  "source": null,
  "memo": null
}
```

#### 요청 규칙

- 공백을 제거한 `title`은 비어 있을 수 없다.
- `ingredients`, `steps`는 배열이며 빈 항목은 저장 전에 제거한다.
- `ownerId`는 로그인 사용자 기준으로 서버가 설정한다.
- `source`가 `null`이면 서버가 `type`을 `OWNED`로 설정한다.
- 유효한 `source`가 있으면 서버가 `type`을 `EXTERNAL`로 설정한다.
- 클라이언트는 일반 저장 API로 `RECEIVED` 레시피를 만들 수 없다.
- `source`가 있으면 URL은 AI 구조화 요청과 같은 URL 안전성 검증을 통과해야 한다.
- AI 응답을 그대로 신뢰하지 않고 전체 요청을 다시 검증한다.

#### 성공 응답

```json
{
  "data": {
    "id": "recipe-id",
    "type": "OWNED"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `VALIDATION_ERROR`
- `INVALID_URL`
- `URL_NOT_ALLOWED`

---

## 9. 개인 메모

### `PATCH /api/recipes/:recipeId/memo`

현재 사용자가 소유한 레시피의 개인 메모를 저장하거나 수정한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 요청

```json
{
  "memo": "다음에는 두부를 더 넣기"
}
```

#### 요청 규칙

- `memo`는 문자열 또는 `null`이다.
- 빈 문자열과 공백만 있는 문자열은 `null`로 저장한다.
- 메모는 AI 초안과 다른 사용자에게 노출하지 않는다.

#### 성공 응답

```json
{
  "data": {
    "memo": "다음에는 두부를 더 넣기",
    "updatedAt": "2026-07-13T13:00:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `VALIDATION_ERROR`
- `RECIPE_NOT_FOUND`

---

## 10. 공유

### 공통 공유 규칙

- `OWNED`는 열람 공유와 전달 공유를 할 수 있다.
- `EXTERNAL`은 출처를 포함한 열람 공유만 할 수 있다.
- `RECEIVED`는 열람 공유와 전달 공유를 모두 할 수 없다.
- 공유 응답에는 개인 메모, 소유자 ID, Google 식별자, 세션 정보와 삭제 시각을 포함하지 않는다.
- 전체 URL 대신 프론트엔드에서 현재 origin과 결합할 상대 경로를 반환한다.
- QR은 별도 API나 데이터가 아니라 `window.location.origin + transferPath`로 만든 전달 링크를 인코딩한다.
- 공유 토큰이 포함된 요청 경로와 초대 코드는 접근 로그와 애플리케이션 로그에서 마스킹한다.

### `POST /api/recipes/:recipeId/view-shares`

현재 사용자의 레시피에 비로그인 열람 링크를 생성한다. 활성 링크가 있어도 새 토큰으로 교체하며 이전 링크는 즉시 사용할 수 없게 한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 성공 응답

원문 토큰은 이 응답의 `sharePath`에서 한 번만 제공한다.

```json
{
  "data": {
    "sharePath": "/shared/recipes/view-token",
    "createdAt": "2026-07-13T14:00:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `RECIPE_NOT_FOUND`
- `RECIPE_NOT_SHAREABLE`

---

### `DELETE /api/recipes/:recipeId/view-shares`

현재 열람 링크를 비활성화한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 성공 응답

```json
{
  "data": {
    "revokedAt": "2026-07-13T14:10:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `RECIPE_NOT_FOUND`
- `VIEW_SHARE_NOT_FOUND`

---

### `GET /api/view-shares/:token`

유효한 열람 링크로 레시피를 조회한다. 로그인 여부와 관계없이 호출할 수 있다.

#### 인증

불필요

#### 성공 응답

```json
{
  "data": {
    "title": "김치찌개",
    "description": "돼지고기를 넣은 김치찌개",
    "servings": "2인분",
    "cookingTimeMinutes": 30,
    "ingredients": [
      {
        "name": "김치",
        "amount": "200",
        "unit": "g",
        "order": 1
      }
    ],
    "steps": [
      {
        "order": 1,
        "description": "김치를 볶는다."
      }
    ],
    "source": null
  }
}
```

#### 처리 규칙

- 열람자는 레시피를 저장, 수정, 삭제하거나 메모를 작성하고 재공유할 수 없다.
- 링크가 비활성화됐거나 원본 Recipe가 soft delete된 경우 내용을 반환하지 않는다.
- 원본의 개인 메모는 응답에 포함하지 않는다.

#### 오류

- `VIEW_SHARE_NOT_FOUND`
- `VIEW_SHARE_INACTIVE`

---

### `POST /api/recipes/:recipeId/transfer-invitations`

`OWNED` 레시피의 현재 내용을 스냅샷으로 저장하고 한 번만 사용할 수 있는 전달 초대를 생성한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 성공 응답

원문 링크 토큰과 초대 코드는 이 응답에서 한 번만 제공한다.

```json
{
  "data": {
    "invitationId": "invitation-id",
    "transferPath": "/transfer-invitations/link-token",
    "invitationCode": "ABCD-1234",
    "createdAt": "2026-07-13T14:00:00.000Z",
    "expiresAt": "2026-07-20T14:00:00.000Z"
  }
}
```

#### 처리 규칙

- 스냅샷에는 레시피 본문, 출처와 원 저장자 표시 정보를 포함한다.
- 현 MVP에서는 초대를 생성하는 원 저장자가 시스템상 전달자이므로, 미리보기에는 중복된 전달자 객체 대신 `originalOwner`만 반환한다.
- 개인 메모는 스냅샷에 포함하지 않는다.
- 초대는 생성 후 7일에 만료한다.
- 링크 토큰은 SHA-256, 초대 코드는 서버 비밀값을 사용한 HMAC-SHA-256 해시로 저장한다.
- 원문 링크 토큰과 초대 코드를 애플리케이션 로그에 남기지 않는다.

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `RECIPE_NOT_FOUND`
- `RECIPE_NOT_SHAREABLE`

---

### `GET /api/transfer-invitations/by-link/:linkToken`

전달 링크의 유효성을 확인하고 저장 전 미리보기를 반환한다.

#### 인증

필요

비로그인 사용자는 프론트엔드가 로그인 화면으로 이동시키고 로그인 성공 후 기존 `transferPath`로 복귀한다.

#### 성공 응답

```json
{
  "data": {
    "invitationId": "invitation-id",
    "recipe": {
      "title": "김치찌개",
      "description": "돼지고기를 넣은 김치찌개",
      "servings": "2인분",
      "cookingTimeMinutes": 30,
      "ingredients": [],
      "steps": [],
      "source": null
    },
    "originalOwner": {
      "name": "사용자",
      "profileImageUrl": null
    },
    "expiresAt": "2026-07-20T14:00:00.000Z",
    "canReshare": false
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `TRANSFER_INVITATION_NOT_FOUND`
- `TRANSFER_INVITATION_USED`
- `TRANSFER_INVITATION_EXPIRED`

---

### `POST /api/transfer-invitations/by-code`

초대 코드를 요청 본문으로 받아 같은 전달 미리보기 계약을 반환한다. 조회 동작이므로 세션 인증은 필요하지만 CSRF 토큰은 요구하지 않는다.

#### 인증

필요

#### 요청

```json
{
  "invitationCode": "ABCD-1234"
}
```

#### 요청 규칙

- 공백을 제거한 초대 코드는 비어 있을 수 없다.
- 초대 코드는 대문자로 변환하고 공백과 구분용 하이픈을 제거한 뒤 검증한다.
- 코드를 URL, Query Parameter와 애플리케이션 로그에 남기지 않는다.

#### 성공 응답

`GET /api/transfer-invitations/by-link/:linkToken`과 같은 `TransferInvitationPreview`를 반환한다.

#### 오류

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `TRANSFER_INVITATION_NOT_FOUND`
- `TRANSFER_INVITATION_USED`
- `TRANSFER_INVITATION_EXPIRED`

---

### `POST /api/transfer-invitations/:invitationId/accept`

전달 초대를 수락하고 현재 사용자의 레시피북에 `RECEIVED` 레시피로 저장한다.

#### 인증

필요

#### 헤더

```text
X-CSRF-Token: csrf-token
```

#### 요청

```json
{
  "senderDisplayName": "엄마",
  "relationshipLabel": "엄마의 레시피",
  "memo": "주말에 만들어 보기"
}
```

#### 요청 규칙

- 공백을 제거한 `senderDisplayName`과 `relationshipLabel`은 비어 있을 수 없다.
- 빈 문자열 또는 공백만 있는 `memo`는 `null`로 저장한다.
- 전송자는 자신의 초대를 수락할 수 없다.
- 수락자는 `senderDisplayName`에 자신이 기억하고 싶은 전해준 사람 이름을 입력한다. 시스템상 전달자는 원 저장자와 같다.
- 초대 수락, Recipe와 하위 데이터 복사, 관계 정보 저장과 초대 사용 완료를 한 트랜잭션으로 처리한다.
- 동시에 수락한 요청은 하나만 성공하며 이후 요청은 `TRANSFER_INVITATION_USED`를 반환한다.
- 생성된 레시피는 원본 내용을 수정하거나 열람·전달 공유할 수 없고 개인 메모만 수정할 수 있다.

#### 성공 응답

```json
{
  "data": {
    "recipeId": "received-recipe-id",
    "type": "RECEIVED"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `CSRF_TOKEN_INVALID`
- `VALIDATION_ERROR`
- `TRANSFER_INVITATION_NOT_FOUND`
- `TRANSFER_INVITATION_USED`
- `TRANSFER_INVITATION_EXPIRED`
- `TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED`

거절은 서버 상태를 변경하거나 초대를 만료시키지 않으므로 별도 API를 제공하지 않는다.

---

## 11. 삭제 및 복원 정책

삭제와 복원 API의 구현은 현재 핵심 흐름 이후로 미루지만 다음 정책은 확정한다.

- 레시피 삭제는 레코드를 즉시 제거하지 않고 `deletedAt`을 기록하는 soft delete로 처리한다.
- 삭제된 레시피는 일반 목록과 상세 조회에서 제외하고 휴지통에서만 조회한다.
- 휴지통에서는 삭제 시각과 남은 보관 기간을 표시하고 복원할 수 있다.
- 삭제 직후 UI에서 실행 취소를 제공한다.
- 휴지통 보관 기간은 30일이다.
- MVP에서는 사용자가 직접 실행하는 영구 삭제와 휴지통 비우기를 제공하지 않는다.
- 30일이 지나면 서버 작업이 영구 삭제 대상으로 처리한다.
- 삭제와 복원 시 사용자 ID, 레시피 ID, 행위, 처리 시각을 감사 기록에 남긴다.
- 감사 기록에는 세션 ID, Google credential, 개인정보가 포함된 레시피 본문을 남기지 않는다.

후속 API는 리소스 중심 경로를 사용한다.

```text
DELETE /api/recipes/:recipeId
GET    /api/recipes/trash
POST   /api/recipes/:recipeId/restore
```

라우터에서는 `GET /api/recipes/trash`를 `GET /api/recipes/:recipeId`보다 먼저 등록해 `trash`가 레시피 ID로 처리되지 않도록 한다.

---

## 12. 주요 오류 코드

| 코드 | HTTP 상태 | 의미 |
|---|---:|---|
| `UNAUTHORIZED` | 401 | 로그인 필요 또는 세션 만료 |
| `FORBIDDEN` | 403 | 접근 권한 없음 |
| `CSRF_TOKEN_INVALID` | 403 | CSRF 토큰 누락 또는 불일치 |
| `ORIGIN_NOT_ALLOWED` | 403 | 허용되지 않은 출처의 로그인 요청 |
| `VALIDATION_ERROR` | 400 | 요청값 오류 |
| `GOOGLE_CREDENTIAL_INVALID` | 401 | Google credential 검증 실패 |
| `RECIPE_NOT_FOUND` | 404 | 레시피 없음 또는 조회할 수 없음 |
| `INVALID_URL` | 400 | URL 형식 오류 |
| `URL_NOT_ALLOWED` | 400 | 접근이 차단된 URL |
| `URL_FETCH_FAILED` | 422 | URL 내용 조회 실패 |
| `AI_REQUEST_FAILED` | 502 | AI 제공자 요청 실패 |
| `AI_RESPONSE_INVALID` | 502 | AI 응답 형식 또는 검증 오류 |
| `RECIPE_NOT_SHAREABLE` | 403 | 레시피 유형 또는 소유권 정책상 공유할 수 없음 |
| `VIEW_SHARE_NOT_FOUND` | 404 | 열람 공유 링크가 존재하지 않음 |
| `VIEW_SHARE_INACTIVE` | 410 | 열람 링크가 비활성화됐거나 원본을 열람할 수 없음 |
| `TRANSFER_INVITATION_NOT_FOUND` | 404 | 전달 링크 또는 초대 코드가 유효하지 않음 |
| `TRANSFER_INVITATION_USED` | 409 | 이미 수락 완료된 전달 초대 |
| `TRANSFER_INVITATION_EXPIRED` | 410 | 생성 후 7일이 지나 만료된 전달 초대 |
| `TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED` | 403 | 전달자가 자신의 초대를 수락함 |
| `INTERNAL_SERVER_ERROR` | 500 | 서버 내부 오류 |

---

## 13. 현재 구현 범위

다음 API를 우선 구현한다.

1. `GET /api/health`
2. `POST /api/auth/google`
3. `GET /api/auth/me`
4. `GET /api/auth/csrf-token`
5. `POST /api/auth/logout`
6. `POST /api/auth/logout-all`
7. `GET /api/recipes`
8. `GET /api/recipes/:recipeId`
9. `POST /api/ai/recipes/structure`
10. `POST /api/recipes`
11. `PATCH /api/recipes/:recipeId/memo`

삭제·복원과 공유 API는 계약을 확정했지만 핵심 흐름 완료 후 구현한다. 조리 팁은 후속 범위로 유지한다.
