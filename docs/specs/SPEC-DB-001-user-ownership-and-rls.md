# SPEC-DB-001. 사용자 소유권·RLS·Migration (DB 영속화)

- 상태: **완료 (2026-07-22 — T-015 구현 + AC1~AC6 실측 PASS)**
- 기준 문서: `CLAUDE.md` 2·5·6·8장, `docs/data-model.md`(전체), `docs/decisions/ADR-002-data-access-clients.md`, `docs/decisions/ADR-001-supabase-auth.md`, `docs/architecture.md` 4·6·7장, `docs/dev-setup.md`, `docs/specs/SPEC-AUTH-003-api-auth-middleware.md`
- 작성 방식:
  - 0장 "고정 사항"은 확정된 정책·데이터 모델에서 온 것이며, 이 Spec에서 임의로 바꾸지 않는다.
  - 1장 "결정 사항"은 사용자가 직접 결정했다. Agent는 질문과 선택지를 제시하고 결정을 받아 적었다.

---

## 0. 고정 사항 (정책·데이터 모델 확정)

### 0.1 한 줄 목표

Supabase에 서비스 테이블·제약·RLS를 마이그레이션으로 구축하고, 웹의 Chat·Question을 Mock/브라우저 메모리에서 실제 DB(Express→Supabase) 저장·조회로 옮긴다. AI 생성물(SourceAnswer·Agenda·FinalAnswer·DecisionNote)의 서버 생성·저장은 각 AI Spec에서 이어받는다. BYOK 사용자 키 저장 토대(`user_provider_keys` 테이블·암호화)도 이번에 세운다.

### 0.2 기존 문서에서 오는 고정 규칙

- 테이블·제약·Index·Enum은 `docs/data-model.md` 3·4장 초안 그대로 구현한다(chats·questions·source_answers·agendas·final_answers·decision_notes). List 필드는 외래키로, 중복 저장 금지, JSONB 사용 범위는 data-model 1.5.
- 소유권 경로는 `auth.users.id → chats.user_id → 하위(question_id·chat_id join)`. 하위 테이블에 `user_id`를 중복 저장하지 않고, **RLS는 `chats.user_id`까지 join(EXISTS)로 소유권을 검사한다**(data-model 5, ADR-002).
- `chats.user_id` ON DELETE RESTRICT, 하위 FK는 ON DELETE CASCADE, `UNIQUE (chat_id, sequence_number)`, `UNIQUE (question_id, provider)`, `final_answers`·`decision_notes`는 `UNIQUE (question_id)`, 미완료 Question 1개 Partial Unique Index, `message` 길이 CHECK(1~1000) 등 data-model 3장 제약 전부.
- `updated_at`은 DB Trigger(`moddatetime` 등)로 자동 갱신한다. 애플리케이션 코드가 개별 갱신하지 않는다(data-model 1.3).
- **2-클라이언트(ADR-002)**: 조회·사용자 행동 쓰기 = 사용자 JWT 전달 Supabase Client(RLS 적용) / AI 파이프라인 시스템 쓰기 = Secret Key Client + Service 계층에서 검증된 userId로 소유권 확인 후에만. Secret Key 사용 범위는 시스템 쓰기 밖으로 확장 금지.
- Express는 클라이언트가 전달한 `user_id`를 신뢰하지 않고, 검증된 Supabase JWT(SPEC-AUTH-003의 `req.auth.userId`)에서만 사용자 ID를 얻는다.
- 서비스 데이터는 React가 직접 Supabase로 조회·저장하지 않고 Express API를 거친다. `storageAdapter`는 Promise 기반, 컴포넌트에서 `localStorage`·SDK 직접 호출 금지(CLAUDE.md 6·7).
- Supabase Secret Key·Service Role Key·암호화 마스터 키는 백엔드 env에만. 프론트에는 URL·Publishable Key만. 실제 `.env` 커밋 금지.
- 외부 데이터(DB 응답 포함)는 Zod로 검증한다. Repository가 반환하는 데이터도 검증한다(CLAUDE.md 5·8). Mock과 실제 응답은 같은 `@decision-log/shared` 계약을 만족한다.
- 회원 탈퇴·계정 삭제는 MVP 제외(ADR-001). request_snapshot에 API Key·비밀값 저장 금지(data-model 3.2).

### 0.3 제외 범위

- AI 생성물(SourceAnswer·Agenda·FinalAnswer·DecisionNote)의 **서버 생성·저장** (→ SPEC-AI-001·002·003). 이 Spec에서 이들은 브라우저 Mock 유지(0.4 한계).
- BYOK 사용자 키 **입력 UI·검증·실제 AI 호출 사용** (→ 설정 Spec + SPEC-AI-001). 이 Spec은 저장·복호 경로와 테이블만.
- 실제 AI Provider 호출·Manager·FinalAnswer 생성 로직 (→ AI Spec).
- 계정 삭제 기능·데이터 정리(ADR-001 제외). `ON DELETE RESTRICT` 유지로 데이터 있는 사용자 삭제를 막는 수준까지만.
- Export/Zip (→ SPEC-EXPORT-001).

### 0.4 이 단계의 한계 (명시)

Chat·Question은 실제 저장·복원되지만, AI 생성물은 아직 브라우저 Mock·비영속이다. 따라서 이 Spec 완료 시점에는 **옛 Chat을 다시 열면 Question은 복원되나 AI 답변·Agenda·FinalAnswer·DecisionNote는 복원되지 않는다.** 이는 의도된 증분이며 각 AI Spec이 해당 생성물을 서버로 옮기며 해소한다.

---

## 1. 결정 사항 요약 (사용자 확정, 2026-07-20)

| # | 질문 | 결정 |
|---|---|---|
| 1-1 | DB-001 이전 범위 | **(a) 토대 전체 + 사용자 데이터부터** — 스키마·RLS·2-클라이언트·저장소 계층을 전부 세우되, 웹 실저장은 Chat·Question(사용자 작성)까지. AI 생성물 저장은 각 AI Spec |
| 1-2 | BYOK 키 테이블 시점 | **(a) DB-001에 포함** — `user_provider_keys` 테이블·RLS·암호화 방식을 이번에. 입력 UI·사용은 후속 |
| 2-1 | 사용자 키 암호화 방식 | **(a) 앱 레벨 AES-256-GCM** — 서버가 저장 전 암호화, 마스터 키는 백엔드 env. DB 레벨(pgcrypto) 대신 단순·이식성 우선 |
| 3-1 | 계정 삭제 정책 | **RESTRICT 유지 + 삭제 기능 미구현** — ADR-001 제외 정책과 정합. 상시 미결정 4건 중 "계정 삭제"를 이 수준으로 최소 확정 |

---

## 2. 마이그레이션 (스키마)

- `supabase/migrations`에 SQL 마이그레이션을 둔다(신규 디렉토리 — CLAUDE.md 4장 예고 구조). 루트 단일 lock 유지, 새 패키지는 Supabase CLI가 필요하면 그 범위에서만.
- Enum 6종(`question_status`·`source_answer_status`·`agenda_status`·`agenda_resolution_reason`·`final_answer_generation_mode`·`ai_provider`)을 data-model 4장대로 생성한다. `@decision-log/shared`의 Enum 값과 정확히 일치해야 한다.
- 테이블 6종을 data-model 3.2~3.7 그대로 생성한다(필드·형식·Null·기본값·제약·Index). `moddatetime` 트리거로 `updated_at` 자동 갱신.
- `user_provider_keys`(신규, 3장) 추가.
- **`agendas` 신규 필드 2종(2026-07-20 스키마 검토 추가, data-model 3.5 갱신됨)**: `selected_source_ref`(jsonb, nullable — 채택한 근거 출처. 값 부재 규칙 1.6: 채택형=참조, 직접입력·제외=`NO_VALUE`, 미판단=`null`) / `prompt_version`(varchar100, nullable — Manager 비교 프롬프트 버전). `source_refs`는 **비교한 모든 근거를 보존**한다(선택된 것만 저장 금지) — CHECK/구현으로 강제.
- 값 부재 표현은 data-model 1.6(`null` vs `NO_VALUE`)을 따른다. `NO_VALUE`는 `packages/shared` 상수로 정의한다(코드).
- 제약 요약(재확인): `chats.user_id` FK RESTRICT, 하위 FK CASCADE, `UNIQUE(chat_id, sequence_number)`, `UNIQUE(question_id, provider)`, `final_answers`/`decision_notes` `UNIQUE(question_id)`, 미완료 Question Partial Unique Index, `message` CHECK, `agendas` 상태↔resolution_reason·selected_content·selected_source_ref CHECK(data-model 3.5).

## 3. `user_provider_keys` 테이블 (BYOK 저장 토대)

| 필드 | 형식 | Null | 기본값 | 설명 |
|---|---|---:|---|---|
| `id` | `uuid` | No | `gen_random_uuid()` | PK |
| `user_id` | `uuid` | No | 없음 | `auth.users.id` 참조 |
| `provider` | `ai_provider` | No | 없음 | claude·openai·gemini |
| `encrypted_key` | `text` | No | 없음 | AES-256-GCM 암호문(평문 저장 금지) |
| `key_iv` | `text` | No | 없음 | 암호화 IV/nonce |
| `key_auth_tag` | `text` | No | 없음 | GCM 인증 태그 |
| `created_at` | `timestamptz` | No | `now()` | |
| `updated_at` | `timestamptz` | No | `now()` | `moddatetime` |

- 제약: `user_id → auth.users.id` ON DELETE CASCADE(사용자 데이터가 아닌 자격증명이므로 사용자 삭제 시 함께 제거 — 단 계정 삭제는 MVP 미구현), `UNIQUE (user_id, provider)`.
- 암호화: 서버(Node)가 저장 직전 AES-256-GCM으로 암호화하고 IV·auth tag를 함께 저장한다. **마스터 키는 백엔드 env**(`AI_KEY_ENCRYPTION_KEY` 등, 이름은 구현 재량)에 두고 서버 시작 시 검증한다. 복호는 서버에서만, 사용 시점(AI Spec)에.
- 표시: 키 원문·복호값을 프론트·로그·에러·응답에 넣지 않는다. 필요 시 마스킹(마지막 4자 등)은 후속 설정 Spec.
- RLS: 사용자는 자신의 `user_id = auth.uid()` 행만 접근한다.

## 4. RLS·데이터 접근 (ADR-002)

- 모든 서비스 테이블에 RLS를 활성화한다. 정책은 data-model 5장 방향대로:
  - `chats`: `user_id = auth.uid()`.
  - 하위(`questions`·`source_answers`·`agendas`·`final_answers`·`decision_notes`): 소속 Chat의 `user_id = auth.uid()`를 join(EXISTS)로 검사. 하위에 `user_id`를 중복 저장하지 않는다.
  - `user_provider_keys`: `user_id = auth.uid()`.
- **사용자 JWT 클라이언트**: 조회와 사용자 행동 쓰기(Chat·Question 생성 등)는 요청의 검증된 JWT를 전달한 Supabase Client로 처리 → RLS 적용.
- **Secret Key 클라이언트**: AI 파이프라인 시스템 쓰기용 클라이언트를 도입·설정한다(env `SUPABASE_SECRET_KEY` 필수화). 이 Spec에서는 **생성·구성까지만** 하고 실제 시스템 쓰기 사용은 AI Spec에서. 시스템 쓰기는 Service 계층에서 검증 userId로 대상 Chat·Question 소유권을 확인한 뒤에만 수행한다.
- Repository가 반환하는 DB 응답은 `@decision-log/shared` 스키마로 Zod 검증한다(snake_case↔camelCase 변환은 Repository 경계에서).

## 5. 웹 재배선 (Chat·Question 실저장)

- `apiStorageAdapter`(Promise 기반)를 도입해 웹의 Chat·Question 조회·생성·상태를 Express API 경유로 전환한다. 기존 Mock/브라우저 메모리 저장을 대체한다.
- API 엔드포인트(SPEC-AUTH-003 authMiddleware 뒤, architecture 7.1):
  - 새 Chat + 첫 Question 생성은 **같은 트랜잭션**, `chats.title`은 첫 message 앞 100자.
  - 같은 Chat의 다음 Question 생성, Chat 목록·특정 Chat의 Question 조회.
  - 미완료 Question 1개 제약을 서버(Partial Unique + Service 검증)에서 강제한다.
- 요청 Body는 Controller 경계에서 Zod 검증. 응답은 shared 계약(+SPEC-AUTH-003 에러 봉투)으로 반환한다.
- AI 파이프라인(SourceAnswer·Agenda·FinalAnswer·DecisionNote 생성·상태 전이)은 이 Spec에서 **브라우저 Mock 유지**(0.4 한계). 웹은 Chat·Question만 실서버, 나머지는 기존 Mock 흐름과 연결한다(각 AI Spec에서 서버 이전).

## 6. 환경변수·문서

- API env 추가·필수화: `SUPABASE_SECRET_KEY`(시스템 쓰기 클라이언트), 암호화 마스터 키(예 `AI_KEY_ENCRYPTION_KEY`). 서버 시작 시 Zod 검증(SPEC-AUTH-003 `env.ts` 확장). 값 없으면 명확히 실패, 키 값 노출 금지.
- `apps/api/.env.example`에 두 값을 이름만 추가(실제 값 금지). `.env` 커밋 금지(이미 차단).
- `docs/dev-setup.md`에 마이그레이션 적용 절차, Secret Key·암호화 마스터 키, RLS 활성화 체크리스트를 반영한다.
- 필요 시 `docs/data-model.md`에 `user_provider_keys`를 반영(이 Spec이 근거).

## 7. Acceptance Criteria

- [ ] AC1. 마이그레이션 적용으로 테이블 6종 + `user_provider_keys` + Enum 6종 + 제약(FK·UNIQUE·CHECK·미완료 Question Partial Unique)·Index·`moddatetime` 트리거가 생성된다(적용 후 스키마 확인).
- [ ] AC2. RLS 활성화 + join(EXISTS) 소유권 정책으로 사용자는 자신의 Chat과 하위만 조회·쓰기하고 타인 데이터에 접근할 수 없다(2번째 계정으로 실측; 런타임 실측 불가 시 정책 존재 확인 + NOT VERIFIED 사유).
- [ ] AC3. 2-클라이언트가 구성된다 — 조회·사용자 쓰기는 사용자 JWT 클라이언트(RLS), 시스템 쓰기용 Secret Key 클라이언트는 도입·설정(실제 시스템 쓰기 사용은 AI Spec). Express는 검증 JWT의 userId만 사용하고 클라이언트 전달 userId를 무시한다.
- [ ] AC4. 웹 Chat·Question이 apiStorageAdapter→Express→Supabase로 실제 저장·조회된다 — 로그인→새 질문→Chat·Question 생성(트랜잭션·title 100자)→로그아웃 후 재로그인 시 Chat 목록·Question 복원. 미완료 Question 1개 제약이 서버에서 강제된다.
- [ ] AC5. `user_provider_keys` 저장·복호 경로가 동작한다 — AES-256-GCM(마스터 키 env)으로 암호화 저장하고 서버에서 복호하며, 키 원문이 프론트·로그·에러·응답에 평문으로 노출되지 않는다(입력 UI·AI 사용은 후속). RLS로 본인 키만 접근.
- [ ] AC6. `npm run typecheck` / `build` 통과. `npm run lint`는 web만 검사(apps/api lint script 없음 — 명시). 인증(SPEC-AUTH-001~003)과 기존 happy-path가 회귀 없이 동작한다. `docs/dev-setup.md`(마이그레이션·Secret Key·마스터 키·RLS 체크리스트)와 `.env.example`이 갱신되고 실제 `.env`는 커밋되지 않는다.

---

## 8. 후속 연결

| 항목 | 다루는 곳 |
|---|---|
| SourceAnswer 서버 생성·저장(시스템 쓰기 실사용) | SPEC-AI-001 |
| Agenda·재검토 서버 생성·저장 | SPEC-AI-002 |
| FinalAnswer·DecisionNote 서버 생성·저장 | SPEC-AI-003 |
| BYOK 키 입력·검증 UI, 앱 키 on/off 플래그 사용 | 설정 Spec + SPEC-AI-001 |
| DecisionNote Export·Zip | SPEC-EXPORT-001 |
| 좌초 상태 복구·전 Provider 실패 등 상시 미결정 | 각 AI Spec |

---

## 9. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-20 | 최초 작성. Step 1~4 사용자 결정 반영 (1장 표). 범위=토대 전체+Chat·Question 실저장, AI 생성물 저장은 AI Spec, BYOK 키 테이블·AES-256-GCM 암호화 포함, 계정 삭제=RESTRICT 유지 |
| 2026-07-22 | **완료 처리** (Cowork). T-015 구현 + AC1~AC6 실측 PASS(마이그레이션·RLS 양방향 교차 차단·2-클라이언트·web Chat/Question 실저장·복원·BYOK 암호화 round-trip·빌드/기동). 상태 헤더·index.md·status.md 갱신. AI 생성물 저장은 SPEC-AI-001~003에서 이어받음 |
