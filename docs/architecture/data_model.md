# Data Model

## 1. 목적

프론트엔드와 백엔드가 같은 필드명과 데이터 구조를 사용하고, 핵심 엔터티의 관계와 제약을 공유하기 위한 기준 문서이다.

이 문서는 다음 두 수준을 다룬다.

1. API 요청과 응답에서 사용하는 데이터 계약
2. PostgreSQL 물리 모델로 연결되는 개념 모델 및 무결성 규칙

운영 데이터베이스는 PostgreSQL을 사용한다. 현재 규모에서는 `pg` Pool과 매개변수화한 SQL을 사용하며, 마이그레이션은 `backend/migrations`의 순차 SQL 파일을 `npm run migrate`로 적용한다.

---

## 2. 공통 규칙

- 필드명은 `camelCase`를 사용한다.
- 서비스 내부 ID는 API에서 `string`으로 처리한다.
- 날짜와 시각은 UTC 기준 ISO 8601 문자열로 전달한다.
- 선택 가능한 단일 값은 값이 없을 때 `null`, 배열은 `[]`을 사용한다.
- API 입력과 AI 응답은 서버에서 검증한 뒤 저장한다.
- API 응답에는 인증 credential, 세션 ID와 같은 보안 정보를 포함하지 않는다.
- 물리 테이블과 컬럼은 복수형 `snake_case`, API와 TypeScript 필드는 `camelCase`를 사용한다.
- 서비스 내부 UUID는 PostgreSQL `uuid`, 시각은 `timestamptz`로 저장한다.

---

## 3. User

Firebase Authentication으로 식별되는 서비스 사용자이다. 초기에는 Google 로그인만 제공하며, 후속 인증 방식을 연결해도 Firebase UID를 사용자 식별 기준으로 유지한다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|---:|---|
| `id` | string | O | 서비스 내부 사용자 ID |
| `firebaseUid` | string | O | Firebase Authentication의 변경되지 않는 `uid` 값 |
| `email` | string \| null | X | Firebase가 제공한 이메일 |
| `name` | string \| null | X | Firebase가 제공한 사용자 이름 |
| `profileImageUrl` | string \| null | X | 프로필 이미지 |
| `createdAt` | string | O | 생성 시각 |
| `updatedAt` | string | O | 수정 시각 |

```ts
interface User {
  id: string;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  profileImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
```

API에서는 Firebase 외부 식별자와 내부 날짜를 노출하지 않고 다음 형태를 사용한다.

```ts
interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  profileImageUrl: string | null;
}

```

### 제약

- `firebaseUid`는 사용자마다 고유하고 변경하지 않는다.
- 이메일은 변경되거나 제공되지 않을 수 있으므로 외부 사용자 식별 키로 사용하지 않는다.
- Firebase ID 토큰과 provider access token은 User에 저장하지 않는다.

### PostgreSQL 물리 모델

테이블 이름은 `users`를 사용한다.

| 컬럼 | PostgreSQL 타입 | NULL | 키·기본값 | 설명 |
|---|---|---:|---|---|
| `id` | `uuid` | 불가 | PK | 애플리케이션에서 `crypto.randomUUID()`로 생성 |
| `firebase_uid` | `varchar(128)` | 불가 | UNIQUE | Firebase Authentication의 `uid` 값 |
| `email` | `varchar(320)` | 가능 |  | Firebase가 제공한 이메일 |
| `name` | `varchar(100)` | 가능 |  | Firebase가 제공한 사용자 이름 |
| `profile_image_url` | `text` | 가능 |  | 프로필 이미지 URL |
| `created_at` | `timestamptz` | 불가 | `CURRENT_TIMESTAMP` | 생성 시각 |
| `updated_at` | `timestamptz` | 불가 | `CURRENT_TIMESTAMP` | 마지막 수정 시각 |

- `id`에는 auto increment와 데이터베이스 기본값을 사용하지 않는다.
- `email`은 변경될 수 있으므로 unique 제약을 적용하지 않는다.
- `updated_at`은 레코드를 수정할 때 애플리케이션에서 현재 시각으로 갱신한다.

---

## 4. Recipe

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
| `receivedInfo` | ReceivedRecipeInfo \| null | X | 전달받은 레시피의 관계 정보 |
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
  receivedInfo: ReceivedRecipeInfo | null;
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
- `RECEIVED`는 전달 초대 수락 흐름에서 생성한 복사본이며 원본 내용은 수정하거나 재공유할 수 없다.
- `RECEIVED`는 개인 메모만 수정할 수 있고 `receivedInfo`가 반드시 존재한다.
- `OWNED`, `EXTERNAL`의 `receivedInfo`는 `null`이다.
- `deletedAt`이 있는 Recipe는 일반 목록과 상세 조회에서 제외한다.
- `memo`는 소유자에게만 노출하며 AI 입력이나 AI 구조화 응답에 포함하지 않는다.

---

## 5. Ingredient

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

## 6. RecipeStep

```ts
interface RecipeStep {
  order: number;
  description: string;
}
```

- 공백을 제거한 `description`이 비어 있는 단계는 저장 전에 제거한다.
- `order`는 Recipe 안에서 1부터 시작하고 중복되지 않아야 한다.

---

## 7. RecipeSource

```ts
interface RecipeSource {
  url: string;
  title: string | null;
  author: string | null;
}
```

- `url`은 유효한 `http` 또는 `https` URL이어야 한다.
- URL은 localhost, 사설 IP 등 접근 제한 검증을 통과해야 한다.
- 지원되는 웹페이지 작성자는 `author`로 통일한다. YouTube 출처는 `title`에 영상 제목, `author`에 채널명을 저장한다. 원본 URL만 저장하며 썸네일, 영상과 자막 원문은 저장하지 않는다.
- 직접 입력만 사용한 `OWNED` 레시피는 `source`가 `null`이다.

---

## 8. 목록용 레시피

목록 API에서는 다음 필드만 반환한다.

```ts
interface RecipeSummary {
  id: string;
  type: RecipeType;
  title: string;
  description: string | null;
  source: RecipeSource | null;
  receivedInfo: ReceivedRecipeInfo | null;
  createdAt: string;
}
```

- 개인 메모와 `ownerId`는 목록 응답에 포함하지 않는다.
- `deletedAt`이 있는 레시피는 일반 목록 응답에 포함하지 않는다.
- `RECEIVED`에는 전해준 사람, 관계 라벨, 전달받은 날짜와 재공유 가능 여부를 `receivedInfo`로 제공한다.

---

## 9. AI 구조화 요청과 응답

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

## 10. 레시피 생성과 메모 요청

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

## 11. 공유

### 공통 표시 모델

공유 응답에는 사용자 ID, Google 외부 식별자, 개인 메모와 내부 날짜를 노출하지 않는다.

```ts
interface UserDisplay {
  name: string;
  profileImageUrl: string | null;
}

interface SharedRecipe {
  title: string;
  description: string | null;
  servings: string | null;
  cookingTimeMinutes: number | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  source: RecipeSource | null;
}
```

### 열람 공유

```ts
interface ViewShareCreated {
  sharePath: string;
  createdAt: string;
}
```

- 열람 공유는 로그인 여부와 관계없이 유효한 링크를 가진 사람이 조회할 수 있다.
- `OWNED`, `EXTERNAL`만 열람 공유할 수 있고 `RECEIVED`는 열람 공유할 수 없다.
- 열람자는 조회만 가능하며 저장, 수정, 메모 작성과 재공유를 할 수 없다.
- 레시피마다 `RecipeViewShare`를 최대 하나만 두고 링크 재생성 시 토큰과 생성 시각을 교체한다.
- 링크 비활성화 시 `revokedAt`을 기록한다. 비활성 링크와 soft delete된 원본은 조회할 수 없다.
- 원문 토큰은 생성 응답에서 한 번만 반환하고 DB에는 SHA-256 해시만 저장한다.

### 전달 공유

```ts
interface RecipeSnapshot {
  recipe: SharedRecipe;
  originalOwner: UserDisplay;
}

interface StoredRecipeSnapshot {
  snapshotVersion: 1;
  snapshot: RecipeSnapshot;
}

interface TransferInvitationCreated {
  invitationId: string;
  transferPath: string;
  invitationCode: string;
  createdAt: string;
  expiresAt: string;
}

interface TransferInvitationPreview {
  invitationId: string;
  recipe: SharedRecipe;
  originalOwner: UserDisplay;
  expiresAt: string;
  canReshare: false;
}

interface AcceptTransferInvitationRequest {
  senderDisplayName: string;
  relationshipLabel: string;
  memo: string | null;
}

interface ReceivedRecipeInfo {
  originalOwner: UserDisplay;
  senderDisplayName: string;
  relationshipLabel: string;
  receivedAt: string;
  canReshare: false;
}
```

- `OWNED`만 전달 초대를 만들 수 있다. `EXTERNAL`, `RECEIVED`는 전달 공유할 수 없다.
- 현 MVP에서는 원 저장자가 초대를 생성하므로 시스템상 전달자는 `sourceRecipe.ownerId`와 같다. 받는 사용자가 입력한 `senderDisplayName`만 별도로 보관한다.
- 전달 초대는 생성 시점의 `RecipeSnapshot`을 `jsonb`로 저장하고 별도 `snapshotVersion`으로 구조 버전을 관리하며 원본 수정의 영향을 받지 않는다.
- 초대 링크와 초대 코드는 같은 `TransferInvitation`을 가리키고 생성 후 7일에 만료한다.
- 전달 미리보기와 수락에는 로그인이 필요하다.
- 거절은 레시피를 만들거나 초대를 만료시키지 않는다.
- 전송자는 자신의 초대를 수락할 수 없다.
- 수락 시 `RECEIVED` Recipe와 하위 데이터, `ReceivedRecipeInfo`를 생성하고 초대를 사용 완료로 전환한다.
- 수락 전체 과정은 하나의 트랜잭션으로 처리하며 동시에 들어온 요청 중 하나만 성공한다.
- 원문 링크 토큰은 SHA-256, 사람이 입력하는 초대 코드는 서버 비밀값을 사용한 HMAC-SHA-256 해시로만 저장한다.
- 공유 토큰이 포함된 요청 경로와 초대 코드는 접근 로그와 애플리케이션 로그에서 마스킹한다.
- QR은 별도 데이터가 아니라 프론트엔드 origin과 `transferPath`로 만든 전달 링크의 표현 방식이다.

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
- 감사 이벤트에는 Firebase ID 토큰, provider access token, 레시피 본문을 저장하지 않는다.
- 30일 경과 레시피의 실제 삭제 방식과 감사 이벤트 보존 기간은 데이터 접근 방식 및 운영 정책 확정 시 결정한다.

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

- `API_NOT_FOUND`
- `UNAUTHORIZED`
- `FORBIDDEN`
- `VALIDATION_ERROR`
- `RECIPE_NOT_FOUND`
- `INVALID_URL`
- `URL_NOT_ALLOWED`
- `URL_FETCH_FAILED`
- `AI_REQUEST_FAILED`
- `AI_RESPONSE_INVALID`
- `RECIPE_NOT_SHAREABLE`
- `VIEW_SHARE_NOT_FOUND`
- `VIEW_SHARE_INACTIVE`
- `TRANSFER_INVITATION_NOT_FOUND`
- `TRANSFER_INVITATION_USED`
- `TRANSFER_INVITATION_EXPIRED`
- `TRANSFER_INVITATION_SELF_ACCEPT_NOT_ALLOWED`
- `INTERNAL_SERVER_ERROR`

---

## 14. 개념 관계

```text
User 1 ─── N Recipe
Recipe 1 ─── N Ingredient
Recipe 1 ─── N RecipeStep
Recipe 1 ─── 0..1 RecipeSource
Recipe 1 ─── N RecipeAuditEvent
Recipe 1 ─── 0..1 RecipeViewShare
Recipe 1 ─── N TransferInvitation
TransferInvitation 1 ─── 0..1 ReceivedRecipeInfo
Recipe 1 ─── 0..1 ReceivedRecipeInfo
```

재료, 조리 단계와 출처는 별도 테이블로 정규화한다. 전달 초대의 불변 스냅샷만 `jsonb`로 저장한다. 다대다 관계는 사용하지 않는다.

---

## 15. PostgreSQL 물리 모델

전체 물리 모델은 `docs/architecture/db.vuerd.json`을 기준으로 한다. ERD의 읽는 법과 테이블별 설명은 [ERD 안내서](db_erd_guide.md)를 참고한다.

| 테이블 | PK | 주요 관계와 제약 |
|---|---|---|
| `users` | `id` | `firebase_uid` UNIQUE |
| `recipes` | `id` | `owner_id` FK, 유형은 `OWNED`·`EXTERNAL`·`RECEIVED` |
| `ingredients` | `recipe_id, position` | Recipe 1:N |
| `recipe_steps` | `recipe_id, position` | Recipe 1:N |
| `recipe_sources` | `recipe_id` | Recipe 1:0..1 |
| `recipe_audit_events` | `id` | Recipe와 행위 User 참조 |
| `recipe_view_shares` | `recipe_id` | Recipe 1:0..1, `token_hash` UNIQUE |
| `transfer_invitations` | `id` | 원본 Recipe 참조, 링크·코드 해시 UNIQUE |
| `received_recipe_details` | `recipe_id` | Recipe 1:0..1, `transfer_invitation_id` UNIQUE |

- 서비스 UUID는 애플리케이션의 `crypto.randomUUID()`로 생성하며 auto increment를 사용하지 않는다.
- 조회 인덱스는 사용자별 활성 레시피 목록, 레시피별 감사 기록, 원본별 전달 초대와 초대 만료 시각에 둔다.
- `canReshare`와 초대 수락자는 별도 컬럼으로 저장하지 않는다. 전자는 `RECEIVED` 정책에서, 후자는 받은 레시피의 `owner_id`에서 결정한다.
- 감사와 전달 공유 관계를 보존하기 위해 `recipe_audit_events`, `transfer_invitations`, `received_recipe_details`의 FK는 `ON DELETE RESTRICT`를 사용한다. MVP는 Recipe를 soft delete하며, 향후 영구 삭제가 필요하면 관계 데이터의 보존·정리 순서를 별도 정책과 트랜잭션으로 명시한다.

---

## 16. 후속 범위

### 조리 팁

조리 팁은 현재 제품·화면·API·ERD 범위에서 제외한다. 단일 문자열, 목록 또는 조리 단계별 정보 중 어떤 형태로 저장할지는 후속 설계에서 결정한다.

### 운영 및 데이터 접근

- 데이터 접근은 `pg` Pool과 매개변수화한 SQL로 구현한다.
- `users`에서 `recipes`로의 참조는 `RESTRICT`로 보호하고, Recipe의 재료·조리 단계·출처는 Recipe 삭제 시 `CASCADE`로 정리한다.
- 30일 경과 레시피 정리 작업
- 감사 기록 보존 기간
