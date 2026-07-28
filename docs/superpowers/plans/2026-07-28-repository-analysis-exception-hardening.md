# Repository Analysis Exception Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공개·비공개·불완전한 GitHub Repository와 외부 서비스 오류가 발생해도 분석 요청이 원인에 맞는 응답을 반환하고, 분석 가능한 데이터는 부분 결과와 경고로 안전하게 완료되도록 만든다.

**Architecture:** Repository 분석을 `입력 검증 → GitHub 필수 데이터 수집 → 선택 데이터 수집 및 정규화 → AI 후보 생성 → Supabase 저장 → HTTP 오류 변환`의 경계로 분리한다. 선택 데이터(Discussion, Project, 리뷰, 특정 파일)가 없거나 null이면 분석을 중단하지 않고 warning으로 기록하며, 필수 데이터와 저장 실패만 명시적인 예외 타입으로 전파한다. 각 경계는 실제 Repository를 직접 호출하지 않는 fixture/mock 테스트와, 대표 Repository를 대상으로 하는 선택적 통합 테스트로 검증한다.

**Tech Stack:** NestJS, TypeScript, Jest, GitHub REST/GraphQL API, Supabase PostgreSQL, OpenAI-compatible AI client.

## Global Constraints

- GitHub 토큰, Supabase 키, AI 키는 테스트 코드와 로그에 출력하지 않는다.
- private Repository는 인증 토큰이 없거나 접근 권한이 없으면 Repository가 존재하지 않는 것과 동일하게 처리한다.
- Discussion, Project, Review, README, package.json, 파일 구조 일부 누락은 분석 전체 실패가 아니라 warning으로 처리한다.
- AI가 근거 없는 후보를 반환하면 후보를 제거하고 warning을 반환한다.
- Supabase 저장 실패는 성공 응답으로 위장하지 않으며, pending 데이터는 정리한다.
- 외부 사용자에게는 내부 stack trace와 Supabase/GitHub 원문 오류를 노출하지 않는다.
- 현재 지원하는 근거 타입은 `commit`, `pull_request`, `issue`, `discussion`, `project`, `file`, `config`, `release`다.

---

## Scope Map

### Files to modify

- `apps/api/src/repository-analysis/infrastructure/github/github-repository.client.ts`
  - REST/GraphQL 응답의 nullability, required/optional 요청 구분, rate limit 및 upstream 오류 보존.
- `apps/api/src/repository-analysis/application/repository-analysis.service.ts`
  - 분석 단계별 실패 의미와 “대상 GitHub ID 활동 없음” 결과 정책 정리.
- `apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.ts`
  - 저장 단계 오류를 원인별 내부 예외로 구분하고 pending 정리 보장.
- `apps/api/src/repository-analysis/presentation/repository-analysis.controller.ts`
  - 내부 예외를 안정적인 `RepositoryAnalysisErrorCode`와 HTTP status로 변환.
- `packages/contracts/src/repository-analysis.ts`
  - 추가 오류 코드와 선택적 결과/warning 계약 반영.
- `apps/web/src/features/repository-analysis/repositoryAnalysisApi.ts`
  - 오류 코드별 사용자 메시지와 재시도/입력 수정 안내 매핑.
- `apps/web/src/features/repository-analysis/RepositoryAnalyzer.tsx`
  - 부분 분석 성공, 접근 불가, rate limit, 저장 실패 상태 표시.
- `supabase/migrations/<new-migration>_analysis_evidence_types.sql`
  - 애플리케이션이 생성하는 Discussion/Project 근거 타입을 DB 제약조건에 반영.

### Files to create

- `apps/api/src/repository-analysis/infrastructure/github/github-repository.fixtures.ts`
  - public, private/inaccessible, null Project node, no optional data, rate-limit 응답 fixture.
- `apps/api/src/repository-analysis/infrastructure/github/github-repository.client.error.spec.ts`
  - GitHub 응답 정규화와 예외 변환 테스트.
- `apps/api/src/repository-analysis/application/repository-analysis.error.spec.ts`
  - 서비스 단계별 성공/부분 성공/실패 정책 테스트.
- `apps/api/src/repository-analysis/presentation/repository-analysis.controller.error.spec.ts`
  - HTTP 오류 코드와 status 매핑 테스트.
- `apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.error.spec.ts`
  - Supabase query 실패, constraint 실패, pending cleanup 테스트.
- `apps/api/test/repository-analysis.integration-spec.ts`
  - 환경 변수가 제공될 때만 실행하는 대표 Repository 통합 시나리오.
- `docs/testing/repository-analysis-error-matrix.md`
  - 오류 분류, 재현 조건, 기대 HTTP 응답, 사용자 메시지 기록.

---

## Task 1: Define the Error Contract

**Files:**
- Modify: `packages/contracts/src/repository-analysis.ts`
- Modify: `apps/api/src/repository-analysis/presentation/repository-analysis.controller.ts`
- Test: `apps/api/src/repository-analysis/presentation/repository-analysis.controller.error.spec.ts`

- [x] **Step 1: Write failing mapping tests**

  다음 내부 오류가 외부 계약으로 매핑되는 테스트를 먼저 작성한다.

  | 내부 원인 | HTTP | code |
  | --- | ---: | --- |
  | 잘못된 GitHub URL | 400 | `INVALID_REPOSITORY_URL` |
  | 공개/비공개 모두 접근 불가 | 404 | `REPOSITORY_NOT_FOUND` |
  | GitHub rate limit | 429 | `GITHUB_RATE_LIMITED` |
  | GitHub upstream 장애 | 502 | `EXTERNAL_SERVICE_ERROR` |
  | AI provider 설정/응답 실패 | 503 또는 부분 성공 warning | `AI_ANALYSIS_UNAVAILABLE` |
  | Supabase 저장 실패 | 503 | `ANALYSIS_PERSISTENCE_FAILED` |
  | 알 수 없는 서버 오류 | 500 | `INTERNAL_SERVER_ERROR` |

- [x] **Step 2: Run the focused test and confirm failure**

  Run:

  ```bash
  npm run test --workspace @ptop/api -- repository-analysis.controller.error.spec.ts
  ```

  Expected: 새 오류 타입이 아직 없어 컴파일 또는 assertion이 실패한다.

- [x] **Step 3: Add only the missing contract and typed errors**

  `RepositoryAnalysisErrorCode`에 `AI_ANALYSIS_UNAVAILABLE`, `ANALYSIS_PERSISTENCE_FAILED`를 추가하고, controller가 `instanceof`로 분기할 수 있는 내부 오류 클래스를 application/infrastructure 경계에 정의한다. 비공개 접근 실패는 GitHub 404와 같은 공개 응답을 사용한다.

- [x] **Step 4: Run the focused test**

  ```bash
  npm run test --workspace @ptop/api -- repository-analysis.controller.error.spec.ts
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/contracts/src/repository-analysis.ts apps/api/src/repository-analysis/presentation/repository-analysis.controller.ts apps/api/src/repository-analysis/presentation/repository-analysis.controller.error.spec.ts
  git commit -m "feat: 분석 오류 응답 계약을 명확히 정의"
  ```

## Task 2: Harden GitHub Data Collection

**Files:**
- Modify: `apps/api/src/repository-analysis/infrastructure/github/github-repository.client.ts`
- Create: `apps/api/src/repository-analysis/infrastructure/github/github-repository.fixtures.ts`
- Test: `apps/api/src/repository-analysis/infrastructure/github/github-repository.client.error.spec.ts`

- [x] **Step 1: Add failing fixtures and tests**

  반드시 다음 응답을 fixture로 재현한다.

  1. `projectsV2.nodes: [null, project]` → project 하나만 정규화
  2. `projectsV2.nodes: [null, null]` → `projects: []`, 500 없음
  3. Discussion field 자체가 null/GraphQL errors → `discussions: []`와 warning
  4. Project가 없는 Repository → `projects: []`와 warning 없음 또는 명시적 optional warning
  5. README/package/file 하나가 404 → 나머지 분석 계속
  6. metadata/languages/contributors/commits 중 required endpoint 404 → `REPOSITORY_NOT_FOUND`
  7. required endpoint 403 with remaining rate 0 → `GITHUB_RATE_LIMITED`
  8. required endpoint 500 → `EXTERNAL_SERVICE_ERROR`

- [x] **Step 2: Run focused GitHub tests**

  ```bash
  npm run test --workspace @ptop/api -- github-repository.client.error.spec.ts
  ```

  Expected: null node와 required/optional 오류 분류 테스트가 실패한다.

- [x] **Step 3: Implement normalization and request policy**

  `Array<T | null>`을 실제 GitHub GraphQL 계약으로 반영하고, 모든 `nodes`를 type guard로 필터링한다. `requestOptional`은 원인별 warning을 보존하되 throw하지 않고, `request`는 404/429/403-rate-limit/기타 status를 typed error로 변환한다. GraphQL `payload.errors`는 선택 기능이면 warning으로 낮추고, 필수 데이터에 GraphQL을 사용하게 될 경우에는 upstream error로 전파한다.

- [x] **Step 4: Run focused and full API tests**

  ```bash
  npm run test --workspace @ptop/api -- github-repository.client.error.spec.ts
  npm run typecheck:api
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/repository-analysis/infrastructure/github/github-repository.client.ts apps/api/src/repository-analysis/infrastructure/github/github-repository.fixtures.ts apps/api/src/repository-analysis/infrastructure/github/github-repository.client.error.spec.ts
  git commit -m "fix: GitHub 선택 데이터 null 응답을 안전하게 처리"
  ```

## Task 3: Separate Partial Analysis from Hard Failure

**Files:**
- Modify: `apps/api/src/repository-analysis/application/repository-analysis.service.ts`
- Test: `apps/api/src/repository-analysis/application/repository-analysis.error.spec.ts`

- [ ] **Step 1: Write service policy tests**

  다음 입력에 대한 결과를 고정한다.

  - optional data 없음: `200`, 분석 결과와 `warnings` 반환
  - 대상 GitHub ID 활동 없음: `200`, `technicalChallenges: []`, 경고 반환
  - AI key/model 없음: `200`, 후보 없음, AI 설정 warning 반환
  - AI JSON 형식 오류: `200`, 후보 없음, 검증 warning 반환
  - 필수 GitHub 데이터 접근 불가: typed error 전파
  - persistence 실패: typed persistence error 전파

- [ ] **Step 2: Run focused test and confirm failure**

  ```bash
  npm run test --workspace @ptop/api -- repository-analysis.error.spec.ts
  ```

- [ ] **Step 3: Implement explicit service boundaries**

  서비스는 “후보를 못 만들었다”와 “분석 요청을 처리하지 못했다”를 구분한다. AI 분석기는 이미 결과와 warning을 반환할 수 있으므로 provider 오류는 전체 500으로 승격하지 않고 분석 결과의 `warnings`로 유지한다. 반대로 required GitHub fetch와 persistence 실패는 typed error로 전파한다.

- [ ] **Step 4: Run focused test**

  ```bash
  npm run test --workspace @ptop/api -- repository-analysis.error.spec.ts
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/repository-analysis/application/repository-analysis.service.ts apps/api/src/repository-analysis/application/repository-analysis.error.spec.ts
  git commit -m "fix: 부분 분석과 분석 실패를 분리"
  ```

## Task 4: Make Persistence Failures Observable and Safe

**Files:**
- Modify: `apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.ts`
- Create: `apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.error.spec.ts`
- Create: `supabase/migrations/20260728030000_allow_discussion_project_evidence.sql`

- [ ] **Step 1: Add failing persistence tests**

  Test cases:

  - `analysis_results` insert error → typed persistence error
  - `contributor_metrics` insert error → pending analysis 삭제 호출
  - `analysis_evidence` constraint error → pending analysis 삭제 호출
  - 완료 update error → pending analysis 삭제 호출
  - Discussion/Project evidence insert → migration 기준으로 허용되는 payload

- [ ] **Step 2: Apply schema contract first**

  다음 migration을 적용한다.

  ```sql
  alter table public.analysis_evidence
    drop constraint analysis_evidence_type_valid;

  alter table public.analysis_evidence
    add constraint analysis_evidence_type_valid
    check (evidence_type in (
      'commit', 'pull_request', 'issue', 'discussion',
      'project', 'file', 'config', 'release'
    ));
  ```

- [ ] **Step 3: Preserve internal cause without exposing it to clients**

  persistence layer는 원본 Supabase error를 `cause` 또는 내부 logger metadata로 보존하고, controller에는 `ANALYSIS_PERSISTENCE_FAILED`만 전달한다. pending row 삭제가 실패해도 최초 저장 실패 원인을 덮어쓰지 않도록 cleanup 오류는 별도 로그로 기록한다.

- [ ] **Step 4: Run persistence tests and migration checks**

  ```bash
  npm run test --workspace @ptop/api -- repository-analysis.persistence.error.spec.ts
  supabase db reset
  npm run test:integration --workspace @ptop/api
  ```

  Expected: constraint 오류가 재현되지 않고, 실패 시 pending row가 남지 않는다.

- [ ] **Step 5: Commit**

  ```bash
  git add apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.ts apps/api/src/repository-analysis/infrastructure/persistence/repository-analysis.persistence.error.spec.ts supabase/migrations/20260728030000_allow_discussion_project_evidence.sql
  git commit -m "fix: 분석 저장 실패와 근거 타입 제약을 정리"
  ```

## Task 5: Add Frontend Error States

**Files:**
- Modify: `apps/web/src/features/repository-analysis/repositoryAnalysisApi.ts`
- Modify: `apps/web/src/features/repository-analysis/RepositoryAnalyzer.tsx`
- Test: `apps/web/src/features/repository-analysis/repositoryAnalysisApi.test.ts`

- [x] **Step 1: Add error mapping tests**

  Verify user-facing messages for:

  - invalid URL: GitHub URL 수정 안내
  - not found/private: 공개 Repository 또는 접근 권한 안내
  - rate limit: 잠시 후 재시도/토큰 설정 안내
  - upstream error: GitHub 일시 장애 안내
  - persistence error: 분석 결과 저장 실패 및 재시도 안내
  - partial success: 결과 화면을 열 수 있고 warning을 확인 가능

- [ ] **Step 2: Run focused web tests and confirm failure**

  ```bash
  npm run test --workspace @ptop/web -- repositoryAnalysisApi.test.ts
  ```

- [x] **Step 3: Implement status-specific UI**

  API 오류 code를 사용자 메시지로만 변환하고 내부 메시지는 노출하지 않는다. 선택 데이터 누락은 분석 결과의 warnings 영역에 표시하며, “분석 실패” 화면으로 보내지 않는다. 재시도 버튼은 현재 Repository URL과 GitHub ID를 보존한다.

- [x] **Step 4: Run web tests and build**

  ```bash
  npm run test:web
  npm run typecheck:web
  npm run build:web
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add apps/web/src/features/repository-analysis/repositoryAnalysisApi.ts apps/web/src/features/repository-analysis/RepositoryAnalyzer.tsx apps/web/src/features/repository-analysis/repositoryAnalysisApi.test.ts
  git commit -m "fix: 분석 오류별 사용자 안내를 분리"
  ```

## Task 6: Build the Error Scenario Matrix and Integration Checks

**Files:**
- Create: `apps/api/test/repository-analysis.integration-spec.ts`
- Create: `docs/testing/repository-analysis-error-matrix.md`
- Modify: `README.md` or `docs/document-map.md` only if the test runbook needs an index entry.

- [x] **Step 1: Document the scenario matrix**

  Include columns: scenario, fixture/Repository, required env, expected stage, expected status/code, expected warning/UI, cleanup.

  Required scenarios:

  | Scenario | Expected result |
  | --- | --- |
  | small public Repository | completed analysis |
  | `boostcampwm2025/web30-TADAK` | completed analysis after null/migration fixes |
  | no Discussion/Project | completed analysis with empty arrays |
  | private Repository without token | 404 `REPOSITORY_NOT_FOUND` |
  | invalid URL | 400 `INVALID_REPOSITORY_URL` |
  | GitHub rate limit fixture | 429 `GITHUB_RATE_LIMITED` |
  | GitHub 500 fixture | 502 `EXTERNAL_SERVICE_ERROR` |
  | AI key missing | completed with warning and no candidates |
  | AI invalid JSON | completed with validation warning |
  | target login has no activity | completed with targeted warning |
  | Supabase constraint/save rejection | 503 `ANALYSIS_PERSISTENCE_FAILED`, no pending row |

- [ ] **Step 2: Add opt-in integration tests**

  Integration tests must skip unless `PTOP_RUN_REPOSITORY_INTEGRATION=true`, and must use a fixed public Repository plus a disposable or hash-reused database path. Never use private user data in committed fixtures.

- [x] **Step 3: Run the complete verification set**

  ```bash
  npm run typecheck:api
  npm run typecheck:web
  npm run test:api
  npm run test:web
  npm run build:web
  npm run test:integration --workspace @ptop/api
  git diff --check
  ```

- [ ] **Step 4: Commit the runbook and integration coverage**

  ```bash
  git add apps/api/test/repository-analysis.integration-spec.ts docs/testing/repository-analysis-error-matrix.md
  git commit -m "test: Repository 분석 예외 시나리오를 문서화"
  ```

## Exit Criteria

- TADAK 분석이 Projects `null` 응답과 Discussion/Project evidence 저장을 통과한다.
- 선택 데이터가 없을 때 500이 아니라 완료 결과와 warning을 반환한다.
- 비공개/접근 불가 Repository, 잘못된 URL, rate limit, upstream 장애가 각각 예상된 code/status를 반환한다.
- AI 후보 생성 실패와 전체 분석 실패가 분리된다.
- Supabase 저장 실패 시 pending 분석이 남지 않는다.
- 프론트엔드가 오류 유형별로 재시도 또는 입력 수정 방법을 안내한다.
- API/web typecheck, unit test, build, opt-in integration test가 모두 통과한다.
