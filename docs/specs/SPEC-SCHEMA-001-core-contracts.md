# SPEC-SCHEMA-001. 공통 Zod Schema 계약 (Core Contracts)

- 상태: **Ready (Step 1~3 확정, 구현 대기)**
- 기준 문서: `docs/domain-policy.md`, `docs/data-model.md`, `CLAUDE.md` 4·5장, `docs/specs/index.md`(고정 요구사항)
- 작성 방식:
  - 0장 "고정 사항"은 확정된 정책·데이터 모델에서 온 것이며, 이 Spec에서 임의로 바꾸지 않는다. 바꾸려면 해당 기준 문서를 먼저 변경한다.
  - 1장 "결정 사항"은 사용자가 직접 결정했다. Agent는 질문과 선택지를 제시하고 결정을 받아 적었다.
- **구현 시점 주의**: 이 Spec의 구현(T 단계)은 진행 중인 UI 수정 라운드가 끝난 뒤 시작한다. 같은 파일(`apps/web/src/features/chat/types.ts` 등)을 두 작업이 동시에 수정하는 충돌을 피하기 위함이다.

---

## 0. 고정 사항 (정책·모델 확정)

### 0.1 한 줄 목표

Chat → Question → SourceAnswer → Agenda → FinalAnswer → DecisionNote 전 도메인의 Zod 스키마를 `packages/shared`에 한 번만 정의하여, Mock 데이터·프론트 타입·(추후) Express API·AI 응답 정규화가 전부 같은 계약을 사용하게 한다.

### 0.2 기존 문서에서 오는 고정 규칙

- Zod 스키마를 먼저 작성하고, TypeScript 타입은 `z.infer`로 생성한다 (CLAUDE.md 5장).
- Mock Data와 실제 API 응답은 같은 Zod 스키마를 만족해야 한다 (CLAUDE.md 5장).
- `packages/shared`는 React, Express, Supabase SDK, AI SDK에 의존하지 않는다 (CLAUDE.md 4장).
- Enum 값·필드·제약은 `docs/data-model.md`와 `docs/domain-policy.md`를 그대로 따른다. 이 Spec은 그것을 camelCase 계약으로 옮겨 적을 뿐, 새로 정의하지 않는다.
- `structuredContent`의 각 Section은 안정적인 `sectionId` 필수 필드를 포함한다 (specs/index.md 고정 요구사항 — Agenda 근거 추적용).

---

## 1. 결정 사항 요약 (사용자 확정, 2026-07-17)

| # | 질문 | 결정 |
|---|---|---|
| 1-1 | `packages/shared` 신설 시점 | **(a) 이 Spec에서 바로 신설** — 스키마를 처음부터 shared에 두고 web이 import, API는 추후 합류 |
| 1-2 | 계약 범위 | **(a) 도메인 엔티티만** — API 봉투(envelope)·HTTP 에러 응답 형식은 API Spec에서 |
| 1-3 | 필드 이름 기준 | **(a) camelCase** — snake_case 변환은 Repository 계층(DB 경계)에서만 |
| 2-1 | DecisionNote의 `seq`·`sources` | **(a) 계약에서 제거** — 노트 번호·순서는 Question의 `sequenceNumber`에서 파생(join 정렬), 중복 저장 금지 |
| 2-2 | 충돌 입장(stance)·`sourceRefs`의 모양 | **(b) 자유형 JSON 유지** — 정식 모양은 SPEC-AI-002(Manager)에서 확정, 그때 provider 캐스팅 임시방편도 해소 |
| 2-3 | 오류 필드 | DB 모델 그대로 계약에 포함 (`errorCode`·`errorMessage`, Question의 `lastErrorCode`·`lastErrorMessage`) |
| 3-1 | Mock 데이터 검증 | **(a) Mock Service가 데이터 반환 직전에 스키마 검증** — 계약 위반 Mock은 개발 중 즉시 에러 |
| 3-2 | AI 응답 검증 실패 취급 | **(b-2) 상태는 `failed` 하나로 유지 + `errorCode`로 실패 종류 구분** — 상태 머신·Enum 변경 없음 |
| 3-3 | 프론트 응답 검증 실패 | **(a) 기존 error 상태 UI 재사용** + errorCode 원문을 화면·로그에 명확히 표시 (디버깅 목적) |

---

## 2. 파일 배치 — `packages/shared` 신설

```text
packages/shared/
  package.json          # name: @decision-log/shared, 의존성은 zod 하나만
  tsconfig.json
  src/
    index.ts            # 공개 export 모음
    schemas/
      enums.ts          # Enum 6종
      errorCodes.ts     # 에러 코드 레지스트리
      chat.ts
      question.ts
      sourceAnswer.ts
      agenda.ts
      finalAnswer.ts
      decisionNote.ts
```

- 루트 `package.json`의 workspaces에 `packages/*`를 추가한다. 루트 `package-lock.json` 하나만 유지한다.
- `apps/web`은 `@decision-log/shared`로 import한다. 상대 경로로 다른 workspace의 소스 파일을 직접 import하지 않는다.
- shared의 런타임 의존성은 `zod` 하나뿐이다. React, Express, Supabase SDK, AI SDK, 브라우저 전용 API를 import하면 안 된다.
- zod 버전은 기존 `apps/api`가 쓰는 버전과 동일한 major로 맞춘다.

---

## 3. 공통 표기 규칙

- 모든 필드는 **camelCase**. DB의 snake_case(`chat_id` 등)로의 변환은 추후 Repository 계층에서만 일어난다 (SPEC-DB-001).
- `id`와 모든 참조 ID(`chatId`, `questionId`)는 UUID 문자열.
- 날짜·시간 필드(`createdAt` 등)는 **ISO 8601 문자열**로 계약한다. Date 객체를 계약에 쓰지 않는다.
- **서버 내부 전용 필드는 계약에 포함하지 않는다**: `contextSnapshot`, `contextVersion`, `requestSnapshot`, `rawContent`, `promptVersion`, `inputSnapshot`. 이 필드들은 DB에는 존재하지만(data-model.md) 화면·API 경계를 넘지 않으며, 백엔드 Spec에서 다룬다.
- `userId`는 엔티티 계약에 포함하지 않는다. 소유권은 검증된 JWT에서만 판단한다 (CLAUDE.md 6장). API 응답에 포함할지는 SPEC-AUTH에서 재검토한다.

---

## 4. Enum 계약 (6종)

값은 `data-model.md` 4장과 동일하다. 각 Enum은 `z.enum([...])`으로 정의하고 타입을 `z.infer`로 export한다.

| 스키마 이름 | 값 |
|---|---|
| `QuestionStatusSchema` | `draft` `processing` `review_required` `completed` |
| `SourceAnswerStatusSchema` | `pending` `processing` `succeeded` `failed` |
| `AgendaStatusSchema` | `draft` `conflicted` `recheck_requested` `reanswered` `passed` `rejected` |
| `AgendaResolutionReasonSchema` | `auto_consensus` `user_accepted` `user_accepted_after_recheck` `user_composed` `user_composed_after_recheck` `user_rejected` `user_rejected_after_recheck` |
| `FinalAnswerGenerationModeSchema` | `multi_source` `single_source_fallback` `all_agendas_rejected` |
| `AiProviderSchema` | `claude` `openai` `gemini` |

- provider 내부 값과 화면 표시 라벨(Claude·ChatGPT·Gemini)은 분리 유지한다 (DESIGN.md). 표시 라벨 매핑은 계약이 아니라 web의 표시 계층에 둔다.

---

## 5. 엔티티 스키마 계약 (6종)

필드·제약은 `data-model.md` 3장을 camelCase로 옮긴 것이다. `?`는 nullable을 뜻한다.

### 5.1 `ChatSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `title` | string | 1~100자 |
| `createdAt` / `updatedAt` | string | ISO 8601 |

### 5.2 `QuestionSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `chatId` | string | UUID |
| `sequenceNumber` | number | 정수, 1 이상 |
| `message` | string | 1~1000자 |
| `status` | QuestionStatus | |
| `lastErrorCode`? | string? | 7장 레지스트리 값만 |
| `lastErrorMessage`? | string? | 안전하게 가공된 메시지 |
| `createdAt` / `updatedAt` | string | ISO 8601 |
| `completedAt`? | string? | ISO 8601 |

### 5.3 `SourceAnswerSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `questionId` | string | UUID |
| `provider` | AiProvider | |
| `model` | string | 실제 사용 모델명 |
| `status` | SourceAnswerStatus | |
| `structuredContent`? | StructuredContent? | 5.3.1, succeeded일 때 필수 |
| `errorCode`? | string? | 7장 레지스트리 값만 |
| `errorMessage`? | string? | |
| `retryCount` | number | 정수 0~1 |
| `excludedFromComparison` | boolean | 기본 false |
| `excludedAt`? | string? | ISO 8601 |
| `startedAt`? / `completedAt`? | string? | ISO 8601 |
| `createdAt` / `updatedAt` | string | ISO 8601 |

#### 5.3.1 `StructuredContentSchema` (최소 골격)

specs/index.md 고정 요구사항에 따라 최소 골격만 지금 확정한다. 필드 추가·확장은 SPEC-AI-001에서.

```text
StructuredContent
- sections: Section[]  (1개 이상)

Section
- sectionId: string    (안정적 식별자, 필수 — Agenda 근거 추적용)
- title: string
- content: string
```

### 5.4 `AgendaSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `questionId` | string | UUID |
| `status` | AgendaStatus | |
| `resolutionReason`? | AgendaResolutionReason? | 6장 정합 규칙 |
| `title` | string | 1~200자 |
| `summary` | string | |
| `selectedContent`? | string? | 6장 정합 규칙 |
| `userNote`? | string? | |
| `sourceRefs` | unknown[] | **자유형(결정 2-2)** — 정식 모양은 SPEC-AI-002에서 |
| `recheckRequest`? | string? | |
| `recheckResult`? | unknown? | 자유형 — SPEC-AI-002에서 |
| `recheckRequestedAt`? / `reansweredAt`? / `resolvedAt`? | string? | ISO 8601 |
| `createdAt` / `updatedAt` | string | ISO 8601 |

### 5.5 `FinalAnswerSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `questionId` | string | UUID |
| `content` | string | 1자 이상 |
| `generationMode` | FinalAnswerGenerationMode | |
| `createdAt` | string | ISO 8601 |

### 5.6 `DecisionNoteSchema`

| 필드 | 타입 | 제약 |
|---|---|---|
| `id` | string | UUID |
| `questionId` | string | UUID |
| `content` | string | 1자 이상 |
| `createdAt` / `updatedAt` | string | ISO 8601 |

- **`seq`·`sources` 필드는 존재하지 않는다 (결정 2-1).** 노트 번호·정렬이 화면·Export에 필요하면 Question의 `sequenceNumber`에서 파생한다. DB에서는 join 정렬(`decision_notes JOIN questions ... ORDER BY sequence_number`)로 얻는다.

---

## 6. 교차 필드 정합 규칙

`domain-policy.md`의 규칙을 스키마 수준에서 강제한다 (`superRefine` 등 사용).

- Agenda: `status`가 `passed`/`rejected`면 `resolutionReason`은 필수, 그 외 상태면 null이어야 한다.
- Agenda: `status = passed`면 `selectedContent`는 필수다 (auto_consensus 포함).
- SourceAnswer: `status = failed`면 `errorCode`는 필수다.
- SourceAnswer: `status = succeeded`면 `structuredContent`는 필수다.
- SourceAnswer: `excludedFromComparison = true`면 `excludedAt`은 필수다.

---

## 7. 에러 코드 레지스트리 (결정 3-2·3-3)

- `errorCode`·`lastErrorCode` 필드의 타입은 string이지만, **값은 아래 레지스트리에 있는 코드만 사용한다.** 새 코드가 필요하면 이 표를 개정한다 (`errorCodes.ts`에 상수로 정의).
- 실패 상태는 `failed` 하나로 유지한다. 실패의 종류는 상태가 아니라 errorCode로 구분한다 (상태 머신·Enum 변경 없음).
- UI와 콘솔 로그에는 errorCode 원문을 그대로 표시한다 (디버깅 목적, SPEC-UI-001 Step 4의 "실패 안내 문구 + 에러 코드" 방식과 동일).

| errorCode | 의미 |
|---|---|
| `PROVIDER_TIMEOUT` | AI가 제한 시간 내에 응답하지 않음 |
| `PROVIDER_ERROR` | AI API 자체 오류 (인증 실패, 서버 오류 등) |
| `SCHEMA_VALIDATION_FAILED` | 응답은 왔으나 이 계약의 스키마 검증에 실패 |
| `NETWORK_ERROR` | 네트워크 단절·연결 실패 |
| `UNKNOWN_ERROR` | 위 어디에도 분류되지 않는 실패 (최후 수단) |

- 에러 메시지(`errorMessage`)에는 비밀값·내부 정보를 넣지 않는다 (CLAUDE.md 6장).

---

## 8. 검증 실행 지점

| 지점 | 시기 | 동작 |
|---|---|---|
| Mock Service 반환 직전 | **이번 구현** | 스키마 `parse` 수행. 실패 시 조용히 넘기지 않고 즉시 에러로 드러낸다 (결정 3-1) |
| 프론트가 받은 응답 검증 실패 | 이번 구현 (Mock 포함) | 기존 error 상태 UI 재사용 + errorCode 원문 표시 (결정 3-3) |
| Express Controller 경계 (요청) | SPEC-AUTH-003 / API Spec | 같은 스키마로 요청 검증 |
| AI Provider 응답 정규화 | SPEC-AI-001·002 | 검증 실패 시 SourceAnswer `failed` + `SCHEMA_VALIDATION_FAILED`, 기존 재시도 1회 정책에 포함 (결정 3-2) |
| Repository 반환 (DB 응답) | SPEC-DB-001 | 같은 스키마로 검증, snake_case→camelCase 변환 포함 |

---

## 9. 기존 임시 계약에서의 변경점 (구현 지침)

- `apps/web/src/features/chat/types.ts`의 수동 도메인 타입을 `@decision-log/shared`의 `z.infer` 타입으로 대체한다. 중복 정의를 남기지 않는다.
- DecisionNote의 `seq`·`sources` 필드와 그 사용처를 제거한다. 노트 번호 표시가 필요하면 Question `sequenceNumber`에서 파생한다.
- provider의 타입 단언(`as` 캐스팅)을 제거하고 `AiProviderSchema`를 사용한다.
- 충돌 입장(stance) 등 **UI 전용 파생 타입은 `features/chat` 내부에 유지**하고, "SPEC-AI-002에서 정식 계약으로 승격 예정" 주석을 남긴다. shared로 옮기지 않는다.
- Mock 8종 시나리오 데이터가 전부 스키마 검증을 통과하도록 조정한다. 통과하지 못하는 데이터는 계약 위반이므로 데이터 쪽을 고친다 (스키마를 느슨하게 풀지 않는다).
- (2026-07-18 확정 — T-011 계획 검토) **web의 중첩 집합체 뷰는 UI 전용 파생 구조로 유지할 수 있다.** Chat→questions→sourceAnswers 같은 중첩 구조를 평면+ID 조인으로 재작성하지 않는다. 단 집합체를 구성하는 엔티티 타입은 shared의 `z.infer` 타입을 기반으로 조합(교차 타입 등)해야 하며, 평면 엔티티 타입을 web에 중복 정의하지 않는다. 필드명은 계약을 따른다 (`content`→`message`, `sequence`→`sequenceNumber` 등).
- 위에 따라 **Mock 검증(8장, AC5)은 집합체를 통째로 검증하지 않고, 집합체를 구성하는 각 엔티티(Chat·Question·SourceAnswer·Agenda·FinalAnswer·DecisionNote)를 해당 스키마로 개별 parse한다.** 중첩 배열 필드는 검증 대상에서 제외하고 그 안의 엔티티들을 재귀적으로 검증한다.

---

## 10. Acceptance Criteria

- [ ] AC1. `packages/shared` workspace가 신설되고, 런타임 의존성은 zod 하나이며, 루트 `package-lock.json` 하나만 존재한다.
- [ ] AC2. Enum 6종·엔티티 스키마 6종·StructuredContent 골격·에러 코드 레지스트리가 이 Spec의 표와 일치하고, 타입은 전부 `z.infer`로 export된다.
- [ ] AC3. shared가 React, Express, Supabase SDK, AI SDK, 브라우저 전용 API를 import하지 않는다.
- [ ] AC4. `apps/web`의 도메인 타입이 shared 타입으로 대체되고, `seq`·`sources`·provider 캐스팅이 제거된다.
- [ ] AC5. Mock Service가 반환 직전에 스키마 검증을 수행하고, Mock 8종 시나리오가 전부 검증을 통과한다.
- [ ] AC6. 의도적으로 깨뜨린 Mock 데이터로 검증 실패를 일으키면, 기존 error UI에 errorCode 원문이 표시된다 (확인 후 원복).
- [ ] AC7. 루트에서 `npm run typecheck`, `npm run lint`, `npm run build`가 통과한다.
- [ ] AC8. 기존 Mock 시나리오(최소 `happy-path`, `all-rejected`, `provider-excluded`)가 브라우저에서 회귀 없이 동작한다.

---

## 11. 제외 범위와 후속 연결

| 항목 | 다루는 곳 |
|---|---|
| API 봉투(envelope)·HTTP 에러 응답 형식 | API Spec (SPEC-AUTH-003 이후) |
| `sourceRefs`·`recheckResult` 정식 모양, stance 계약 승격 | SPEC-AI-002 (Manager) |
| `StructuredContent` 확장 필드 | SPEC-AI-001 (Provider) |
| 엔티티에 `userId` 포함 여부 | SPEC-AUTH-001~003 |
| snake_case 변환 구현, DB 응답 검증 | SPEC-DB-001 |
| 서버 내부 전용 필드(snapshot류) 스키마 | 백엔드 관련 Spec |

---

## 12. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-17 | 최초 작성. Step 1~3 사용자 결정 반영 (1장 표) |
| 2026-07-18 | 9장 보강 — web 중첩 집합체 뷰는 shared 타입 조합으로 유지(A안), Mock 검증은 엔티티 개별 parse로 명확화 (T-011 계획 검토 시 확정) |
