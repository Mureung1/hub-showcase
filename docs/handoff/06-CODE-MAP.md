# 06. 코드 지도 — 최종 구조

- 기준: 2026-07-31, 전 Spec 구현 완료 시점
- 목적: **저장소를 처음 여는 사람이 어디를 봐야 하는지** 알게 하는 것
- 이 문서는 "무엇이 어디 있나"를 다룬다. "왜 그렇게 됐나"는 `07-BUILD-HISTORY.md`, "어떻게 동작하나"는 `04-MANAGER-AI-LOGIC.md`.

---

## 0. 30초 요약

```text
npm workspaces 모노레포
├── apps/web       React 19 + Vite 8 + react-router 8      (브라우저)
├── apps/api       Express 5 + TypeScript 6                (Node, always-on)
├── packages/shared Zod 4 계약 — web·api가 같은 타입을 본다  (순수, 브라우저 API 무의존)
├── prompts/       LLM 프롬프트 9개 (런타임에 파일로 읽는다)
└── supabase/migrations/  SQL 7개
```

**가장 먼저 열어볼 파일 5개**

| 파일 | 왜 |
|---|---|
| `apps/api/src/modules/agendas/agendas.service.ts` | Manager 파이프라인 오케스트레이션. 이 제품의 심장 |
| `apps/api/src/shared/config/env.ts` | 설정 가능한 것 전부가 한 파일에 있다 |
| `packages/shared/src/schemas/agenda.ts` | 핵심 도메인 객체의 계약 |
| `apps/web/src/features/chat/useChatWorkspace.ts` | 프론트 상태의 거의 전부(약 456줄) |
| `supabase/migrations/20260720120000_init_schema.sql` | 전체 데이터 모델 |

---

## 1. 모노레포 설정

`workspaces: ["apps/*", "packages/*"]`, `overrides: { typescript: ^6.0.0 }`

| script | 내용 |
|---|---|
| `dev` | web + api 동시 실행(concurrently) |
| `build` | **shared → api → web 순서.** 순서가 중요하다 |
| `build:shared` | shared만 |
| `typecheck` / `lint` | 전 워크스페이스 `--if-present` |

> ⚠️ **install·build는 반드시 저장소 루트에서.** `shared`가 루트 install의 `prepare` 단계에서 빌드되기 때문이다. 하위 폴더에서 돌리면 `shared/dist`가 안 생기고 web 빌드가 깨진다. 배포 설정에서 Root Directory·Base directory를 하위로 잡으면 안 되는 이유가 이것이다(`08-OPERATIONS.md`).

### 주요 의존성

**api** — `express ^5.2.1`, `zod ^4.4.3`, `@supabase/supabase-js ^2.110.7`, `@anthropic-ai/sdk ^0.112.5`, `openai ^6.48.0`, `@google/genai ^2.13.0`, `cors`, `dotenv`. dev: `tsx`.

**web** — `react ^19.2.7`, `react-router ^8.2.0`, `vite ^8.1.1`, `zod ^4.4.3`, `jszip ^3.10.1`, `@supabase/supabase-js`, `@astryxdesign/core ^0.1.6`(디자인 시스템, ADR-004).

**shared** — `zod ^4.4.3` **하나뿐**. 의도적이다. 브라우저 API에도 Node API에도 의존하지 않아 양쪽에서 그대로 쓰인다.

---

## 2. apps/api — 서버

```text
apps/api/src/
├── server.ts                  진입점: dotenv → loadEnv() 검증 → listen
├── app.ts                     express 조립: cors(CLIENT_ORIGIN) + json + 라우터 마운트
├── modules/
│   ├── auth/                  JWT 검증 미들웨어, GET /me
│   ├── chats/                 Chat·Question CRUD
│   ├── sourceAnswers/         3사 병렬 호출 (SPEC-AI-001)
│   ├── agendas/               Manager 파이프라인 (SPEC-AI-002)  ← 가장 큼
│   ├── finalAnswers/          최종 답변·결정 기록 (SPEC-AI-003)
│   ├── providerKeys/          BYOK 사용자 키
│   └── health/                GET / — 헬스체크
└── shared/
    ├── config/env.ts          환경변수 zod 스키마 (§6)
    ├── crypto/keyCipher.ts    AES-256-GCM — BYOK 키 암호화
    ├── http/appError.ts       AppError + mapDbError
    ├── http/errorEnvelope.ts  sendError() — {error:{code,message}}
    └── supabase/
        ├── supabaseClient.ts  PUBLISHABLE_KEY — 토큰 검증 전용
        ├── userClient.ts      사용자 토큰 전달 — RLS 적용 (읽기·사용자 쓰기)
        └── adminClient.ts     SECRET_KEY — RLS 우회 (시스템 쓰기)
```

### 2.1 모듈 내부 규약

각 모듈이 같은 4층을 갖는다. **이 규칙이 예외 없이 지켜진다.**

```text
route       →  경로 정의만
controller  →  HTTP 입출력. 요청 파싱·응답 직렬화
service     →  도메인 로직·오케스트레이션. 소유권 검증이 여기 있다
repository  →  Supabase 접근만
```

### 2.2 `modules/agendas/` — Manager 파이프라인

**루트**

| 파일 | 역할 |
|---|---|
| `agendas.service.ts` | `buildAgendaDrafts`(단계 1~5), `runManagerForQuestion`(전체), `applyUserDecision` |
| `agendas.controller.ts` | `getAgendas`(복원), `patchAgenda`(채택/직접입력/제외/재검토) |
| `agendas.repository.ts` | insertDrafts · updateJudged · findOwnedAgenda · applyUserDecision · saveManagerMeta 등 |
| `agendas.types.ts` | `ClassifyOutputSchema` · `CompareOutputSchema` · `ManagerQualityMetrics` 등 |
| `managerPrompts.ts` | `<MANAGER_PROMPTS_DIR>/<kind>/<version>.md` 런타임 로더 + 캐시 |

**`pipeline/` — 순수 로직. LLM이 아니라 코드가 계산하는 부분이 전부 여기 있다**

| 파일 | 단계 | 역할 |
|---|---|---|
| `pickPivot.ts` | 1 | `fnv1a` 해시로 pivot 선택. **`Math.random()` 미사용 — 재현 가능** |
| `shuffle.ts` | 2 | `mulberry32` 시드 셔플. 입력 순서에 의한 위치 편향 제거 |
| `suspiciousTitle.ts` | 2 | 편향된 제목 정규식 필터 |
| `concurrency.ts` | 5.1 | `mapWithConcurrency` — 순서 보존 동시성 제한 |
| `postProcess.ts` | 5 | `finalizeDrafts` — 참여자 수·title/summary·displayOrder를 **코드가** 계산 |
| `judge.ts` | 6 | `judgeDrafts` — Comparator 호출 오케스트레이션 |
| `grounding.ts` | 6·11 | `groundStances` — 인용이 해당 provider 자기 섹션의 부분문자열인지 검증. **실패하면 폐기** |
| `finalize.ts` | 7 | `finalizeAgenda` · `mapDisagreementToKind` — 합의/충돌 매핑 |
| `recheck.ts` | 10 | `verifyRecheckResult` — 재검토 결과 인용 검증 |

**`ports/` — ADR-005 헥사고날 경계 (총 7개 포트)**

| 포트 | 위치 | 하는 일 |
|---|---|---|
| `ProviderClient` | sourceAnswers | 3사 LLM 호출 |
| `AnswerPromptTemplate` | sourceAnswers | 답변 프롬프트 로딩 |
| `AnswerNormalizer` | sourceAnswers | 원응답 → StructuredContent |
| `AgendaClassifier` | agendas | 단계 3·4 — 섹션 정렬·leftover |
| `ConflictComparator` | agendas | 단계 6 — 쟁점별 관찰 |
| `AgendaRechecker` | agendas | 재검토 — **판정이 아니라 설명** |
| `FinalAnswerComposer` | finalAnswers | 최종 답변·노트 생성 |

> 포트를 7개까지 쪼갠 이유는 **입출력이 겹치지 않기 때문**이다. 예를 들어 `AgendaRechecker`를 `ConflictComparator`에 합치지 않은 것은, 재검토가 판정을 번복하지 않고 **설명만** 하기 때문이다(도메인 정책). 인터페이스를 합치면 이 제약이 코드에서 사라진다.

**`adapters/`** — `openRouterCall.ts`(공통부: `buildRequestBody` · `withOneRetry` · `parseOutput`)와 포트별 구현 3개, 그리고 `*.registry.ts`(활성 구현 선택 + 싱글턴 캐시).

**`scripts/`** — `classify.ts` · `judge.ts`. 프로덕션 경로에 연결돼 있지 않은 **검증 전용 CLI**다. `npm run manager:classify` 로 파이프라인 일부만 떼어 돌린다. 지연·토큰 실측이 전부 여기서 나왔다.

### 2.3 `modules/finalAnswers/`

| 파일 | 역할 |
|---|---|
| `finalAnswers.service.ts` | `composeForQuestion` · `composeIfSettled` · `buildContextForQuestion` |
| `pipeline/generationMode.ts` | `decideGenerationMode` — **LLM에 묻지 않고 코드가 결정한다** |
| `pipeline/context.ts` | `buildContext` — 이전 결정을 다음 질문의 맥락으로 (연속 질문의 핵심) |
| `pipeline/fallbackNote.ts` | AI 실패 시 **코드가** 만드는 대체 DecisionNote |
| `finalAnswers.types.ts` | `ComposeOutputSchema` · `ALL_REJECTED_CONTENT` · `FALLBACK_NOTE_VERSION` |

### 2.4 `modules/sourceAnswers/`

| 파일 | 역할 |
|---|---|
| `sourceAnswers.service.ts` | `prepareGeneration` · `runGeneration` — 3사 병렬 |
| `providers/{claude,openai,gemini}.ts` | 각 SDK 구현 |
| `providers/withTimeout.ts` | `PROVIDER_TIMEOUT_MS = 45000` |
| `providers/errors.ts` | SDK 오류 → errorCode 5종 매핑 |
| `byok.ts` | 사용자 키 우선, 없으면 앱 키 |
| `normalizer.ts` | 원응답 → StructuredContent |

---

## 3. apps/web — 프론트엔드

```text
apps/web/src/
├── main.tsx           StrictMode · BrowserRouter · Theme · AuthProvider
├── App.tsx            라우팅
├── WorkspacePage.tsx  메인 3-패널 조립
├── lib/
│   ├── apiClient.ts        fetch 래퍼 + zod 파싱 + SSE 구독
│   ├── apiStorageAdapter.ts apiClient를 도메인 동작 단위로 감쌈
│   └── supabase.ts         Auth 전용 클라이언트
└── features/
    ├── auth/          로그인·가입·가드·세션
    ├── chat/          질문·답변·쟁점 — 핵심 화면
    └── decision-log/  결정 기록 패널 + Export
```

### 계층 규칙 (`CLAUDE.md` 7장)

```text
컴포넌트  →  Hook  →  adapter  →  apiClient
```

**컴포넌트는 `fetch`를 직접 부르지 않는다.** 예외 없다.

### 주요 파일

| 파일 | 역할 |
|---|---|
| `features/chat/useChatWorkspace.ts` | **상태의 거의 전부.** 약 456줄. 채팅·질문·SSE 스트림 오케스트레이션 |
| `features/chat/AnswerCard.tsx` | 쟁점 카드 |
| `features/chat/ConflictResolveModal.tsx` | 충돌 판단 UI — 채택/직접입력/제외/재검토 |
| `features/chat/FinalAnswerBlock.tsx` | 최종 답변 |
| `features/chat/scenarios.ts` | `?scenario=` Mock 시나리오. **`happy-path`는 Mock이 아니라 서버 경로다** (실수 유발 지점) |
| `features/decision-log/exportMarkdown.ts` | MD 조립·파일명 정규화. **DOM 무의존** → Node에서 검증 가능 |
| `features/decision-log/buildZip.ts` | JSZip 조립. exportMarkdown과 **의도적으로 분리**(검증 스크립트가 jszip을 안 끌어오도록) |
| `features/decision-log/downloadBlob.ts` | Blob 다운로드. `finally`에서 `revokeObjectURL` |

---

## 4. packages/shared — 계약

| 파일 | 주요 타입 |
|---|---|
| `schemas/enums.ts` | `QuestionStatus` · `AgendaStatus` · `AgendaResolutionReason`(8값) · `AgendaKind` · `AgendaDisagreementType` · `FinalAnswerGenerationMode` · `AiProvider` |
| `schemas/agenda.ts` | `Agenda` · `AgendaStance` · `SourceRef` · `AgendaCitation` · `AgendaRecheckResult` |
| `schemas/sourceAnswer.ts` | `SourceAnswer` · `StructuredContent` · `Section` · `ResponseMeta` |
| `schemas/questionStream.ts` | **SSE 이벤트 유니온** — `source_answer.updated/done` · `agenda.created/judged/done` · `final_answer.progress/done` |
| `schemas/finalAnswer.ts` / `decisionNote.ts` / `chat.ts` / `question.ts` | 각 엔티티 |
| `schemas/errorCodes.ts` / `responseEnvelope.ts` | 오류 코드 레지스트리·응답 봉투 |
| `constants/noValue.ts` | `NO_VALUE` 센티널 |

> **Mock 데이터도 이 스키마를 통과해야 한다.** `features/chat/mockValidation.ts`가 개발 중 이를 검사하고, 실패하면 화면에 배너를 띄운다. Mock과 실물이 갈라지는 것을 막는 장치다.

---

## 5. supabase/migrations

| 파일 | 내용 |
|---|---|
| `20260720120000_init_schema.sql` | enum 6종 + 테이블 7개 + 인덱스·CHECK + `updated_at` 트리거 + 전 테이블 RLS enable |
| `20260720120100_grants.sql` | `authenticated`·`service_role` GRANT + default privileges |
| `20260720120200_next_question_rpc.sql` | `create_next_question` — `sequence_number`를 원자적으로 max+1 |
| `20260722120000_source_answers_response_meta.sql` | `response_meta jsonb` |
| `20260730120000_agenda_manager_enums.sql` | `auto_single_source` 추가 + `agenda_kind`·`agenda_disagreement_type` |
| `20260730120100_agenda_manager_columns.sql` | agendas에 kind·disagreement_type·revised_type·confidence·display_order, questions에 manager_meta, CHECK 개정 |
| `20260730120200_agenda_stances.sql` | `agendas.stances jsonb` + 개수 CHECK |

> **GRANT 마이그레이션이 따로 있는 이유** — RLS만으로는 부족하다. 마이그레이션으로 만든 테이블에 `authenticated`·`service_role` DML GRANT가 없으면 `permission denied`가 난다. T-015에서 실제로 겪었다.

적용: `supabase db push --db-url "$SUPABASE_DB_URL"`. `SUPABASE_DB_URL`은 **런타임 env에 넣지 않는다** — 마이그레이션 전용이다.

---

## 6. 환경변수 전체 (`apps/api/src/shared/config/env.ts`)

**필수 (없으면 서버가 기동하지 않는다)**

| 변수 | 비고 |
|---|---|
| `SUPABASE_URL` | |
| `SUPABASE_PUBLISHABLE_KEY` | |
| `SUPABASE_SECRET_KEY` | 시스템 쓰기용. 프론트에 절대 두지 않는다 |
| `AI_KEY_ENCRYPTION_KEY` | base64 32바이트. `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | **Manager 전용** |
| `MANAGER_MODEL` | 예: `qwen/qwen3.7-plus` |
| `ANTHROPIC_API_KEY` · `OPENAI_API_KEY` · `GEMINI_API_KEY` | `APP_DEFAULT_AI_KEYS_ENABLED=true`(기본)일 때 조건부 필수 |

**기본값 있음**

| 변수 | 기본값 |
|---|---|
| `PORT` | `4000` (Render가 주입하므로 직접 설정 금지) |
| `CLIENT_ORIGIN` | `http://localhost:5173` |
| `APP_DEFAULT_AI_KEYS_ENABLED` | `true` |
| `ANSWER_PROMPTS_DIR` | `<repo>/prompts` |
| `MANAGER_PROMPTS_DIR` | `<repo>/prompts/manager` |
| `ANSWER_PROMPT_VERSION` · `ANSWER_NORMALIZER_VERSION` | `v1` |
| `CLASSIFIER_` · `COMPARATOR_` · `RECHECKER_` · `COMPOSER_PROMPT_VERSION` | `v1` |
| `CLAUDE_MODEL` | `claude-haiku-4-5` |
| `OPENAI_MODEL` | `gpt-5-nano` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` |
| `CONTEXT_MAX_NOTES` | `5` |
| `MANAGER_CONFLICT_TYPES` | `main_answer` |
| `MANAGER_CONCURRENCY` | `3` |
| `MANAGER_TIMEOUT_MS` | `45000` (단계 3·4) |
| `MANAGER_JUDGE_TIMEOUT_MS` | `120000` (단계 6·재검토) |
| `MANAGER_JUDGE_REASONING_EFFORT` | `low` — **단계 6에만** 적용 |

---

## 7. API 라우트 전체

`/api/chats` 하위는 **전부 `requireAuth` 통과 필요**.

| 메서드 | 경로 |
|---|---|
| GET | `/api/health/` |
| GET | `/api/auth/me` |
| GET · POST | `/api/chats/` |
| GET · POST | `/api/chats/:chatId/questions` |
| PATCH | `/api/chats/:chatId/questions/:questionId` |
| POST | `/api/chats/:chatId/questions/:questionId/source-answers` — **SSE 스트림 시작** |
| GET | `/api/chats/:chatId/questions/:questionId/source-answers` — 복원 스냅샷 |
| GET | `/api/chats/:chatId/questions/:questionId/agendas` |
| PATCH | `/api/chats/:chatId/questions/:questionId/agendas/:agendaId` |
| GET | `/api/chats/:chatId/questions/:questionId/final-answer` — 폴링·복원 공용 |

> **엔드포인트가 11개뿐이다.** SSE 하나로 생성 전 과정을 밀고, 나머지는 복원·판단 반영이다. 폴링 엔드포인트가 따로 없고 `final-answer` GET이 겸한다.

---

## 8. prompts/ — 9개

| 파일 | 쓰이는 곳 |
|---|---|
| `answer/claude/v1.md` · `answer/openai/v1.md` · `answer/gemini/v1.md` | 3사 답변 생성 |
| `manager/classify/v1.md` | 단계 3 — 섹션을 쟁점 단위로 정렬 |
| `manager/leftover/v1.md` | 단계 4 — 누락 회수 + 제목 중립화 |
| `manager/compare/v1.md` | 단계 6 — 쟁점별 관찰 (**판정은 코드가 계산**) |
| `manager/recheck/v1.md` | 재검토 — 설명만, 번복 없음 |
| `manager/final/v1.md` | 최종 답변 종합 |
| `manager/finalNote/v1.md` | 결정 기록 |

> 프롬프트는 **런타임에 파일로 읽는다.** 문구만 고치면 재빌드가 필요 없다. 단, 프로세스 내 캐시가 있어 **재기동해야 반영**된다.

---

## 9. 보안 불변식 3종

전수 조사로 확인된 것들이다. 코드를 고칠 때 이 셋을 깨지 마라.

**① 클라이언트가 보낸 `userId`는 어느 경로에서도 신뢰하지 않는다**
body·params·query·헤더에서 userId를 읽는 곳이 0건이다. 신원 주입은 `auth.middleware.ts`의 단일 지점(80~84행)에서만 일어난다.

**② `adminClient`(RLS 우회) 사용 전에 반드시 소유권을 검증한다**
프로덕션 경로 전수 추적 결과, `adminClient`는 RLS를 타는 `findOwnedQuestion`·`findOwnedAgenda` 통과 후에만 도달한다. ADR-002의 클라이언트 이원화가 지켜지는 방식이다.

**③ 키는 백엔드 env에만 있다**
프롬프트·에러 응답·로그·SSE 이벤트 어디에도 키가 들어가지 않는다. BYOK 사용자 키는 AES-256-GCM으로 암호화해 저장한다. Manager는 BYOK 대상이 아니라 앱 키만 쓴다.

> ⚠️ 하나 예외가 있다. `features/auth/LoginPage.tsx`에 **데모 계정 자격증명이 하드코딩**돼 있다. 의도된 것이고 주석에 명시돼 있으나, 번들에 노출되므로 **그 계정에 민감 데이터를 두면 안 된다.** `09-LIMITS-AND-BACKLOG.md` 참조.
