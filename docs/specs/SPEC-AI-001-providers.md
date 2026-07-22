# SPEC-AI-001. AI Provider 실호출·SourceAnswer 생성 (Real Provider Pipeline)

- 상태: **Ready (Step 1~7 확정, 구현 대기)** — 2026-07-22
- 기준 문서: `docs/domain-policy.md`(2·3·5장), `docs/data-model.md`(3.4 source_answers·1.5 JSONB·1.6 NO_VALUE), `docs/decisions/ADR-002-data-access-clients.md`, `docs/decisions/ADR-003-ai-provider-scope.md`, `docs/specs/SPEC-SCHEMA-001-core-contracts.md`(5.3 SourceAnswer·5.3.1 StructuredContent·7 errorCode), `docs/specs/SPEC-DB-001-user-ownership-and-rls.md`(2-클라이언트·BYOK 암호화·apiStorageAdapter), `CLAUDE.md` 5·6·8장
- 작성 방식:
  - 0장 "고정 사항"은 확정된 정책·데이터 모델·이전 Spec에서 온 것이며, 이 Spec에서 임의로 바꾸지 않는다.
  - 1장 "결정 사항"은 사용자가 직접 결정했다(Step 1~7). Agent는 질문과 (a)/(b) 선택지·추천을 제시하고 결정을 받아 적었다.

---

## 0. 고정 사항 (정책·모델·이전 Spec 확정 — 재질문 안 함)

### 0.1 한 줄 목표

지금까지 브라우저 Mock으로 만들던 **SourceAnswer(3사 답변)** 를, 서버(apps/api)가 실제 Claude·OpenAI·Gemini API를 호출해 생성·정규화·검증·저장하도록 교체한다. web은 Mock 생성을 멈추고 서버를 실호출해 표시하며, 새로고침 후 DB에서 복원한다. **화면–서버–3사 AI–DB를 관통하는 수직 슬라이스**를 SourceAnswer 구간에 대해 완성한다. Agenda 이후(Manager 비교·FinalAnswer·DecisionNote)는 이번 범위가 아니며 브라우저 Mock을 유지한다.

### 0.2 기존 문서에서 오는 고정 규칙

- **SourceAnswer 상태머신·재시도**: `pending → processing → succeeded/failed`. 첫 실패 시 1회만 재시도(`retry_count 0→1`), 재시도 후에도 실패면 `excluded_from_comparison=true`·`excluded_at` 기록하고 비교에서 제외. 추가 재시도 없음 (domain-policy 2.3·3.2, ADR-003).
- **부분 실패 진행**: 하나 이상 `succeeded`면 성공한 답변만으로 진행. 정확히 1개 성공은 `single_source_fallback`, 2개 이상 성공은 `multi_source` (FinalAnswer 단계에서 사용; AI-001은 SourceAnswer까지).
- **2-클라이언트(ADR-002)**: 조회·사용자 행동 쓰기 = 사용자 JWT Client + RLS. **AI 파이프라인 시스템 쓰기(SourceAnswer 저장·상태 갱신) = Secret Key Client**. 시스템 쓰기는 Service 계층이 검증된 JWT의 userId로 대상 Chat·Question 소유권을 확인한 뒤에만 수행한다. 클라이언트가 보낸 userId는 신뢰하지 않는다.
- **테이블**: `source_answers`(data-model 3.4)에 저장. `UNIQUE(question_id, provider)`, `CHECK(retry_count BETWEEN 0 AND 1)`, `ON DELETE CASCADE`. RLS·GRANT는 DB-001에서 이미 섬.
- **계약(SPEC-SCHEMA-001)**: `SourceAnswerSchema`, `StructuredContentSchema`(각 Section `sectionId` 필수), errorCode 5종(`PROVIDER_TIMEOUT`·`PROVIDER_ERROR`·`SCHEMA_VALIDATION_FAILED`·`NETWORK_ERROR`·`UNKNOWN_ERROR`). errorCode 원문은 UI·로그에 그대로 표시.
- **값 부재 규칙(data-model 1.6)**: 외부 응답은 Zod 경계에서 정규화하되 **원문은 `raw_content`에 그대로 보존**. `null`=미상, `NO_VALUE`=의도적 없음.
- **BYOK 저장·복호 경로(DB-001)**: `user_provider_keys`(AES-256-GCM), `keyCipher`, `providerKeys.repository`(`getDecryptedProviderKey`)는 이미 구축됨. 이번엔 **해석 로직·플래그·실사용**을 얹는다.
- **아키텍처(CLAUDE.md 8)**: AI SDK 호출은 Provider 계층, Supabase 접근은 Repository. Controller는 SDK 직접 호출 금지. 프롬프트는 `/prompts`에서 버전관리(하드코딩 금지). React는 외부 AI를 직접 호출하지 않는다.
- **관측·실패 3제약(LLM Ops 조사)**: ① 응답 raw 보존 ② 관측 메타(토큰·지연·모델·프롬프트버전) 동시 기록 ③ 실패 정책 명시.

---

## 1. 결정 사항 요약 (사용자 확정, 2026-07-22 — Step 1~7)

| # | 질문 | 결정 |
|---|---|---|
| 1-① | 실행 모델 | **비동기** — 서버가 "시작"을 즉시 알리고, 각 Provider가 끝나는 대로 개별 전달 |
| 1-② | web 수직슬라이스 경계 | **이후 브라우저 Mock 유지** — 실제 SourceAnswer를 Mock Manager 입력으로 써 Agenda~노트까지 끝까지 돎 |
| 2-① | 진행 전달 방식 | **SSE(서버 푸시)** |
| 2-② | 생성 트리거 | **명시적 호출** — web이 Question 생성 후 별도 "생성 시작"을 1회 호출 |
| 3-① | Provider 타임아웃 | **45초** (병렬 호출은 고정) |
| 3-② | 재시도 대상 | **일시적 오류 + 스키마 검증 실패만 1회 재시도**. 영구 오류(인증·잘못된 요청)는 즉시 제외 |
| 4-① | 3사 전멸 시 | **고정 안내 문구로 마무리 + 완료** (기존 all-rejected 패턴 재사용) |
| 4-② | 좌초 복구 | **이번 Spec 밖**(마지막 주 안정화) — 갇힌 질문 리스크는 "알려진 한계"로 문서화 |
| 5-① | `APP_DEFAULT_AI_KEYS_ENABLED` | **기본 ON** (데모·체험 마찰 제거) |
| 5-② | 쓸 키 없는 Provider | **생성 시작 전 사전 점검으로 차단 + 안내** (어느 Provider 키가 없는지 표시) |
| 5-③ | 키 입력 UI | **별도 Spec(SPEC-SETTINGS-001)으로 분리** |
| 6-① | 관측 메타 저장 위치 | **응답 메타용 JSONB 한 칸**(신규 `response_meta`)에 토큰·지연 등을 묶어 저장 |
| 6-② | StructuredContent 확장 | **지금 확장** |
| 7-① | 확장 내용 | **둘 다** — Section `order`(순서) + `kind`(유형) + 최상위 `summary`(전체 요약) |
| 7-② | 답변 프롬프트 | **provider별 맞춤 프롬프트** (`/prompts`에 provider별로) |
| 7-③ | 이전 대화 Context | **이번에 포함** — 단, 서버 DB에 이전 결과가 없어 **web이 Context를 생성 요청에 실어 전달**(임시). FinalAnswer·노트 서버화 이후 DB 기반으로 전환 |
| 보강 | Section `kind` 집합 | **자유 문자열** — 어젠다 분류 기준·충돌 판단 기준·저장 구조는 **SPEC-AI-002(Manager)** 에서 확정 |

---

## 2. 범위

### 2.1 할 것

1. 서버 Provider 계층: Claude·OpenAI·Gemini 실제 API를 **병렬** 호출(타임아웃 45초), 응답을 공통 `StructuredContent`로 정규화하고 Zod 검증.
2. 실패·재시도 정책 실장(5장): 일시적/영구 오류 구분, 1회 재시도, 제외 처리, errorCode 매핑.
3. `source_answers` 실저장(Secret Key 시스템 쓰기 + Service 소유권 검증): 상태 전이·raw 보존·관측 메타(JSONB)·모델·프롬프트버전.
4. BYOK 하이브리드 해석(7장): 사용자 키 우선 → 없으면 앱 키(플래그 ON), 생성 시작 전 사전 키 점검·차단.
5. 비동기 배선(4장): 명시적 "생성 시작" → SSE로 provider별 진행 푸시. 새로고침 시 GET 스냅샷 복원.
6. web 재배선: Mock SourceAnswer 생성 중단, 서버 실호출·SSE 표시·복원. **Agenda 이후는 실제 SourceAnswer를 입력으로 한 브라우저 Mock 유지.**
7. StructuredContent 확장(8장): `order`·`kind`·`summary`. 공통 계약(packages/shared) 반영 및 Mock·web 조정.
8. provider별 답변 프롬프트를 `/prompts`에 버전관리(10장), Context 주입(9장).

### 2.2 안 할 것 (다른 Spec/시점)

| 항목 | 다루는 곳 |
|---|---|
| Manager AI Agenda 비교·**어젠다 분류 기준·충돌 판단 기준·저장 구조** | **SPEC-AI-002 (Manager)** ← 사용자 제기 핵심 과제 |
| FinalAnswer 서버 생성·`generation_mode`(전 Provider 실패 표현 포함) 서버화 | SPEC-AI-003 |
| BYOK 사용자 키 입력·검증·마스킹 UI | SPEC-SETTINGS-001 |
| 좌초 복구(processing timeout 회수·중단 재구독) | 마지막 주 안정화 |
| 서버 DB 기반 Context 구성(직전 FinalAnswer·이전 DecisionNote를 DB에서) | FinalAnswer·노트 서버화 이후 |
| 앱 기본 키 사용량 제한·비용 가드 | 후속(운영) |

---

## 3. 데이터 흐름

```text
[web] 질문 입력
  → POST /api/chats(첫 질문) 또는 /questions (DB-001, 기존) — Question 실저장(draft/processing)
  → POST /api/.../source-answers  ("생성 시작", 명시적. Bearer + 이전 Context 동봉)
        [서버]
        1) requireAuth로 userId 확립 (JWT)
        2) Service: 대상 Question·Chat 소유권 검증(검증 userId 기준)
        3) 사전 키 점검(BYOK): 3사 각각 (사용자 키 or 앱 키[플래그 ON]) 확보 확인
             - 하나라도 없음 → 생성 시작 거절(안내: 없는 Provider), 어떤 저장도 안 함
        4) source_answers 3행 생성(pending, Secret Key 시스템 쓰기)
        5) 3사 병렬 호출 시작 → 각 provider: processing → (성공) 정규화·Zod → succeeded
                                              (실패) 재시도 판단 → 재시도 or failed·excluded
        6) 각 상태 변화를 SSE 이벤트로 web에 푸시 + source_answers에 저장(raw·structured·meta·error)
  → [web] SSE 수신: 로딩 말풍선 provider별 점등 갱신 → 3개 최종 도달 시 답변 카드
  → 이후 Agenda 비교·FinalAnswer·DecisionNote = 실제 SourceAnswer를 입력으로 한 브라우저 Mock (0.4)

새로고침/재진입:
  → GET /api/.../source-answers (user JWT + RLS) — 현재 스냅샷 복원 (진행 중 실시간 재구독은 좌초 범위=미룸)
```

---

## 4. 엔드포인트·비동기 배선 (개략 — 정확한 형태는 구현 시 확정)

- **생성 시작(명시적) + SSE**: `POST /api/chats/:chatId/questions/:questionId/source-answers`
  - 요청: `Authorization: Bearer <token>`, body에 **이전 Context**(9장) 동봉.
  - 응답: `Content-Type: text/event-stream`. 이 POST 응답 자체를 SSE 스트림으로 열고, web은 **fetch ReadableStream**으로 소비한다.
  - **구현 노트**: 브라우저 `EventSource`는 커스텀 헤더 불가·GET 전용이라, 토큰을 URL에 싣지 않기 위해 `EventSource` 대신 **fetch 기반 SSE 리더**를 쓴다(Bearer 헤더 사용, 토큰 URL 노출 회피).
  - SSE 이벤트(예): `{ type: "source_answer.updated", provider, status, errorCode? }`, 종료 `{ type: "done" }`. 실제 이벤트 스키마는 packages/shared 또는 api 경계에서 Zod로 검증.
- **복원 조회**: `GET /api/chats/:chatId/questions/:questionId/source-answers` — 사용자 JWT + RLS로 본인 것만. 응답은 `SourceAnswer[]`(shared 계약).
- **2-클라이언트 적용**: 저장·상태 갱신 = `adminClient`(Secret Key) + Service 소유권 검증. 조회 = `userClient`(RLS). 저장 전 소유권 확인은 시스템 쓰기 전제(ADR-002).
- **web 계층**: 컴포넌트는 fetch 직접 호출 금지 → apiClient/Service 경유(CLAUDE.md 7). `useChatWorkspace`의 Mock 생성부(`buildPendingSourceAnswers`·시나리오 이벤트 기반 전이)를 서버 실호출·SSE 구독으로 대체. `?scenario=` 개발 경로는 기존 메모리 흐름 유지 가능(DB-001 패턴과 동일).

---

## 5. Provider 호출 정책

- **병렬**: 3사를 동시에 호출, 각자 완료되는 대로 처리.
- **타임아웃**: Provider 호출당 **45초**. 초과 시 `PROVIDER_TIMEOUT`.
- **재시도(1회) 대상 = 일시적 오류 + 스키마 검증 실패**:

| 상황 | errorCode | 재시도? |
|---|---|---|
| 타임아웃 | `PROVIDER_TIMEOUT` | 재시도 |
| 네트워크 단절·연결 실패 | `NETWORK_ERROR` | 재시도 |
| Provider 서버 오류(5xx)·rate limit(429) | `PROVIDER_ERROR` | 재시도 |
| 응답 형식이 계약 스키마 검증 실패 | `SCHEMA_VALIDATION_FAILED` | 재시도 (AI 비결정성 — 재생성 시 형식 맞을 수 있음) |
| 인증 실패(잘못된 키)·잘못된 요청(4xx, 429 제외) | `PROVIDER_ERROR` | **즉시 제외**(재시도 무의미) |
| 분류 불가 | `UNKNOWN_ERROR` | 즉시 제외 |

- 재시도는 같은 `source_answers` 레코드를 `processing`으로 되돌려 재호출(`retry_count=1`). 재시도 후에도 실패면 `failed` + `excluded_from_comparison=true` + `excluded_at`.
- errorCode는 레지스트리 5종만 사용. errorMessage에 비밀값·토큰·내부 스택을 넣지 않되, 디버깅용 원문 요지는 안전 가공해 담고 UI·콘솔에 표시(SCHEMA-001 7장).

---

## 6. 실패 정책

### 6.1 부분 실패 (기존 정책 재확인)

하나 이상 `succeeded`면 성공한 답변만으로 진행. 제외된 Provider는 web 배너·3열 모달에 "제외됨 + errorCode"로 표시(기존 UI 재사용).

### 6.2 전 Provider 실패 (신규 확정 — status.md 상시 미결정 ①)

3사가 모두 최종 실패(재시도 후 excluded)하면, **고정 안내 문구로 마무리하고 Question을 완료 처리**한다. 사용자는 안내를 보고 다음 질문을 시작할 수 있다(기존 all-rejected 흐름과 같은 패턴).

- 제안 문구(검토 대상): `"모든 AI 응답을 받지 못했습니다. 잠시 후 다시 질문해 주세요."`
- 이번 슬라이스에서 FinalAnswer·DecisionNote는 브라우저 Mock 경로이므로, 이 고정 문구 처리도 web Mock 종결 경로에서 수행한다. **서버 `final_answers.generation_mode`에 "전 Provider 실패" 표현을 추가할지는 FinalAnswer 서버화(SPEC-AI-003) 시점에 재검토**한다(현재 enum: `multi_source`·`single_source_fallback`·`all_agendas_rejected` — 전 Provider 실패 전용 값은 아직 없음).

### 6.3 좌초 복구 — 이번 Spec 밖 (알려진 한계)

서버 재시작·사용자 이탈로 `source_answers`가 `processing`/`pending`에 갇힐 수 있다. 이번 Spec은 정상 경로 관통에 집중하고 좌초 복구(timeout 회수·재구독)는 **마지막 주 안정화로 미룬다**. **알려진 한계**: 갇힌 미완료 Question이 "한 Chat 미완료 1개" 제약 때문에 새 질문을 막을 수 있다. 안정화 Spec에서 시간 기반 정리(타임아웃 초과 processing→failed)로 해소한다.

---

## 7. BYOK 하이브리드 해석

### 7.1 키 조회 순서 (Provider별)

```text
1) user_provider_keys에 사용자 키 있으면 → 그 키(복호)
2) 없고 APP_DEFAULT_AI_KEYS_ENABLED=ON 이면 → 앱 기본 키(env)
3) 둘 다 없으면 → 그 Provider는 "사용 가능한 키 없음"
```

### 7.2 전역 플래그

- `APP_DEFAULT_AI_KEYS_ENABLED` — 서버 env, **기본값 ON**. 서버 시작 시 env 검증에 포함. 어드민 UI 없이 config+재시작 수준(운영자=Brett 제어). 데모·심사 ON, 필요 시 OFF로 앱 키 차단.

### 7.3 사전 점검(pre-flight) — 생성 시작 전 차단

"생성 시작" 요청 처리 초입에서 3사 각각 7.1 순서로 **사용 가능한 키가 있는지 확인**한다. **하나라도 없으면 생성을 시작하지 않고**(source_answers 생성도 안 함) 요청을 거절하며, **어느 Provider 키가 없는지** 안내한다(디버깅 가시성). 이는 실제 호출 실패로 인한 전멸(6.2)과는 별개의, 시작 전 게이트다.

- 전용 응답 코드/문구는 API 에러 봉투(SPEC-AUTH-003) 재사용. errorCode는 레지스트리 확장 대신 봉투 `code`로 표현(예: `NO_AVAILABLE_KEYS`)하고, SourceAnswer errorCode(5종)는 건드리지 않는다.

### 7.4 앱 키 env (구현·실측 전 사용자 액션)

`apps/api/.env`에 `OPENAI_API_KEY`·`ANTHROPIC_API_KEY`·`GEMINI_API_KEY` 추가(gitignored). 플래그 ON일 때 이 값들이 앱 기본 키다. env 검증은 "플래그 ON이면 필수" 수준으로 구현 시 확정.

### 7.5 키 입력 UI

사용자 키 입력·검증·마스킹 화면은 **SPEC-SETTINGS-001**로 분리. AI-001 실측은 앱 키(플래그 ON)로 가능. 사용자 키 경로 자체는 DB-001 저장·복호 경로가 이미 있어 스크립트/직접 삽입으로도 검증 가능.

---

## 8. 정규화·저장

### 8.1 StructuredContent 확장 (공통 계약 변경)

```text
StructuredContent
- summary: string      (신규 — 답변 전체 한 줄 요약; 값 부재 시 규칙 1.6)
- sections: Section[]  (1개 이상)

Section
- sectionId: string    (기존, 필수 — 근거 추적)
- title: string        (기존)
- content: string      (기존)
- order: number        (신규 — 표시·정렬 순서, 정수)
- kind: string         (신규 — 유형 라벨, 자유 문자열)
```

- **`kind`는 자유 문자열**이다. 3사 답변을 어떤 유형 기준으로 어젠다에 분류하고 비교할지, 그 저장 구조와 **충돌 판단 기준**은 **SPEC-AI-002(Manager)** 에서 확정한다(사용자 제기 과제). AI-001은 provider가 스스로 붙인 유형 데이터를 담아두기만 한다.
- 값 부재(1.6): provider가 `summary`/`kind`를 주지 못하면 `null`. 정규화 결과만 `structured_content`에, 원문은 `raw_content`에.
- **파급**: `packages/shared`의 `StructuredContentSchema`·`SectionSchema`가 바뀐다 → Mock 데이터·web 표시가 새 필드를 반영해야 하고, **SPEC-SCHEMA-001 5.3.1·개정 기록에 확장을 반영**한다(계약 확장의 근거 = 이 Spec).

### 8.2 원문 보존

Provider 원문 응답은 `source_answers.raw_content`에 그대로 저장. 정규화 실패(스키마 검증 실패)여도 raw는 남긴다(재현·디버깅).

### 8.3 관측 메타 (JSONB 한 칸)

`source_answers`에 **응답 메타용 JSONB 컬럼 신규**(예: `response_meta`)를 추가(이 Spec이 마이그레이션 근거):

```text
response_meta (jsonb)
- inputTokens?, outputTokens?   (Provider가 주면)
- latencyMs                     (started_at~completed_at 기반)
- 기타 provider 반환 메타
```

- `model`·`prompt_version`은 기존 전용 칸(`source_answers.model`·`prompt_version`) 사용. `started_at`·`completed_at`도 기존 칸.
- Repository 반환 시 shared 스키마로 검증하고 snake↔camel 변환(DB-001 패턴). `response_meta`의 계약 형태는 shared 또는 api 경계에서 Zod로.

### 8.4 상태 전이·저장 시점

`pending`(생성 직후) → `processing`(호출 시작, `started_at`) → `succeeded`(정규화·검증 통과, `structured_content`·`raw_content`·`response_meta`·`completed_at`) / `failed`(errorCode·error_message, 재시도 or excluded). 각 전이에서 SSE 푸시 + DB 저장.

---

## 9. Context 주입 (이번 슬라이스 방식 — 임시)

- **방식**: web이 "생성 시작" 요청 body에 이전 Context를 실어 보낸다(직전 completed Question의 FinalAnswer + 그 이전 Question들의 DecisionNote — domain-policy 1.1). 서버는 이를 provider 프롬프트에 포함하고 `questions.context_snapshot`·`context_version`에 저장한다.
- **임시임을 명시**: 현재 FinalAnswer·DecisionNote가 서버 DB에 없어(Mock) 서버가 스스로 Context를 구성할 수 없기 때문이다. **FinalAnswer·노트가 서버화되면(SPEC-AI-003/EXPORT 이후) 서버가 DB에서 직접 Context를 구성하는 방식으로 전환**한다.
- **신뢰 경계**: 서버는 클라이언트가 보낸 Context "내용"만 프롬프트 재료로 쓴다. **소유권·인가 판단에는 절대 사용하지 않는다**(그건 검증 JWT userId + 소유권 검증). Context에 포함할 질문 범위·토큰 제한의 상세는 구현 시/후속 프롬프트 조정에서 확정.

---

## 10. 답변 프롬프트 (`/prompts`)

- **provider별 맞춤 프롬프트**를 `/prompts`에 버전과 함께 둔다(하드코딩 금지, CLAUDE.md 8). 저장한 버전 문자열을 `source_answers.prompt_version`에 기록.
- 공통 목표: 질문(+Context)을 받아 **StructuredContent**(요약 + 유형·순서를 가진 sections)를 산출하도록 지시. provider별 차이(JSON 강제 방식, 시스템 프롬프트 형식 등)는 각 프롬프트/어댑터에서 흡수.
- 근거에 없는 비교·합의를 만들지 않는다(Manager 영역). AI-001은 각 provider의 단일 답변 생성만 담당.

---

## 11. Acceptance Criteria (초안 — 구현 T-016 완료 조건)

- [ ] AC1. "생성 시작" 요청 시 서버가 3사를 **병렬** 실호출하고, 각 응답을 `StructuredContent`로 정규화·Zod 검증해 `source_answers`에 저장한다(Secret Key 시스템 쓰기 + Service 소유권 검증). `raw_content`·`response_meta`(토큰·지연)·`model`·`prompt_version` 동시 기록.
- [ ] AC2. 진행이 **SSE**로 web에 푸시되어 provider별 점등(pending→processing→succeeded/failed)이 실시간 갱신되고, 3개 최종 도달 시 답변 카드로 전환된다. 새로고침 시 GET 스냅샷으로 복원된다.
- [ ] AC3. 타임아웃 45초·재시도 정책(5장)이 동작한다: 일시적 오류·스키마 검증 실패는 1회 재시도, 영구 오류는 즉시 제외. 재시도/제외가 `retry_count`·`excluded_from_comparison`·`excluded_at`·errorCode에 반영.
- [ ] AC4. 부분 실패 시 성공 답변만으로 진행하고 제외를 표시한다. **3사 전멸 시 고정 안내 문구로 마무리+완료**된다(6.2).
- [ ] AC5. BYOK: 사용자 키 있으면 그 키, 없으면 앱 키(플래그 ON). **하나라도 키 없으면 생성 시작을 차단하고 없는 Provider를 안내**한다. 플래그 OFF면 앱 키를 쓰지 않는다. 평문 키는 프론트·로그·에러에 노출되지 않는다.
- [ ] AC6. StructuredContent 확장(`summary`·`order`·`kind`)이 공통 계약·Mock·web에 반영되고, `kind`는 자유 문자열로 저장된다.
- [ ] AC7. web이 Mock SourceAnswer 생성을 멈추고 서버 실호출로 대체한다. **Agenda~FinalAnswer~DecisionNote는 실제 SourceAnswer를 입력으로 한 브라우저 Mock으로 끝까지 동작**한다(회귀 없음).
- [ ] AC8. 루트 `typecheck`·`build` 통과, `lint`(web) 통과. 실호출 실측(3사 성공/부분 실패/전멸/키 없음) 시나리오 확인. `.env` 키·비밀값 미노출·미커밋.

---

## 12. 제외 범위·후속 연결

| 항목 | 다루는 곳 |
|---|---|
| 어젠다 분류 기준·비교/충돌 판단 기준·근거 저장 구조 | **SPEC-AI-002 (Manager)** — 사용자 제기 핵심. 커지면 분류/비교 분리 검토 |
| FinalAnswer 서버 생성·`generation_mode` 전 Provider 실패 표현 | SPEC-AI-003 |
| BYOK 키 입력·검증·마스킹 UI | SPEC-SETTINGS-001 |
| 좌초 복구(processing 회수·실시간 재구독) | 마지막 주 안정화 |
| 서버 DB 기반 Context 전환 | FinalAnswer·노트 서버화 이후 |
| StructuredContent `kind` 고정 유형화 | AI-002에서 분류 기준 확정 시 재검토 |

---

## 13. 개정 기록

| 일자 | 내용 |
|---|---|
| 2026-07-22 | 최초 작성(뼈대). Step 1~7 사용자 결정 반영(1장 표). 비동기+SSE, 명시적 생성, 타임아웃 45초·재시도 구분, 전멸=고정문구+완료, 좌초=미룸, BYOK 하이브리드(플래그 기본 ON·사전 점검), 관측 메타 JSONB, StructuredContent 확장(summary·order·kind 자유), provider별 프롬프트, Context=web 전달(임시). 어젠다 분류·충돌 판단 기준은 AI-002로 명시(사용자 제기) |
