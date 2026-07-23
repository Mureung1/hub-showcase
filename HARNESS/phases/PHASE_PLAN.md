# PHASE_PLAN — 기능 단위 Phase 계획

하네스 Phase 구성의 단일 기준 문서다. 원칙은 **기능 1개 = Phase 1개**이며, Phase 0(공통 기반)부터 Phase 6(검증)까지 순서대로 완주하면 실행 가능한 리뷰지기 MVP 프로젝트 하나가 완성된다. MVP 5개 기능(Phase 1~5)은 `docs/PRD.md` 2.1~2.5와 1:1로 대응하고, Phase 6은 기능이 아니라 전체 MVP를 S1~S4 시나리오로 통합 검증하는 별도 Phase다.

생산 스택은 `docs/adr/ADR-0002-생산-스택.md`로 확정됐다: **React + TypeScript + Vite 프론트엔드 / Supabase 백엔드(로컬 CLI + Docker) / LLM 호출은 Edge Functions에서만 / 이메일 로그인 + RLS 매장 격리 포함.**

역할 분담: 이 계획과 각 Phase의 `prompt.md`는 Claude가 작성·관리하고, `phase.json`·`index.json` 생성과 하네스 실행·기록은 Codex가 담당한다. 이 문서와 `phase.json`이 다르면 이 문서에 맞춰 `phase.json`을 고친다.

## Phase 목록

| Phase | 폴더 | 기능 (PRD) | 완료 시 사장님이 할 수 있는 일 |
|---|---|---|---|
| 0 | `00-foundation` | 공통 기반: 앱 골격(공통 사이드바 셸)·로그인·리뷰 수동 입력·리뷰함 | 가입·로그인 후 리뷰를 입력하고 목록에서 확인 |
| 1 | `01-review-classification` | 리뷰 유형 분류 (2.1) | 유형·카테고리·분류 근거 확인, 확인 필요 처리 |
| 2 | `02-tone-and-manner` | 톤앤매너·매장 프로필 (2.2) | 매장 정보·말투·운영 정보·금지 표현 설정, 샘플 미리보기 |
| 3 | `03-reply-draft` | 답글 초안 생성 (2.3) | 초안 확인·수정·복사 → 직접 게시 → 완료 표시 |
| 4 | `04-review-analysis` | 리뷰 분석 (2.4) + ① 홈 대시보드 | 리포트·AI 인사이트 확인, 홈에서 오늘 현황·처리 큐 확인 |
| 5 | `05-blackconsumer-manual` | 블랙컨슈머 대응 (2.5) | 위험도 확인, 매뉴얼 4단계 수행 |
| 6 | `06-mvp-verification` | 검증: MVP 통합 검증 (기능 아님) | S1~S4 전체 흐름 완주 확인 |

- 의존 관계: 각 Phase는 직전 Phase에만 의존한다 (00 → 01 → 02 → 03 → 04 → 05 → 06).
- 모든 Phase 공통: `completion_stage: passed`, `approval: none`, `external_side_effects: false`, `production: false`.
- 배포(스테이징·프로덕션) Phase는 현재 계획에 없다. 제품 Phase 2 이후 전용 adapter와 함께 별도 추가한다. target은 `passed`만 사용한다.

## 공통 규칙

- **기능 위주 폴더 트리**: 화면·클라이언트 로직은 `frontend/src/features/<기능>/`(kebab-case), 서버 로직은 Supabase에 둔다 — Edge Functions `supabase/functions/<기능-함수>/`, 스키마·RLS는 `supabase/migrations/`의 기능별 SQL. 공용 최소한만 `frontend/src/shared/`, `supabase/functions/_shared/`. 기준 트리는 `docs/CODE_MAP.md`.
- **공통 DoD(모든 기능 Phase)**: ① 해당 기능 테스트 통과 ② 프론트 전체 테스트 `npm --prefix frontend run test -- --run` ③ build `npm --prefix frontend run build` 통과. 새 기능이 이전 기능을 깨뜨리면 통과가 아니다.
- **기능 폴더 강제**: 각 기능 Phase에 해당 feature 폴더(또는 Edge Function 폴더)의 `path_exists` check를 넣는다.
- **순수 TS 규칙 모듈**: 결정적 규칙(분류 엣지 케이스, 금칙 정책, 인사이트 감지, 만료 이벤트 제외)은 LLM·DB 없이 Vitest로 단위 테스트 가능한 순수 TS 모듈로 분리한다.
- **안전 문구 고정**: 수동 게시·법률 고지 등 안전 문구는 `frontend/src/content/safety.ts`에 두고 `content_contains` check로 고정한다.
- **LLM 경계**: LLM adapter는 `supabase/functions/_shared/llm/`에 두고, `LLM_PROVIDER=fake`일 때 결정적 fake로 동작해야 한다. LLM API 키는 Edge Functions 환경변수로만 주입한다(브라우저 금지). 구조화 출력은 스키마 검증하고 실패 시 "확인 필요"로 fail-closed 한다.
- **RLS 원칙**: 모든 테이블·Storage 버킷은 RLS로 본인 매장 데이터만 접근 가능해야 한다. 스키마 변경은 `supabase/migrations` SQL로만 한다.
- **로컬 Supabase 전제**: DB·Edge Functions가 필요한 테스트 명령은 로컬 Supabase(`supabase start`)가 실행 중이어야 한다. 구동·정지 순서와 check 구성 세부는 Codex가 정한다.
- **retry 기본값**: `max_attempts: 3`, `backoff_seconds: [0, 10, 30]`, category `timeout, network, worker_failure, verification` (LLM 사용 Step은 `rate_limit, external_service` 추가). command timeout은 테스트 600~1200초, build 900초 수준에서 Codex가 정한다.

## Phase 0 — `00-foundation` (공통 기반)

required_inputs: 없음

### Step 1 `stack-scaffold`
- 목표: ADR-0002 스택(React+TS+Vite / 로컬 Supabase) 골격을 빌드 가능하게 만들고, 공통 앱 셸(좌측 사이드바 6메뉴 — 홈·리뷰함·리뷰 입력·분석 리포트·블랙컨슈머 대응·매장 설정 — 과 상단바 매장명, 화면 라우팅) 기본형을 둔다. 아직 없는 화면(홈 등)은 자리표시자로 두고 각 Phase가 라우트에 연결한다. 스택은 이미 채택됐으므로 새로 결정하지 않는다.
- context_files: `docs/PRD.md`, `docs/UI_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/CODE_MAP.md`, `docs/adr/ADR-0002-생산-스택.md`
- allowed_paths: `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `frontend`, `supabase`, `package.json`, `vitest.config.ts`, `tests`
- required_artifacts: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/src/App.tsx`, `supabase/config.toml`, `.env.example`
- acceptance: content_contains(ADR-0002, ["상태: 채택됨"]) · json_valid(`frontend/package.json`) · command(npm build) · path_exists(`supabase/config.toml`)
- permissions: network true

### Step 2 `auth-review-input-inbox`
- 목표: Supabase Auth 이메일 가입·로그인, stores·reviews 테이블+RLS, 리뷰 단건 입력·일괄 붙여넣기 분리·저장·리뷰함 목록 (PRD 4.5, 4.3 기본)
- context_files: `docs/PRD.md`, `docs/UI_GUIDE.md`, `prototype/index.html`, `prototype/styles.css`
- allowed_paths: `frontend`, `supabase`, `tests`
- required_artifacts: `supabase/migrations`, `frontend/src/features/auth`, `frontend/src/features/reviews`
- acceptance: path_exists(`frontend/src/features/reviews`) · path_exists(`supabase/migrations`) · npm test · npm build
- permissions: network true

## Phase 1 — `01-review-classification` (리뷰 유형 분류, PRD 2.1)

required_inputs: `llm-provider`, `llm-api-key`(secret)

### Step 1 `classification-engine`
- 목표: `classify-review` Edge Function — LLM 구조화 출력 + 결정적 엣지 케이스 규칙 + 분류 결과 저장 + 답글 상태 머신
- context_files: `docs/PRD.md`, `docs/GOTCHAS.md`, `docs/GLOSSARY.md`
- allowed_paths: `supabase`, `frontend`, `tests` / secret_inputs: `llm-api-key`
- required_artifacts: `supabase/functions/classify-review`, `supabase/functions/_shared/llm`
- acceptance: path_exists(`supabase/functions/classify-review`) · npm test(엣지 케이스 규칙 단위 테스트 포함)
- permissions: network true / retry에 rate_limit·external_service 추가

### Step 2 `classification-ui`
- 목표: 입력 미리보기·리뷰함 필터/배지·상세 분류 근거를 실제 데이터에 연결
- context_files: `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/review-classification`
- acceptance: path_exists · npm test · npm build
- permissions: network true

## Phase 2 — `02-tone-and-manner` (톤앤매너·매장 프로필, PRD 2.2)

required_inputs: 없음 (샘플 미리보기는 템플릿 기반, LLM 호출 없음)

### Step 1 `store-profile-data`
- 목표: store_profiles 스키마+RLS, 프로필 5개 그룹 저장·조회, 만료 이벤트 자동 제외·금지 표현 목록(순수 TS 규칙)
- context_files: `docs/PRD.md`, `docs/GOTCHAS.md`
- allowed_paths: `frontend`, `supabase`, `tests`
- required_artifacts: `frontend/src/features/store-profile`, `supabase/migrations`
- acceptance: path_exists(`frontend/src/features/store-profile`) · npm test
- permissions: network true

### Step 2 `settings-ui-preview`
- 목표: ⑦ 매장 설정 화면과 선택 톤이 반영되는 샘플 답글 미리보기
- context_files: `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/store-profile`
- acceptance: npm test · npm build
- permissions: network true

## Phase 3 — `03-reply-draft` (답글 초안 생성, PRD 2.3)

required_inputs: `llm-provider`, `llm-api-key`(secret)

### Step 1 `draft-engine`
- 목표: `generate-reply` Edge Function — 유형별 초안 생성 + 금칙 5규칙의 결정적 정책 모듈(순수 TS) + 자동 재생성 + reply_drafts 저장
- context_files: `docs/PRD.md`, `docs/GOTCHAS.md`
- allowed_paths: `supabase`, `frontend`, `tests` / secret_inputs: `llm-api-key`
- required_artifacts: `supabase/functions/generate-reply`, `tests/golden/reply-safety-cases.json`
- acceptance: json_valid(`tests/golden/reply-safety-cases.json`) · path_exists(`supabase/functions/generate-reply`) · npm test(금칙 정책 골든 사례 포함)
- permissions: network true / retry에 rate_limit·external_service 추가

### Step 2 `draft-ui-copy-flow`
- 목표: ③ 상세 에디터(톤 칩·다시 생성·글자수)와 복사 → 직접 게시 → 완료 흐름
- context_files: `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/reply-draft`, `frontend/src/content/safety.ts`
- acceptance: content_contains(safety.ts, ["답글 복사하기", "배민 사장님 페이지에 붙여넣어 주세요", "완료로 표시"]) · npm test · npm build
- permissions: network true

## Phase 4 — `04-review-analysis` (리뷰 분석, PRD 2.4 + ① 홈 대시보드)

required_inputs: 없음 (인사이트 감지는 결정적 규칙, 문구는 템플릿 우선)

① 홈은 새 도메인 기능이 아니라 리뷰(P0)·분류(P1)·분석의 데이터를 모으는 종합 대시보드다. 홈에 필요한 반응 추이·인사이트가 이 Phase에서 완성되므로 여기에서 조립한다.

### Step 1 `analysis-engine`
- 목표: 집계 4종(SQL 뷰/함수 마이그레이션)·인사이트 감지(순수 TS)·기간 필터·콜드 스타트(10건 미만)
- context_files: `docs/PRD.md`
- allowed_paths: `frontend`, `supabase`, `tests`
- required_artifacts: `frontend/src/features/review-analysis`, `supabase/migrations`
- acceptance: path_exists(`frontend/src/features/review-analysis`) · npm test(경계값: 10건 전후·동기간 없음·0건)
- permissions: network true

### Step 2 `report-ui`
- 목표: ⑤ 분석 리포트 화면(차트·인사이트 카드·콜드 스타트 안내)
- context_files: `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/review-analysis`
- acceptance: npm test · npm build
- permissions: network true

### Step 3 `home-dashboard`
- 목표: ① 홈 대시보드 — 통계 카드 4종(신규 리뷰·답글 대기·평균 별점·악성 의심 레드 강조), "지금 처리가 필요한 리뷰" 큐(악성 우선 정렬), 손님 반응 추이, AI 인사이트 카드. 카드에서 ③ 리뷰 상세로, 악성 의심 카드에서 ⑥ 대응 센터로 이동. 접속 시 기본 진입 화면. 새 도메인 로직 없이 앞 기능들의 조회 결과를 조합한다.
- context_files: `docs/PRD.md`, `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/home`
- acceptance: path_exists(`frontend/src/features/home`) · npm test · npm build
- permissions: network true

## Phase 5 — `05-blackconsumer-manual` (블랙컨슈머 대응, PRD 2.5)

required_inputs: `llm-provider`, `llm-api-key`(secret)

### Step 1 `risk-case-data`
- 목표: `assess-risk` Edge Function(위험도 3단계, fail-closed) + response_cases 스키마 + Storage 증거 버킷+RLS + 오탐 복귀 + 동일 닉네임 재발 감지
- context_files: `docs/PRD.md`, `docs/GOTCHAS.md`
- allowed_paths: `supabase`, `frontend`, `tests` / secret_inputs: `llm-api-key`
- required_artifacts: `supabase/functions/assess-risk`, `frontend/src/features/blackconsumer`
- acceptance: path_exists(`supabase/functions/assess-risk`) · npm test
- permissions: network true / retry에 rate_limit·external_service 추가

### Step 2 `response-center-ui`
- 목표: ⑥ 대응 센터(사건 리스트·위험도 배너·매뉴얼 4단계·증거 첨부·인쇄)
- context_files: `docs/UI_GUIDE.md`, `prototype/index.html`
- allowed_paths: `frontend`, `tests`
- required_artifacts: `frontend/src/features/blackconsumer`
- acceptance: content_contains(safety.ts, ["일반적인 정보 안내이며 법률 자문이 아닙니다"]) · npm test · npm build
- permissions: network true

## Phase 6 — `06-mvp-verification` (검증 — 기능 아님)

Phase 1~5로 완성된 MVP 5개 기능이 실제로 하나의 제품으로 맞물려 동작하는지 증명하는 전용 검증 Phase다. 새 기능을 추가하지 않고 기존 기능 코드는 `tests/integration`에서만 소비한다.

required_inputs: 없음 (Edge Functions를 `LLM_PROVIDER=fake` 모드로 실행)

### Step 1 `mvp-integration`
- 목표: S1~S4 통합 검증으로 "실행 가능한 프로젝트 1개 완성"을 증명
- context_files: `docs/PRD.md`, `docs/TEST_PLAN.md`
- allowed_paths: `tests`, `docs/quality/MVP_COMPLETE.md`
- required_artifacts: `tests/integration/test_mvp_flows.ts`, `docs/quality/MVP_COMPLETE.md`
- acceptance: content_contains(MVP_COMPLETE.md, ["S1", "S2", "S3", "S4", "자동 게시 없음"]) · command(npm run test:integration — 로컬 Supabase 실행 상태 전제) · 공통 DoD 명령 2종(npm test·build)
- permissions: network false(외부 네트워크 기준. 로컬 Supabase 접근 처리는 Codex가 capability 구현에 맞춰 확인)
- 이 Step은 `allowed_paths`에 `frontend`/`supabase`를 두지 않는다. 통합 검증에서 기능 결함이 드러나면 이 Phase에서 고치지 말고 Failure로 기록한 뒤 해당 기능 Phase(1~5)로 되돌아가 새 Attempt로 수정한다.
- 매장 간 데이터 격리는 계정 2개로 RLS를 실제 검증한다.

## 마이그레이션 (Codex 작업)

구 라이프사이클 Phase 폴더 9개(`00-discovery-baseline` ~ `08-production-handoff`)와 구 `phases/index.json`은 2026-07-22 정리에서 삭제됐다(로컬 전용 json은 삭제 전 백업함). `phases/`에는 새 Phase 폴더 7개와 이 문서만 있다.

1. 사전 준비: Docker Desktop, supabase CLI, Node.js(npm)가 로컬에 설치되어 있어야 한다. `supabase start`가 동작하는지 먼저 확인한다.
2. 이 계획대로 새 Phase 7개(00~06)의 `phase.json`과 `phases/index.json`을 생성한다 (`HARNESS/contracts/phase.schema.json` 준수). acceptance check의 argv·timeout 같은 기계적 세부는 Codex가 조정하되, 범위·금칙·산출물·기능 폴더 경로는 바꾸지 않는다.
3. 하네스 `validate` 통과를 확인한다. 현재 md 워크트리에는 `run.py` 진입점과 `tests/` 소스가 없으므로(엔진 소스만 있음) 실행 브랜치 쪽 하네스 진입점 기준으로 실행한다.
4. `plan --target passed`의 missing_inputs에 따라 `inputs.local.json`(llm-provider, llm-api-key 환경변수 참조)을 준비한다. `llm-provider`에 `fake`를 지정하면 LLM 없이 결정적 모드로 전체 루프를 돌릴 수 있어야 한다.
