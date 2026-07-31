# 05. 기술 구조

> **[2026-07-31 갱신 안내]**
> 아키텍처 원칙·데이터 모델·인증 구조는 유효하다. **실제 파일 구조·환경변수·API 라우트 전체 목록은 `06-CODE-MAP.md`에 최종본이 있다.** 배포 절차는 `08-OPERATIONS.md`가 최신이다.
> 이 묶음은 6개 → **10개**로 늘어났다. `00-INDEX.md`를 먼저 보라.

---

## 1. 시스템 구성

```text
┌──────────────────────────────────────────────────────────┐
│ apps/web  —  React + Vite + TypeScript                   │
│ · Astryx 디자인 시스템                                    │
│ · Supabase Auth Client (인증 기능에 한해서만 직접 사용)     │
│ · storageAdapter 추상화 (localStorage → apiStorageAdapter) │
└────────────────────┬─────────────────────────────────────┘
                     │ Authorization: Bearer <access-token>
                     ↓
┌──────────────────────────────────────────────────────────┐
│ apps/api  —  Node.js + Express + TypeScript              │
│                                                          │
│  Route → Auth Middleware → Service → Repository          │
│                              ↓                           │
│                        AI Pipeline                       │
│                     (5개 포트 · ADR-005)                  │
└──────┬──────────────────────────────────┬────────────────┘
       ↓                                  ↓
┌─────────────────┐          ┌────────────────────────────┐
│ Supabase        │          │ 외부 AI API                 │
│ · PostgreSQL    │          │ · Claude / OpenAI / Gemini  │
│ · Auth          │          │ · OpenRouter (Manager)      │
│ · RLS           │          └────────────────────────────┘
└─────────────────┘

┌──────────────────────────────────────────────────────────┐
│ packages/shared  —  Zod 공통 계약                         │
│ · web·api가 같은 스키마를 import                          │
│ · React/Express/Supabase SDK/AI SDK에 의존하지 않음        │
└──────────────────────────────────────────────────────────┘
```

### 1.1 모노레포 구조

```text
apps/web/           React + Vite
apps/api/           Express
packages/shared/    Zod 계약 (양쪽이 import)
supabase/migrations/
prompts/            AI 프롬프트 (버전 관리)
docs/
showcase/
```

npm Workspaces. 빌드 순서는 `shared → api → web`.

---

## 2. 백엔드 계층

```text
Route          HTTP 경계. 요청/응답 형태만 다룬다
  ↓
Middleware     인증·검증
  ↓
Service        도메인 규칙. 소유권 확인. 트랜잭션 경계
  ↓
Repository     DB 접근. snake_case ↔ camelCase 변환. Zod 검증
  ↓
Supabase
```

### 2.1 모듈 구성 (`apps/api/src/modules/`)

| 모듈 | 역할 |
|---|---|
| `auth` | 인증 미들웨어 |
| `chats` | Chat·Question CRUD |
| `sourceAnswers` | 3사 AI 호출 파이프라인 (**포트·어댑터 참고 패턴**) |
| `providerKeys` | BYOK 키 암호화 저장 |
| `health` | 헬스체크 |
| `agendas` | **Manager AI 파이프라인 (신설 중)** |

`sourceAnswers`가 포트·어댑터·레지스트리·오케스트레이션을 갖춘 참고 패턴이다.

---

## 3. 인증과 권한

### 3.1 인증 흐름

```text
React → Supabase Auth → Access Token 발급·갱신
React → Authorization: Bearer <token> → Express Auth Middleware
      → 토큰 검증 → userId 확보 → Service
```

- 이메일 + 비밀번호
- **이메일 인증 완료가 서비스 이용의 필수 조건** (ADR-001)
- 사용자 식별자는 `auth.users.id`
- 로그인·인증 미완 사용자는 Chat·Question을 생성할 수 없다

### 3.2 데이터 접근 클라이언트 이원화 (ADR-002)

**배경**: SourceAnswer·Agenda·FinalAnswer는 사용자가 아니라 Express의 AI 파이프라인이 저장한다. AI 호출은 요청 수명보다 길어질 수 있어 **사용자 JWT를 보관해 시스템 쓰기에 쓰는 것은 만료·보안 위험**이 있다. 반대로 모든 접근을 Secret Key로 처리하면 **RLS가 무력화된다.**

**결정**

| 접근 유형 | 클라이언트 | RLS |
|---|---|---|
| 조회 | 사용자 JWT Client | 적용됨 |
| **사용자 행동에 의한 쓰기** (채택·제외·재검토 요청) | 사용자 JWT Client | 적용됨 |
| **AI 파이프라인 시스템 쓰기** (SourceAnswer·Agenda 저장) | **Secret Key Client** | 우회 |

Secret Key를 쓸 때는 **Service 계층이 검증된 JWT의 userId로 대상의 소유권을 확인한 뒤에만** 수행한다.

**클라이언트가 보낸 userId는 어느 경로에서도 신뢰하지 않는다.**

### 3.3 RLS

PostgreSQL Row Level Security로 사용자별 데이터를 격리한다. 행 단위 정책이므로 **컬럼을 추가해도 영향받지 않는다**(GRANT는 테이블 단위).

---

## 4. 데이터 모델

### 4.1 주요 테이블

```text
auth.users  (Supabase 관리)
   ↓
chats
   ↓
questions ──────┬──→ source_answers
                ├──→ agendas
                ├──→ final_answers   (question당 1개, unique)
                └──→ decision_notes
```

### 4.2 `agendas` 테이블

이 제품의 중심 테이블이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | uuid | PK |
| `question_id` | uuid | FK, cascade |
| `status` | `agenda_status` | 상태 머신 |
| `resolution_reason` | `agenda_resolution_reason` | 왜 이 상태가 됐는가 |
| `title` | varchar(200) NOT NULL | 쟁점 제목 (중립 명사구) |
| `summary` | text NOT NULL | 요약 |
| `selected_content` | text | 확정된 내용 |
| `selected_source_ref` | jsonb | 그 내용이 온 곳 |
| `user_note` | text | 사용자 메모 |
| `source_refs` | jsonb NOT NULL | **비교한 모든 근거** |
| `stances` | jsonb | AI별 입장 + 원문 인용 |
| `kind` | `agenda_kind` | consensus / conflict / single_source |
| `disagreement_type` | `agenda_disagreement_type` | 1차 판정 유형 |
| `revised_type` | `agenda_disagreement_type` | 재검토 후 유형 |
| `confidence` | numeric(3,2) | 판정 확신도 (관측용) |
| `display_order` | smallint | 표시 순서 |
| `prompt_version` | varchar(100) | 판정 기준 프롬프트 버전 |
| `recheck_request` / `recheck_result` | text / jsonb | 재검토 |
| `recheck_requested_at` / `reanswered_at` / `resolved_at` | timestamptz | 이력 |

### 4.3 Enum

```text
agenda_status
  draft · conflicted · recheck_requested · reanswered · passed · rejected

agenda_resolution_reason
  auto_consensus · auto_single_source
  user_accepted · user_accepted_after_recheck
  user_composed · user_composed_after_recheck
  user_rejected · user_rejected_after_recheck

agenda_kind
  consensus · conflict · single_source

agenda_disagreement_type
  paraphrasing · detail_expansion · detail_volume · detail_content · main_answer

ai_provider
  claude · openai · gemini

final_answer_generation_mode
  multi_source · single_source_fallback · all_agendas_rejected
```

### 4.4 CHECK 제약 — 정합성을 DB가 강제한다

```sql
-- 상태 ↔ resolution_reason
status IN ('draft','conflicted','recheck_requested','reanswered')
  → resolution_reason IS NULL
status IN ('passed','rejected')
  → resolution_reason IS NOT NULL

-- passed면 내용 필수
status = 'passed' → selected_content IS NOT NULL

-- 출처 참조의 값 부재 규칙
status IN ('draft','conflicted','recheck_requested','reanswered')
  → selected_source_ref IS NULL
resolution_reason IN ('auto_consensus','auto_single_source',
                      'user_accepted','user_accepted_after_recheck')
  → selected_source_ref = 실제 참조 (NOT NULL, 'NO_VALUE' 아님)
resolution_reason IN ('user_composed','user_composed_after_recheck',
                      'user_rejected','user_rejected_after_recheck')
  → selected_source_ref = '"NO_VALUE"'::jsonb
```

### 4.5 값 부재 규칙 — `null` vs `NO_VALUE`

| 값 | 의미 |
|---|---|
| `null` | **미상** — 아직 정해지지 않음 |
| `"NO_VALUE"` | **의도적 없음** — 정해진 결과가 "없음"임 |

`NO_VALUE`는 `packages/shared`의 상수다.

**부수 효과**: `auto_consensus`가 실제 참조를 갖게 되면서 **`NO_VALUE`는 사용자 행동에서만 발생하는 값**이 됐다. 데이터만 보고 AI 생성인지 사람 작성인지 구분된다.

### 4.6 JSONB 사용 범위

정규화하지 않고 JSONB로 두는 것은 한정한다.

- `agendas.source_refs` · `stances` · `selected_source_ref` · `recheck_result`
- `questions.context_snapshot` · `manager_meta`
- `source_answers.structured_content` · `response_meta`
- `final_answers.input_snapshot`

---

## 5. 공통 계약 (`packages/shared`)

### 5.1 원칙

- **Mock 데이터와 실제 API 응답이 같은 Zod 스키마를 만족해야 한다**
- 외부 데이터는 실행 시점에 검증한다
- `packages/shared`는 React/Express/Supabase SDK/AI SDK/브라우저 API에 의존하지 않는다

### 5.2 파일 구성

```text
packages/shared/src/
├── constants/noValue.ts
└── schemas/
    ├── enums.ts            상태·유형 Enum
    ├── errorCodes.ts       오류 코드 레지스트리 (5종)
    ├── responseEnvelope.ts API 응답 봉투
    ├── chat.ts / question.ts / chatApi.ts
    ├── sourceAnswer.ts     StructuredContent · Section
    ├── questionStream.ts   SSE 이벤트 (5종 discriminated union)
    ├── agenda.ts           Agenda · Stance · SourceRef · RecheckResult
    ├── finalAnswer.ts
    └── decisionNote.ts
```

### 5.3 교차 필드 정합은 `superRefine`으로

Zod 스키마 수준에서 상태 조합의 정합성을 강제한다.

```text
status가 passed/rejected면 resolutionReason 필수
status가 passed면 selectedContent 필수
kind가 single_source면 resolutionReason은 auto_single_source
status가 conflicted면 selectedContent·selectedSourceRef는 null
자동통과·채택형 → selectedSourceRef는 실제 참조
직접입력·제외형 → selectedSourceRef는 NO_VALUE
```

**DB CHECK와 Zod superRefine이 같은 규칙을 이중으로 강제한다.**

### 5.4 `StructuredContent` — 3사 답변의 공통 형태

```text
{
  summary: string,
  sections: [{
    sectionId: string,   ← 안정 식별자. 근거 추적의 기반
    title: string,
    content: string,
    order: number,
    kind: string
  }]
}
```

`sectionId`가 이 제품의 근거 추적 전체를 떠받친다. Agenda의 `sourceRefs`·`stances[].quotes`가 전부 이 ID로 원문을 가리킨다.

---

## 6. AI 파이프라인 (ADR-005)

### 6.1 5개 포트

| # | 포트 | 관심사 | Spec |
|---|---|---|---|
| 1 | Provider 호출 | 각 AI API를 어떻게 부르는가 | AI-001 |
| 2 | 답변 프롬프트 | 3사에게 무엇을 시키는가 | AI-001 |
| 3 | Section 정규화 | 원문을 어떻게 구조화하는가 | AI-001 |
| 4 | AgendaClassifier | 어떤 기준으로 쟁점을 나누는가 | AI-002 |
| 5 | ConflictComparator | 무엇을 충돌로 볼 것인가 | AI-002 |

각 포트는 안정된 입출력 계약과 `version` 문자열을 갖고, 사용한 버전이 결과에 스탬프된다.

### 6.2 프롬프트 관리

```text
prompts/
├── answer/{claude,openai,gemini}/v1.md
└── manager/
    ├── classify/v1.md
    ├── leftover/v1.md
    ├── compare/v1.md
    └── recheck/v1.md
```

런타임에 읽는 텍스트 템플릿. 코드에 하드코딩하지 않는다.

**배포 주의**: `/prompts`가 저장소 루트에 있어야 한다. Render Root Directory를 `apps/api`로 잡으면 프롬프트가 배포에서 빠져 생성이 전부 실패한다(실제 겪은 사고).

---

## 7. SSE 스트리밍

3사 답변과 Manager 결과를 실시간으로 흘린다.

```text
POST 요청 → 응답을 text/event-stream으로 열기
        → fetch ReadableStream으로 소비
        → 15초 heartbeat (무음 구간 대비)
```

| 이벤트 | 시점 |
|---|---|
| `source_answer.updated` | provider 상태 변화마다 |
| `source_answer.done` | 3사 완료 |
| `agenda.created` | 쟁점 목록 확정 |
| `agenda.judged` | 쟁점 판정마다 |
| `agenda.done` | Manager 완료 |

**끊김 화해**: `*.done` 스냅샷 없이 스트림이 닫히면 GET으로 재조회한다.

---

## 8. 환경변수

```env
# 서버
PORT=4000
CLIENT_ORIGIN=http://localhost:5173

# Supabase
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=          # RLS 우회 시스템 쓰기용
SUPABASE_DB_URL=              # 마이그레이션 전용, 런타임 미사용

# 암호화
AI_KEY_ENCRYPTION_KEY=        # AES-256-GCM, base64 32바이트

# 3사 AI
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# Manager AI
OPENROUTER_API_KEY=
MANAGER_MODEL=qwen/qwen3.7-plus
```

- 전부 **백엔드 전용**. `apps/web`에 두면 Vite가 브라우저 번들에 노출한다
- 서버 시작 시 **Zod로 검증**하고, 없으면 명확한 메시지로 기동 실패
- `.env`는 gitignore, `.env.example`만 커밋

---

## 9. 보안 규칙

| 규칙 |
|---|
| React에서 외부 AI API를 직접 호출하지 않는다 |
| 서비스 데이터 조회·저장은 반드시 Express를 거친다 |
| 클라이언트가 보낸 userId를 신뢰하지 않는다 |
| 키·비밀값을 로그·에러 응답·프롬프트·SSE에 넣지 않는다 |
| BYOK 키는 AES-256-GCM으로 암호화해 저장 |
| Manager는 BYOK 대상이 아니다 (앱 키만) |
| 프롬프트 인젝션은 구분 블록 + enum 제약 + 인용 검증으로 방어 |

---

## 10. 배포

| 대상 | 플랫폼 |
|---|---|
| web | Render (정적) |
| api | Render (Node) |
| DB·Auth | Supabase |

**주의점**

- Render 무료 플랜은 cold start가 30~60초 — 사용자 대기 시간 추정에 반영해야 한다
- Root Directory 설정에 따라 `/prompts`가 빠질 수 있다

---

## 11. 검증 방식

### 11.1 명령

```bash
npm run typecheck    # 루트, shared → api → web
npm run lint         # web (api는 script 없음)
npm run build
```

### 11.2 마이그레이션

```bash
supabase db push --db-url "$SUPABASE_DB_URL" --yes
```

적용 후 psql로 컬럼·Enum·CHECK·RLS 정책을 직접 확인한다.

**주의**: `ALTER TYPE ... ADD VALUE`로 추가한 Enum 값은 같은 트랜잭션에서 사용할 수 없다. 마이그레이션 파일을 분리해야 한다.

### 11.3 브라우저 회귀 시나리오

`?scenario=` 쿼리로 Mock 흐름을 태운다.

| 시나리오 | 확인 |
|---|---|
| `happy-path` | 3사 SSE → Agenda → 충돌 해소 → FinalAnswer → 노트 → completed |
| `recheck-path` | 재검토 요청 → 결과 렌더 → 채택 |
| `provider-excluded` | 제외 배너, 성공 2사로 구성 |
| `all-rejected` | 고정 문구 |
| `single-source-fallback` | 자동 통과, "단일 답변" 중립 라벨 |

**공통**: `MockValidationBanner` 미발생(Mock이 계약을 어기면 뜬다), 콘솔 오류 없음.

### 11.4 검증 철학

- **실행하지 않은 검사를 통과했다고 보고하지 않는다**
- 미확인은 이유와 함께 미확인으로 남긴다
- **의도적으로 깨뜨려 확인한다** — 예: 날조한 인용을 주입해 폐기되는지, Mock을 고의로 깨뜨려 검증 배너가 뜨는지

마지막이 중요하다. 근거 검증은 코드가 있다고 되는 게 아니라 **깨뜨려봐야 확인된다.**
