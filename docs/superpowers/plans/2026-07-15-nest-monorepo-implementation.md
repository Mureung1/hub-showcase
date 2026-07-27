# PtoP Nest Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 기존 React + Vite 앱을 npm workspace 모노레포로 이동하고, 공유 분석 계약과 검증 가능한 Nest API 초안을 추가한다.

**Architecture:** 루트는 npm workspace 명령과 공통 문서를 관리한다. `apps/web`은 기존 UI를 보존하고, `apps/api`는 health endpoint와 Repository 분석 모듈 경계만 제공하며, `packages/contracts`는 프레임워크에 의존하지 않는 TypeScript 타입을 제공한다.

**Tech Stack:** npm workspaces, React 19, Vite 6, TypeScript, NestJS, Jest, Supertest

## Global Constraints

- 작업 브랜치는 `week2-Day3`이다.
- `.github/`는 수정하지 않는다.
- `.env`와 Supabase 실제 비밀값은 읽거나 이동하거나 커밋하지 않는다.
- Supabase SDK, 원격 연결, migration, GitHub API 호출은 이번 범위에서 제외한다.
- Nest API는 임의 mock 분석 결과를 반환하지 않는다.
- 기존 `.gitignore` 사용자 변경을 보존한다.
- 자동 push를 하지 않는다.

---

### Task 1: npm workspace와 React 앱 이동

**Files:**
- Create: `apps/web/package.json`
- Move: `src/` → `apps/web/src/`
- Move: `index.html` → `apps/web/index.html`
- Move: `tsconfig.json` → `apps/web/tsconfig.json`
- Move: `vite.config.js` → `apps/web/vite.config.js`
- Move: `Logo-cropped.png` → `apps/web/Logo-cropped.png`
- Modify: `package.json`
- Modify: `prototype/index.html`
- Regenerate: `package-lock.json`

**Interfaces:**
- Produces: npm workspace `@ptop/web`
- Preserves: 기존 Repository URL parser와 mock 분석 화면

- [x] **Step 1: 기존 웹 테스트가 통과하는 기준을 기록한다**

Run:

```bash
npm test && npm run typecheck && npm run build
```

Expected: 5 tests pass, TypeScript exit 0, Vite build exit 0.

- [x] **Step 2: 기존 웹 파일을 `apps/web`으로 이동한다**

`RepositoryAnalyzer.tsx`의 `../../../Logo-cropped.png` import가 이동 후 `apps/web/Logo-cropped.png`를 계속 가리키도록 동일 상대 위치를 유지한다. `prototype/index.html`의 로고 경로는 `../apps/web/Logo-cropped.png`로 바꾼다.

- [x] **Step 3: 웹 workspace package를 정의한다**

`apps/web/package.json`:

```json
{
  "name": "@ptop/web",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "test": "node --import tsx --test src/**/*.test.ts",
    "typecheck": "tsc --noEmit",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

React/Vite 및 웹 전용 devDependencies는 이 package로 이동한다.

- [x] **Step 4: 루트 workspace 명령을 정의한다**

루트 `package.json`은 `apps/*`, `packages/*`를 workspace로 등록하고 `dev:web`, `dev:api`, `build`, `typecheck`, `test`, `deploy`를 각 workspace 명령으로 전달한다.

- [x] **Step 5: 의존성 잠금 파일을 갱신하고 웹 회귀 검증을 실행한다**

Run:

```bash
npm install
npm run test:web
npm run typecheck:web
npm run build:web
```

Expected: 기존 5 tests pass, TypeScript exit 0, `apps/web/dist` 생성.

### Task 2: 공통 Repository 분석 계약 추가

**Files:**
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/src/repository-analysis.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/src/features/repository-analysis/repositoryAnalysis.ts`

**Interfaces:**
- Produces: `RepositoryAnalysisRequest`, `RepositoryAnalysisResult`, `RepositoryContributor`, `RepositoryCommit`
- Consumed by: `@ptop/web`, `@ptop/api`

- [x] **Step 1: 프레임워크 독립 타입을 정의한다**

`RepositoryAnalysisRequest.repositoryUrl`은 필수이고 `githubLogin`은 선택값이다. 결과에는 Repository metadata, contributors, commits, `metric: "commit_count"`, `analyzedAt`을 포함한다.

- [x] **Step 2: 웹 URL parser가 공통 요청 타입을 참조하게 한다**

```ts
import type { RepositoryAnalysisRequest } from "@ptop/contracts";

export function parseGitHubRepositoryUrl(
  value: RepositoryAnalysisRequest["repositoryUrl"],
): ParsedRepositoryUrl | null {
  // 기존 파싱 동작 유지
}
```

- [x] **Step 3: contracts와 web 타입 검사를 실행한다**

Run:

```bash
npm run typecheck:contracts
npm run typecheck:web
```

Expected: both exit 0.

### Task 3: Nest API 초안과 health endpoint 구현

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/tsconfig.build.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/jest.config.cjs`
- Create: `apps/api/.env.example`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/health/health.controller.spec.ts`
- Create: `apps/api/src/health/health.controller.ts`
- Create: `apps/api/src/health/health.module.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.module.ts`
- Create: `apps/api/src/repository-analysis/repository-analysis.types.ts`

**Interfaces:**
- Consumes: `RepositoryAnalysisRequest`, `RepositoryAnalysisResult` from `@ptop/contracts`
- Produces: `GET /api/v1/health` → `{ status: "ok" }`

- [x] **Step 1: API package와 테스트 설정만 추가한다**

Nest dependencies는 `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`로 제한한다. 테스트에는 Jest와 `@nestjs/testing`을 사용한다.

- [x] **Step 2: health controller의 실패하는 테스트를 작성한다**

```ts
import { HealthController } from "./health.controller";

describe("HealthController", () => {
  it("returns the API health status", () => {
    const controller = new HealthController();

    expect(controller.getHealth()).toEqual({ status: "ok" });
  });
});
```

Run:

```bash
npm run test:api -- --runInBand
```

Expected: FAIL because `health.controller.ts` does not exist.

- [x] **Step 3: 최소 health controller와 module을 구현한다**

```ts
@Controller("health")
export class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}
```

Nest app은 global prefix `api/v1`, port `3000`, `WEB_ORIGIN` 기반 CORS를 설정한다.

- [x] **Step 4: Repository 분석 모듈의 타입 경계만 추가한다**

`repository-analysis.types.ts`는 공통 request/result 타입을 다시 export하고, module에는 controller나 service를 등록하지 않는다.

- [x] **Step 5: API 테스트·타입 검사·빌드를 실행한다**

Run:

```bash
npm run test:api -- --runInBand
npm run typecheck:api
npm run build:api
```

Expected: 1 test passes, TypeScript exit 0, Nest build exit 0.

### Task 4: 실행 문서와 전체 회귀 검증

**Files:**
- Modify: `README.md`
- Modify: `docs/document-map.md`

**Interfaces:**
- Documents: workspace install, web/API commands, health URL, contracts path, Supabase deferred scope

- [x] **Step 1: README 실행 방법을 workspace 기준으로 갱신한다**

개별 터미널에서 `npm run dev:web`, `npm run dev:api`를 실행하고 health URL이 `http://localhost:3000/api/v1/health`임을 명시한다.

- [x] **Step 2: 문서 지도에 설계·구현 계획 링크를 추가한다**

설계 문서와 이 구현 계획을 `docs/document-map.md`에서 찾을 수 있게 한다.

- [x] **Step 3: 전체 검증을 실행한다**

Run:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

Expected: web 5 tests + API 1 test pass, all workspace typechecks/builds exit 0, whitespace errors 0.

- [x] **Step 4: 비밀값과 작업 범위를 점검한다**

Run:

```bash
git status --short
git diff -- . ':!package-lock.json'
```

Expected: `.env` is not tracked, `.github/` is unchanged, user-owned `.gitignore` change is preserved.
