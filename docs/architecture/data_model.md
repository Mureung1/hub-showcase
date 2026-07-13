# Data Model

## 1. 목적

프론트엔드와 백엔드가 같은 필드명과 데이터 구조를 사용하고, 핵심 엔터티의 관계와 제약을 공유하기 위한 기준 문서이다.

이 문서는 다음 두 수준을 다룬다.

1. API 요청과 응답에서 사용하는 데이터 계약
2. 데이터베이스 기술과 독립적인 개념 모델 및 무결성 규칙

구체적인 테이블, 컬럼 타입, 인덱스, 마이그레이션과 ORM 모델은 데이터베이스 및 데이터 접근 기술을 선택한 뒤 별도로 확정한다.

---

## 2. 공통 규칙

- 필드명은 `camelCase`를 사용한다.
- 서비스 내부 ID는 API에서 `string`으로 처리한다.
- 날짜와 시각은 UTC 기준 ISO 8601 문자열로 전달한다.
- 선택 가능한 단일 값은 값이 없을 때 `null`, 배열은 `[]`을 사용한다.
- API 입력과 AI 응답은 서버에서 검증한 뒤 저장한다.
- API 응답에는 인증 credential, 세션 ID와 같은 보안 정보를 포함하지 않는다.

---

## 3. User

Google 로그인을 통해 생성되는 서비스 사용자이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `id` | string | O | 서비스 내부 사용자 ID |
| `googleSubject` | string | O | Google ID token의 변경되지 않는 `sub` 값 |
| `email` | string | O | Google이 제공한 이메일 |
| `name` | string | O | 사용자 이름 |
| `profileImageUrl` | string \| null | X | 프로필 이미지 |
| `createdAt` | string | O | 생성 시각 |
| `updatedAt` | string | O | 수정 시각 |

```ts
interface User {
  id: string;
  googleSubject: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

API에서는 Google 외부 식별자와 내부 날짜를 노출하지 않고 다음 형태를 사용한다.

```ts
interface CurrentUser {
  id: string;
  email: string;
  name: string;
  profileImageUrl: string | null;
}

interface GoogleLoginRequest {
  credential: string;
}

interface GoogleLoginResponse {
  user: CurrentUser;
}
```

### 제약

- `googleSubject`는 사용자마다 고유하고 변경하지 않는다.
- 이메일은 변경될 수 있으므로 Google 사용자의 외부 식별 키로 사용하지 않는다.
- Google credential과 access token은 User에 저장하지 않는다.

---

## 4. Session

Google 신원 확인 후 서비스의 로그인 상태를 유지하는 서버 세션이다.

```ts
interface Session {
  id: string;
  userId: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  absoluteExpiresAt: string;
}
```

### 제약

- 한 User는 여러 Session을 가질 수 있다.
- 세션은 마지막 활동 후 24시간 또는 생성 후 7일 중 먼저 도달한 시점에 만료한다.
- 세션 ID는 암호학적으로 안전한 난수이며 사용자 정보나 권한을 포함하지 않는다.
- 운영 쿠키는 `__Host-recipebook.sid` 이름을 사용하고 `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`로 제한한다.
- 로그인 성공 시 기존 요청의 세션 ID를 이어 쓰지 않고 새 세션을 생성한다.
- 로그아웃은 현재 Session을 제거하고, 전체 로그아웃은 해당 User의 모든 Session을 제거한다.
- 세션 ID 원문과 CSRF 토큰을 애플리케이션 로그에 남기지 않는다.
- 메모리 세션 저장소는 로컬 개발에서만 사용한다.

---

## 5. Recipe

사용자의 레시피북에 저장된 레시피이다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `id` | string | O | 레시피 ID |
| `ownerId` | string | O | 소유자 User ID |
| `type` | RecipeType | O | 레시피 유형 |
| `title` | string | O | 레시피 이름 |
| `description` | string \| null | X | 설명 |
| `servings` | string \| null | X | 기준 인원 |
| `cookingTimeMinutes` | number \| null | X | 예상 조리 시간(분) |
| `ingredients` | Ingredient[] | O | 재료 |
| `steps` | RecipeStep[] | O | 조리 단계 |
| `source` | RecipeSource \| null | X | 외부 출처 |
| `memo` | string \| null | X | 소유자의 개인 메모 |
| `createdAt` | string | O | 생성 시각 |
| `updatedAt` | string | O | 수정 시각 |
| `deletedAt` | string \| null | X | 휴지통 이동 시각 |

```ts
type RecipeType = "OWNED" | "EXTERNAL" | "RECEIVED";

interface Recipe {
  id: string;
  ownerId: string;
  type: RecipeType;
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}
```

일반 상세 API에서는 활성 레시피만 반환하므로 `deletedAt`을 제외한 다음 계약을 사용한다.

```ts
type RecipeDetail = Omit<Recipe, "deletedAt">;
```

### 레시피 유형

- `OWNED`: 사용자가 직접 입력한 내용을 기반으로 저장한 레시피
- `EXTERNAL`: URL 등 외부 출처를 기반으로 저장한 레시피
- `RECEIVED`: 다른 사용자에게 전달받아 저장한 레시피

### 제약

- 한 User는 여러 Recipe를 소유하며 각 Recipe에는 한 명의 소유자만 있다.
- 일반 저장 API에서 `ownerId`와 `type`은 서버가 결정한다.
- `source`가 `null`인 일반 저장 요청은 `OWNED`로 저장한다.
- 유효한 `source`가 있는 일반 저장 요청은 `EXTERNAL`로 저장한다.
- 일반 저장 API로 `RECEIVED`를 만들 수 없다. 전달 수락 흐름에서만 생성한다.
- `RECEIVED`의 세부 구조와 원본 수정 제한은 공유 기능 설계 시 확정한다.
- `deletedAt`이 있는 Recipe는 일반 목록과 상세 조회에서 제외한다.
- `memo`는 소유자에게만 노출하며 AI 입력이나 AI 구조화 응답에 포함하지 않는다.

---

## 6. Ingredient

```ts
interface Ingredient {
  name: string;
  amount: string | null;
  unit: string | null;
  order: number;
}
```

- `amount`는 `1/2`, `약간`, `적당량` 등을 표현할 수 있도록 문자열로 저장한다.
- 공백을 제거한 `name`이 비어 있는 재료는 저장 전에 제거한다.
- `order`는 Recipe 안에서 1부터 시작하고 중복되지 않아야 한다.

---

## 7. RecipeStep

```ts
interface RecipeStep {
  order: number;
  description: string;
}
```

- 공백을 제거한 `description`이 비어 있는 단계는 저장 전에 제거한다.
- `order`는 Recipe 안에서 1부터 시작하고 중복되지 않아야 한다.

---

## 8. RecipeSource

```ts
interface RecipeSource {
  url: string;
  title: string | null;
  author: string | null;
}
```

- `url`은 유효한 `http` 또는 `https` URL이어야 한다.
- URL은 localhost, 사설 IP 등 접근 제한 검증을 통과해야 한다.
- YouTube 채널명과 웹페이지 작성자는 `author`로 통일한다.
- 직접 입력만 사용한 `OWNED` 레시피는 `source`가 `null`이다.

---

## 9. 목록용 레시피

목록 API에서는 다음 필드만 반환한다.

```ts
interface RecipeSummary {
  id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  source: RecipeSource | null;
  createdAt: string;
}
```

- 개인 메모와 `ownerId`는 목록 응답에 포함하지 않는다.
- `deletedAt`이 있는 레시피는 일반 목록 응답에 포함하지 않는다.
- 전해준 사람, 전달받은 날짜, 재공유 가능 여부는 공유 기능 설계 시 추가한다.

---

## 10. AI 구조화 요청과 응답

### 요청

```ts
interface StructureRecipeRequest {
  sourceUrl: string | null;
  rawText: string | null;
}
```

- 두 값 중 하나 이상은 반드시 입력한다.
- 두 값이 모두 있으면 URL 내용을 기반으로 하고 `rawText`를 사용자 보완 정보로 함께 참고한다.

### 초안

```ts
interface RecipeDraft {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
}
```

- RecipeDraft에는 저장 전 서버 필드인 `id`, `ownerId`, `type`, `memo`, 날짜 필드를 포함하지 않는다.
- 조리 팁은 후속 범위이므로 이번 RecipeDraft에 포함하지 않는다.

### 확인 필요 항목

```ts
interface RecipeWarning {
  field: string;
  message: string;
  suggestedValue: string | number | null;
}
```

- `field`는 `title`, `cookingTimeMinutes`, `ingredients[0].amount`처럼 편집 폼의 필드 경로를 사용한다.
- `message`는 사용자가 이해할 수 있는 확인 사유를 담는다.
- `suggestedValue`는 AI가 정리한 값을 표시하며 제안할 값이 없으면 `null`이다.

### 응답

```ts
interface StructureRecipeResponse {
  draft: RecipeDraft;
  warnings: RecipeWarning[];
}
```

- AI 결과는 저장되지 않은 초안이다.
- 사용자가 확인하고 수정한 뒤 별도의 저장 API를 호출한다.
- 서버는 AI 응답을 검증하고 확인이 필요한 값을 `warnings`에 담는다.

---

## 11. 레시피 생성과 메모 요청

```ts
interface CreateRecipeRequest {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
  memo: string | null;
}

interface UpdateRecipeMemoRequest {
  memo: string | null;
}
```

- CreateRecipeRequest에는 서버가 결정하는 `ownerId`와 `type`을 포함하지 않는다.
- 빈 문자열 또는 공백만 있는 메모는 `null`로 저장한다.

---

## 12. 삭제와 감사 기록

레시피 삭제는 30일 동안 복원할 수 있는 soft delete로 처리한다.

```ts
type RecipeAuditAction = "DELETED" | "RESTORED";

interface RecipeAuditEvent {
  id: string;
  recipeId: string;
  actorUserId: string;
  action: RecipeAuditAction;
  occurredAt: string;
}
```

### 제약

- 삭제 시 `deletedAt`을 기록하고 Recipe 본문은 즉시 제거하지 않는다.
- 복원 시 `deletedAt`을 `null`로 변경한다.
- 삭제 후 30일 동안 복원할 수 있으며 MVP에는 즉시 영구 삭제 기능이 없다.
- 삭제와 복원은 각각 감사 이벤트로 남긴다.
- 감사 이벤트에는 세션 ID, Google credential, 레시피 본문을 저장하지 않는다.
- 30일 경과 레시피의 실제 삭제 방식과 감사 이벤트 보존 기간은 데이터베이스 및 운영 정책 확정 시 결정한다.

---

## 13. 공통 API 응답

### 성공

```ts
interface ApiSuccess<T> {
  data: T;
}
```

### 실패

```ts
interface ApiError {
  error: {
    code: string;
    message: string;
    details?: {
      field: string;
      message: string;
    }[];
  };
}
```

주요 오류 코드:

- `UNAUTHORIZED`
- `FORBIDDEN`
- `CSRF_TOKEN_INVALID`
- `ORIGIN_NOT_ALLOWED`
- `VALIDATION_ERROR`
- `GOOGLE_CREDENTIAL_INVALID`
- `RECIPE_NOT_FOUND`
- `INVALID_URL`
- `URL_NOT_ALLOWED`
- `URL_FETCH_FAILED`
- `AI_REQUEST_FAILED`
- `AI_RESPONSE_INVALID`
- `INTERNAL_SERVER_ERROR`

---

## 14. 개념 관계

```text
User 1 ─── N Session
User 1 ─── N Recipe
Recipe 1 ─── N Ingredient
Recipe 1 ─── N RecipeStep
Recipe 1 ─── 0..1 RecipeSource
Recipe 1 ─── N RecipeAuditEvent
```

Ingredient, RecipeStep, RecipeSource를 별도 테이블로 저장할지 Recipe 안에 포함할지는 데이터베이스 선택 후 결정한다. 위 관계는 저장 기술과 관계없이 지켜야 하는 소유 및 구성 관계를 나타낸다.

---

## 15. 후속 범위

### 공유

열람 공유와 전달 공유의 API 및 다음 구조는 공유 기능 구현 시 확정한다.

- 전달 초대와 1회 사용 상태
- 전달 시점의 레시피 스냅샷
- 원 저장자, 전해준 사람, 관계 라벨, 전달받은 날짜
- 받은 레시피의 원본 수정 및 재공유 제한

현재 문서에서는 공유 엔터티와 필드명을 미리 확정하지 않는다.

### 조리 팁

제품 문서에는 조리 팁이 포함되어 있지만 현재 핵심 흐름의 API와 모델에서는 제외한다. 조리 팁을 단일 문자열, 목록 또는 조리 단계별 정보 중 어떤 형태로 저장할지는 후속 설계에서 결정한다.

### 물리 데이터 모델

다음 항목은 주요 기술 선택 후 확정한다.

- 데이터베이스와 ORM 또는 데이터 접근 방식
- 실제 테이블과 컬럼 타입
- 외래 키, cascade 정책과 인덱스
- 세션 저장소
- 30일 경과 레시피 정리 작업
- 감사 기록 보존 기간
