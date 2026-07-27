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

### 인증

- Firebase Authentication을 사용하며 초기 MVP에서는 Google 로그인만 제공한다.
- 프론트엔드는 Firebase에서 받은 ID 토큰을 보호 API의 `Authorization: Bearer <Firebase ID token>` 헤더로 전달한다.
- Express는 Firebase Admin SDK로 각 요청의 ID 토큰 서명, 발급자, 대상 프로젝트와 만료 시간을 검증하고 `uid`로 서비스 사용자를 조회하거나 생성한다.
- 인증되지 않았거나 만료·위조된 ID 토큰은 `401 UNAUTHORIZED`를 반환한다.
- Firebase ID 토큰과 인증 credential은 애플리케이션 로그에 남기지 않는다.
- Bearer 토큰은 브라우저가 자동 전송하는 쿠키 인증이 아니므로 별도 CSRF 토큰을 사용하지 않는다. 상태 변경은 계속 `GET` 요청으로 구현하지 않는다.

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

### `GET /api/auth/me`

Firebase ID 토큰으로 식별된 현재 서비스 사용자 정보를 조회한다. 로그인과 로그아웃은 Firebase 클라이언트 SDK가 처리하며, 별도 로그인·로그아웃 API는 제공하지 않는다.

#### 인증

필요

#### 헤더

```text
Authorization: Bearer firebase-id-token
```

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
Authorization: Bearer firebase-id-token
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
- 공개 `youtube.com`, `youtu.be` 영상은 YouTube Data API로 제목·채널명을 조회하고, 공개 또는 자동 생성 자막을 우선 구조화 입력으로 사용한다.
- 자막 조회가 실패하면 Gemini가 원본 URL·제목·채널명을 분석한 결과를 기존 OpenAI 구조화·검증 단계로 전달한다. 프록시, 쿠키, 계정 인증, 차단 우회, 영상·자막·썸네일 저장은 지원하지 않는다. 모든 YouTube 처리 실패에는 새 전용 오류 코드 없이 기존 `URL_FETCH_FAILED` 422 및 직접 입력 안내를 사용한다.
- `blog.naver.com`과 하위 도메인은 현재 MVP/P0의 성공 입력 범위에서 제외하며 외부 요청 전에 기존 `URL_FETCH_FAILED` 422 및 직접 입력 안내로 처리한다.

구체적인 timeout, redirect 횟수, 응답 크기와 본문 길이는 URL 수집 구현 시 환경 설정으로 확정하고 README에 기록한다.

#### AI 제공자와 요청 제한

- OpenAI Responses API와 `gpt-5.6-luna`를 사용한다.
- 비밀 키는 백엔드의 `OPENAI_API_KEY`, 모델은 `OPENAI_MODEL`로 설정한다.
- YouTube 메타데이터용 `YOUTUBE_DATA_API_KEY`와 영상 분석용 `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.6-flash`를 백엔드에서만 사용한다. Gemini는 자막 조회 실패 시에만 호출하며 최종 `RecipeDraft` 구조화와 검증은 계속 OpenAI가 담당한다.
- AI 제공자 요청은 15초 후 중단하며 자동으로 재시도하지 않는다.
- 공백을 제거한 `rawText`는 최대 20,000자까지 허용한다.
- 인증된 사용자별 구조화 요청은 10분에 10회로 제한한다.
- OpenAI 요청은 `store: false`로 보내며 요청 원문과 응답 전문을 애플리케이션 로그에 남기지 않는다.

#### AI 응답 검증

- 제공자 요청에는 `RecipeDraft`와 `RecipeWarning`에 대응하는 엄격한 JSON Schema를 사용하고 스키마 밖 필드를 허용하지 않는다.
- 서버는 구조화 출력도 신뢰하지 않고 JSON 파싱, 필수 필드와 타입, null 허용 범위, 배열 항목과 1부터 시작하는 중복 없는 `order`, 숫자 범위를 다시 검증한다.
- `id`, `ownerId`, `type`, `memo`, `receivedInfo`, 날짜 필드는 AI 응답에 포함할 수 없다.
- 직접 입력만 사용한 요청의 `source`는 `null`이어야 한다.
- URL 입력의 `source.url`은 사용자가 제출하고 서버가 안전성을 검증한 URL과 같아야 한다.
- AI가 원문에 없는 값을 추정하거나 모호한 값을 정리하면 편집 가능한 필드 경로를 `warnings`에 포함한다.
- 검증에 실패한 응답은 일부 필드를 임의로 보정하지 않고 `AI_RESPONSE_INVALID`로 거부한다.
- 성공한 초안도 저장하지 않으며, 사용자가 수정한 저장 요청을 레시피 저장 API에서 다시 검증한다.

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
- `VALIDATION_ERROR`
- `INVALID_URL`
- `URL_NOT_ALLOWED`
- `URL_FETCH_FAILED`
- `AI_RATE_LIMITED`
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
Authorization: Bearer firebase-id-token
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
Authorization: Bearer firebase-id-token
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
- `VALIDATION_ERROR`
- `RECIPE_NOT_FOUND`

---

## 10. 공유

### 공통 공유 규칙

- 전달 공유는 현재 활성 범위다. 열람 공유 계약은 삭제하지 않고 유지하지만, 구현은 가치와 필요성을 다시 검토할 P3 연기 후보이며 활성 MVP·출시 선행 조건이 아니다.
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
Authorization: Bearer firebase-id-token
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
- `RECIPE_NOT_FOUND`
- `RECIPE_NOT_SHAREABLE`

---

### `DELETE /api/recipes/:recipeId/view-shares`

현재 열람 링크를 비활성화한다.

#### 인증

필요

#### 헤더

```text
Authorization: Bearer firebase-id-token
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
Authorization: Bearer firebase-id-token
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
Authorization: Bearer firebase-id-token
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
- `VALIDATION_ERROR`
- `TRANSFER_INVITATION_NOT_FOUND`
- `TRANSFER_INVITATION_USED`
- `TRANSFER_INVITATION_EXPIRED`
- `TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED`

거절은 서버 상태를 변경하거나 초대를 만료시키지 않으므로 별도 API를 제공하지 않는다.

---

## 11. 레시피 수정·삭제·복원

### `PATCH /api/recipes/:recipeId`

현재 사용자가 소유한 활성 `OWNED`, `EXTERNAL` 레시피의 원본 내용을 수정한다.

#### 인증

필요

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
  "source": null
}
```

#### 요청 규칙

- `PATCH`지만 재료·단계·출처를 포함한 편집 폼 전체를 한 트랜잭션으로 교체하는 계약이다. 배열의 부분 수정 의미와 순서 충돌을 만들지 않기 위해 모든 편집 가능 필드를 매 요청에 보낸다.
- 편집 가능 필드는 `title`, `description`, `servings`, `cookingTimeMinutes`, `ingredients`, `steps`, `source`뿐이다.
- `ownerId`, `type`, `receivedInfo`, `memo`, 공유 상태와 생성·수정·삭제 시각은 요청에 포함하지 않는다. 개인 메모와 공유 상태는 각각의 전용 API에서만 변경한다.
- 허용하지 않은 필드를 보내거나 편집 가능 필드를 누락하면 `VALIDATION_ERROR`로 거부한다.
- 본문 검증과 URL 검증은 레시피 저장 API와 같은 규칙을 사용한다.
- 서버는 검증된 `source`가 `null`이면 `OWNED`, 값이 있으면 `EXTERNAL`로 `type`을 다시 결정한다.
- 현재 사용자가 소유한 활성 `RECEIVED` 레시피는 `RECIPE_NOT_EDITABLE`로 거부한다.
- 없는 ID, 잘못된 ID, 다른 사용자 소유와 soft delete된 레시피는 존재 여부를 숨기고 모두 `RECIPE_NOT_FOUND`로 처리한다.

#### 성공 응답

```json
{
  "data": {
    "id": "recipe-id",
    "type": "OWNED",
    "updatedAt": "2026-07-27T10:00:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `INVALID_URL`
- `URL_NOT_ALLOWED`
- `RECIPE_NOT_FOUND`
- `RECIPE_NOT_EDITABLE`

---

### `DELETE /api/recipes/:recipeId`

현재 사용자가 소유한 활성 레시피를 soft delete한다. `OWNED`, `EXTERNAL`은 삭제로 표현하고 `RECEIVED`는 다른 사용자의 원본에 영향 없이 내 레시피북의 복사본을 제거하는 의미로 표현한다.

#### 인증

필요

#### 처리 규칙

- 세 유형 모두 해당 소유자의 Recipe에 `deletedAt`을 기록하고 일반 목록·상세·공유 생성 대상에서 제외한다.
- `deletedAt`, `updatedAt` 갱신과 `DELETED` 감사 이벤트 기록은 한 트랜잭션으로 처리한다.
- 없는 ID, 잘못된 ID, 다른 사용자 소유와 이미 삭제된 레시피는 모두 `RECIPE_NOT_FOUND`로 처리한다.

#### 성공 응답

```json
{
  "data": {
    "id": "recipe-id",
    "type": "RECEIVED",
    "deletedAt": "2026-07-27T10:00:00.000Z",
    "restoreUntil": "2026-08-26T10:00:00.000Z"
  }
}
```

`restoreUntil`은 `deletedAt`부터 30일 뒤인 복원 만료 시각이다.

#### 오류

- `UNAUTHORIZED`
- `RECIPE_NOT_FOUND`

---

### `GET /api/recipes/trash`

현재 사용자의 삭제 레시피 중 아직 복원 가능한 항목을 조회한다.

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
      "deletedAt": "2026-07-27T10:00:00.000Z",
      "restoreUntil": "2026-08-26T10:00:00.000Z"
    }
  ]
}
```

복원 가능한 레시피가 없으면 `200`과 `{ "data": [] }`를 반환한다.

#### 조회 규칙

- 현재 사용자 소유이면서 `deletedAt > 현재 시각 - 30일`인 행만 반환한다.
- `deletedAt` 내림차순으로 정렬한다.
- 각 항목은 `id`, `type`, `title`, `description`, `source`, `receivedInfo`, `deletedAt`, `restoreUntil`만 포함한다.
- 30일이 지난 레코드가 물리적으로 남아 있어도 휴지통 목록에는 반환하지 않는다.
- Express 라우터에서는 이 경로를 `GET /api/recipes/:recipeId`보다 먼저 등록해 `trash`가 레시피 ID로 처리되지 않게 한다.

#### 오류

- `UNAUTHORIZED`

---

### `POST /api/recipes/:recipeId/restore`

현재 사용자가 소유하고 삭제 후 30일이 지나지 않은 레시피를 복원한다.

#### 인증

필요

#### 처리 규칙

- `deletedAt`을 `null`로 바꾸고 `updatedAt`을 복원 시각으로 갱신한다.
- Recipe 갱신과 `RESTORED` 감사 이벤트 기록은 한 트랜잭션으로 처리한다.
- 활성 레시피, 없는 ID, 잘못된 ID와 다른 사용자 소유 레시피는 모두 `RECIPE_NOT_FOUND`로 처리한다.
- 물리적으로 남아 있지만 삭제 후 30일이 지난 레시피는 `RECIPE_RESTORE_EXPIRED`로 처리한다. 30일이 되는 시점부터 복원할 수 없다.

#### 성공 응답

```json
{
  "data": {
    "id": "recipe-id",
    "type": "EXTERNAL",
    "restoredAt": "2026-07-27T10:00:00.000Z"
  }
}
```

#### 오류

- `UNAUTHORIZED`
- `RECIPE_NOT_FOUND`
- `RECIPE_RESTORE_EXPIRED`

MVP에는 영구 삭제 API, 휴지통 비우기와 자동 purge 작업을 두지 않는다. 30일이 지난 레코드의 물리 삭제와 관계·감사 데이터 보존 방식은 후속 운영·데이터 보존 결정에서 확정한다.

---

## 12. 주요 오류 코드

| 코드 | HTTP 상태 | 의미 |
|---|---:|---|
| `API_NOT_FOUND` | 404 | 요청한 API 경로가 없음 |
| `UNAUTHORIZED` | 401 | 로그인 필요 또는 Firebase ID 토큰이 유효하지 않음 |
| `FORBIDDEN` | 403 | 접근 권한 없음 |
| `VALIDATION_ERROR` | 400 | 요청값 오류 |
| `INVALID_JSON` | 400 | JSON 요청 형식 오류 |
| `PAYLOAD_TOO_LARGE` | 413 | JSON 요청 본문 크기 제한 초과 |
| `RECIPE_NOT_FOUND` | 404 | 레시피 없음 또는 조회할 수 없음 |
| `INVALID_URL` | 400 | URL 형식 오류 |
| `URL_NOT_ALLOWED` | 400 | 접근이 차단된 URL |
| `URL_FETCH_FAILED` | 422 | URL 내용 조회 실패 |
| `AI_REQUEST_FAILED` | 502 | AI 제공자 요청 실패 |
| `AI_RESPONSE_INVALID` | 502 | AI 응답 형식 또는 검증 오류 |
| `RECIPE_NOT_EDITABLE` | 403 | 현재 레시피 유형은 원본을 수정할 수 없음 |
| `RECIPE_RESTORE_EXPIRED` | 410 | 삭제 후 30일이 지나 복원할 수 없음 |
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
2. Firebase Authentication Google 로그인
3. `GET /api/auth/me`
4. `GET /api/recipes`
5. `GET /api/recipes/:recipeId`
6. `POST /api/ai/recipes/structure`
7. `POST /api/recipes`
8. `POST /api/recipes/:recipeId/transfer-invitations`
9. `GET /api/transfer-invitations/by-link/:linkToken`
10. `POST /api/transfer-invitations/by-code`
11. `POST /api/transfer-invitations/:invitationId/accept`

레시피 원본 수정, 삭제·복원과 개인 메모 API는 계약을 확정했지만 후속 구현 범위로 유지한다. 열람 공유 계약과 티켓도 유지하되 가치와 필요성을 다시 검토할 P3 연기 후보이며 활성 MVP·출시 선행 조건이 아니다. 조리 팁도 후속 범위다.
