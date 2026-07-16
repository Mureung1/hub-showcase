# PtoP Remote Supabase Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React에서 입력한 공개 GitHub Repository를 Nest가 분석해 원격 Supabase에 저장하고 실제 결과를 React에 반환하는 수직 슬라이스를 완성한다.

**Architecture:** React는 Nest의 `POST /api/v1/repository-analyses`만 호출한다. Nest는 GitHub REST Client로 원본 데이터를 수집하고 분석 Service에서 결과를 구성한 뒤 Supabase Persistence Service를 통해 네 테이블에 저장한다. Docker 로컬 서비스는 사용하지 않으며 원격 저장 통합 테스트는 고유 테스트 데이터 생성과 정리를 한 사이클로 검증한다.

**Tech Stack:** React 19, Vite, TypeScript, NestJS 11, Node fetch, `@supabase/supabase-js`, Jest, Supertest, Node test runner, Supabase PostgreSQL

## Global Constraints

- `SUPABASE_SECRET_KEY`와 선택적 `GITHUB_TOKEN`은 `apps/api/.env`에서만 읽는다.
- React는 Supabase에 직접 접근하지 않는다.
- Repository owner를 현재 사용자로 단정하지 않는다.
- commit 수 기준 활동 비율은 실제 기여도나 난이도로 표현하지 않는다.
- API 실패 시 mock 또는 임의 분석 결과를 반환하지 않는다.
- Docker 관련 config, seed, pgTAP 테스트, 실행 문서는 이번 커밋에 포함하지 않는다.
- `.github/` 디렉터리는 수정하지 않는다.

---

### Task 1: 공유 API 계약 정리

**Files:**
- Modify: `packages/contracts/src/repository-analysis.ts`
- Test: `packages/contracts` TypeScript typecheck

**Interfaces:**
- Produces: `RepositoryAnalysisRequest`, `RepositoryAnalysisResult`, `RepositoryAnalysisErrorResponse`
- Consumes: 없음

- [ ] **Step 1: 오류 응답과 요청·결과 타입을 명시한다**

`RepositoryAnalysisErrorResponse`에 `message`, `code`를 정의하고 기존 성공 타입은 유지한다.

- [ ] **Step 2: 계약 typecheck를 실행한다**

Run: `npm run typecheck:contracts`
Expected: exit 0

- [ ] **Step 3: 계약 변경만 커밋한다**

```bash
git add packages/contracts/src
git commit -m "feat: Repository 분석 API 계약 정리"
```

### Task 2: URL 파싱과 분석 계산 로직

**Files:**
- Create: `apps/api/src/repository-analysis/repository-analysis.utils.spec.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.utils.ts`

**Interfaces:**
- Produces: `parseGitHubRepositoryUrl(value)`, `calculateCommitActivityPercent(contributors)`, `createResultHash(input)`
- Consumes: GitHub contributor 내부 타입

- [ ] **Step 1: URL, 비율, 안정적인 hash 실패 테스트를 작성한다**

정상 URL과 `.git` suffix, 잘못된 host, contributor 합계 0, 반올림된 비율, 입력 key 순서가 달라도 같은 hash가 나오는 경우를 작성한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm run test:api -- repository-analysis.utils.spec.ts`
Expected: FAIL because utility module does not exist

- [ ] **Step 3: 최소 구현을 작성한다**

Node `createHash("sha256")`를 사용하고 정렬된 contributor/commit 입력만 hash에 포함한다.

- [ ] **Step 4: 테스트 통과를 확인한다**

Run: `npm run test:api -- repository-analysis.utils.spec.ts`
Expected: PASS

- [ ] **Step 5: 유틸리티를 커밋한다**

```bash
git add apps/api/src/repository-analysis/repository-analysis.utils.ts apps/api/src/repository-analysis/repository-analysis.utils.spec.ts
git commit -m "feat: Repository 분석 입력과 활동 비율 계산 추가"
```

### Task 3: GitHub REST Client

**Files:**
- Create: `apps/api/src/repository-analysis/github-repository.client.spec.ts`
- Create: `apps/api/src/repository-analysis/github-repository.client.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.models.ts`

**Interfaces:**
- Produces: `GitHubRepositoryClient.getRepositoryAnalysisSource(owner, repository)`
- Consumes: native `fetch`, optional `GITHUB_TOKEN`

- [ ] **Step 1: fetch 대역 기반 실패 테스트를 작성한다**

Repository, languages, contributors, commits 응답 변환과 `404`, `429`, 일반 GitHub 오류를 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm run test:api -- github-repository.client.spec.ts`
Expected: FAIL because client does not exist

- [ ] **Step 3: GitHub Client를 구현한다**

`per_page=100` 제한, `Accept: application/vnd.github+json`, `User-Agent: PtoP`를 사용하고 언어 byte 수를 비율로 변환한다.

- [ ] **Step 4: 테스트 통과를 확인한다**

Run: `npm run test:api -- github-repository.client.spec.ts`
Expected: PASS

- [ ] **Step 5: GitHub Client를 커밋한다**

```bash
git add apps/api/src/repository-analysis/github-repository.client.ts apps/api/src/repository-analysis/github-repository.client.spec.ts apps/api/src/repository-analysis/repository-analysis.models.ts
git commit -m "feat: 공개 GitHub Repository 데이터 수집 구현"
```

### Task 4: Supabase Client와 Persistence

**Files:**
- Modify: `apps/api/package.json`
- Modify: `package-lock.json`
- Create: `apps/api/src/supabase/supabase-client.service.spec.ts`
- Create: `apps/api/src/supabase/supabase-client.service.ts`
- Create: `apps/api/src/supabase/supabase.module.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.persistence.spec.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.persistence.ts`

**Interfaces:**
- Produces: `SupabaseClientService.client`, `RepositoryAnalysisPersistence.save(input)`
- Consumes: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, 분석 저장 모델

- [ ] **Step 1: Supabase 설정 실패 테스트를 작성한다**

환경 변수 누락 시 Secret을 포함하지 않는 명확한 설정 오류가 발생하는지 확인한다.

- [ ] **Step 2: Persistence 호출 순서 실패 테스트를 작성한다**

Repository upsert, 기존 hash 조회, pending 분석 생성, contributor/evidence 저장, completed 갱신, 실패 cleanup을 Supabase query builder 대역으로 검증한다.

- [ ] **Step 3: 실패를 확인한다**

Run: `npm run test:api -- supabase-client.service.spec.ts repository-analysis.persistence.spec.ts`
Expected: FAIL because services do not exist

- [ ] **Step 4: Supabase SDK와 저장 계층을 구현한다**

`@supabase/supabase-js`를 API workspace에 설치하고 서버 전용 Client를 제공한다. 저장 실패 시 새 analysis row를 삭제하고 원래 오류를 다시 던진다.

- [ ] **Step 5: 테스트 통과를 확인한다**

Run: `npm run test:api -- supabase-client.service.spec.ts repository-analysis.persistence.spec.ts`
Expected: PASS

- [ ] **Step 6: Supabase 계층을 커밋한다**

```bash
git add apps/api/package.json package-lock.json apps/api/src/supabase apps/api/src/repository-analysis/repository-analysis.persistence.ts apps/api/src/repository-analysis/repository-analysis.persistence.spec.ts
git commit -m "feat: Supabase Repository 분석 저장 계층 추가"
```

### Task 5: 분석 Service와 Controller

**Files:**
- Create: `apps/api/src/repository-analysis/repository-analysis.service.spec.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.service.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.controller.spec.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.controller.ts`
- Modify: `apps/api/src/repository-analysis/repository-analysis.module.ts`
- Create: `apps/api/test/repository-analysis.e2e-spec.ts`

**Interfaces:**
- Produces: `RepositoryAnalysisService.analyze(request)`, `POST /api/v1/repository-analyses`
- Consumes: GitHub Client, Persistence, shared API contracts

- [ ] **Step 1: Service와 Controller 실패 테스트를 작성한다**

요청 orchestration, 잘못된 URL `400`, 성공 `201`, GitHub `404/429`, 외부 연동 실패 `502`를 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm run test:api -- repository-analysis.service.spec.ts repository-analysis.controller.spec.ts repository-analysis.e2e-spec.ts`
Expected: FAIL because Service and Controller do not exist

- [ ] **Step 3: Service, Controller, Module 연결을 구현한다**

Controller는 검증과 HTTP 변환만 수행하고 Service는 수집, 계산, hash, 저장 흐름을 조정한다.

- [ ] **Step 4: 테스트 통과를 확인한다**

Run: `npm run test:api -- repository-analysis.service.spec.ts repository-analysis.controller.spec.ts repository-analysis.e2e-spec.ts`
Expected: PASS

- [ ] **Step 5: API 수직 슬라이스를 커밋한다**

```bash
git add apps/api/src/repository-analysis apps/api/test/repository-analysis.e2e-spec.ts
git commit -m "feat: Repository 분석 Nest API 구현"
```

### Task 6: React 실제 API 연결

**Files:**
- Create: `apps/web/src/features/repository-analysis/repositoryAnalysisApi.test.ts`
- Create: `apps/web/src/features/repository-analysis/repositoryAnalysisApi.ts`
- Modify: `apps/web/src/features/repository-analysis/RepositoryAnalyzer.tsx`
- Modify: `apps/web/src/features/repository-analysis/AnalysisResult.tsx`
- Modify: `apps/web/src/features/repository-analysis/repositoryAnalysis.ts`
- Modify: `apps/web/src/features/repository-analysis/repositoryAnalysis.test.ts`

**Interfaces:**
- Produces: `requestRepositoryAnalysis(request, fetchImpl?)`
- Consumes: `POST /api/v1/repository-analyses`, `RepositoryAnalysisResult`

- [ ] **Step 1: API Client 실패 테스트를 작성한다**

요청 URL과 body, 성공 응답, JSON 오류 응답, 네트워크 오류를 검증한다.

- [ ] **Step 2: 실패를 확인한다**

Run: `npm run test:web -- repositoryAnalysisApi.test.ts`
Expected: FAIL because API client does not exist

- [ ] **Step 3: API Client와 화면 연결을 구현한다**

mock wait와 mock result를 제거하고 기존 loading/error UI를 실제 요청 상태에 연결한다. 결과 화면은 shared contract의 contributor와 commit을 표시한다.

- [ ] **Step 4: React 테스트 통과를 확인한다**

Run: `npm run test:web`
Expected: PASS with no mock-result tests remaining

- [ ] **Step 5: React 연결을 커밋한다**

```bash
git add apps/web/src/features/repository-analysis
git commit -m "feat: React Repository 분석 화면을 Nest API에 연결"
```

### Task 7: 원격 Supabase 저장 통합 테스트

**Files:**
- Create: `apps/api/test/repository-analysis.persistence.integration-spec.ts`
- Modify: `apps/api/package.json`
- Modify: `package.json`
- Modify: `apps/api/.env.example`
- Include: `supabase/migrations/20260716060823_create_repository_analysis_schema.sql`
- Include: `supabase/migrations/20260716064914_grant_repository_analysis_service_role.sql`

**Interfaces:**
- Produces: `npm run test:api:integration`
- Consumes: 원격 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`

- [ ] **Step 1: 원격 권한 migration을 확인하고 적용한다**

Run: `npx supabase db push --dry-run`
Expected: permission migration만 pending

Run: `npx supabase db push`
Expected: remote migration applied

- [ ] **Step 2: 원격 저장 통합 테스트를 작성한다**

매 실행마다 UUID와 고유 GitHub Repository ID를 생성한다. 네 테이블 저장, 관계 조회, Repository 삭제 후 cascade를 확인하고 `finally`에서 데이터를 삭제한다.

- [ ] **Step 3: 명시적 환경 플래그 없이 skip되는지 확인한다**

Run: `npm run test:api:integration`
Expected: skipped unless `RUN_SUPABASE_INTEGRATION=1`

- [ ] **Step 4: 원격 통합 테스트를 실행한다**

Run: `RUN_SUPABASE_INTEGRATION=1 npm run test:api:integration`
Expected: PASS and no test rows remain

- [ ] **Step 5: migration과 통합 테스트를 분리 커밋한다**

```bash
git add supabase/migrations apps/api/test/repository-analysis.persistence.integration-spec.ts apps/api/package.json apps/api/.env.example package.json package-lock.json
git commit -m "test: 원격 Supabase 분석 저장 흐름 검증"
```

### Task 8: 문서와 전체 검증

**Files:**
- Modify: `README.md`
- Modify: `docs/development/supabase-data-model.md`
- Include: `docs/superpowers/specs/2026-07-16-remote-supabase-vertical-slice-design.md`
- Include: `docs/superpowers/plans/2026-07-16-remote-supabase-vertical-slice-implementation.md`

**Interfaces:**
- Produces: 원격 Supabase 우선 개발·검증 절차
- Consumes: 구현된 실행 명령

- [ ] **Step 1: Docker 우선 실행 문구를 제거한다**

README와 데이터 모델 문서는 React/Nest/원격 Supabase 실행 순서와 Docker 재도입 조건만 설명한다. Docker config, seed, pgTAP 파일은 stage하지 않는다.

- [ ] **Step 2: 전체 검증을 실행한다**

Run: `npm test`
Expected: all workspace tests PASS

Run: `npm run typecheck`
Expected: exit 0

Run: `npm run build`
Expected: exit 0

Run: `git diff --check`
Expected: no output

- [ ] **Step 3: Docker 파일이 commit 대상에서 제외됐는지 확인한다**

Run: `git status --short`
Expected: `supabase/config.toml`, `supabase/seed.sql`, `supabase/tests/`는 untracked 또는 unstaged이고 commit 목록에는 없음

- [ ] **Step 4: 문서를 커밋한다**

```bash
git add README.md docs/development/supabase-data-model.md docs/superpowers/specs/2026-07-16-remote-supabase-vertical-slice-design.md docs/superpowers/plans/2026-07-16-remote-supabase-vertical-slice-implementation.md
git commit -m "docs: 원격 Supabase 수직 슬라이스 개발 흐름 정리"
```
