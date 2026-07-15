# PtoP Nest 모노레포 전환 설계

## 목표

기존 React + Vite 앱을 유지한 채 npm workspace 기반 모노레포로 전환하고, Supabase 및 GitHub API를 연결할 수 있는 Nest API의 최소 구조와 분석 결과 데이터 계약을 준비한다.

## 배경

PtoP의 분석 결과는 React 화면, Nest API, Supabase 저장 구조, 3주차 회고 초안 기능에서 같은 형태로 사용된다. 기존 루트 Vite 프로젝트에 API 코드를 섞지 않고, 웹과 서버를 분리하면서 공통 타입을 한 곳에서 관리한다.

## 범위

### 포함

- `apps/web`으로 기존 React + Vite 앱 이동
- `apps/api`에 Nest API 프로젝트 생성
- `packages/contracts`에 Repository 분석 요청과 결과 타입 정의
- 루트 `package.json`에 npm workspaces와 웹/API 실행 명령 정의
- Nest health endpoint와 `repository-analysis` 모듈 경계 구성
- Nest 서버 전용 `.env.example` 추가
- Issue #10의 데이터 모델·Supabase 저장 구조 문서화

### 제외

- Supabase CLI 로그인, `supabase link`, 원격 테이블 생성, migration 적용
- 실제 GitHub API 호출
- 실제 분석 결과 저장/조회 API 구현
- React와 Nest API 연결
- 로그인, Supabase Auth, 사용자별 분석 기록 조회

제외한 작업은 Supabase 접근이 확인된 뒤 별도 작업 단위로 진행한다. API가 준비되지 않은 상태에서 임의 mock 응답을 Nest 서버에서 반환하지 않는다.

## 구조

```text
Project/
├─ apps/
│  ├─ web/                         # React + Vite UI
│  │  ├─ src/
│  │  ├─ public/
│  │  ├─ index.html
│  │  └─ package.json
│  └─ api/                         # Nest API
│     ├─ src/
│     │  ├─ main.ts
│     │  ├─ app.module.ts
│     │  ├─ health/
│     │  └─ repository-analysis/
│     ├─ test/
│     ├─ .env.example
│     └─ package.json
├─ packages/
│  └─ contracts/
│     ├─ src/repository-analysis.ts
│     └─ package.json
├─ docs/
└─ package.json
```

## 패키지 역할

| 위치 | 역할 | 의존성 방향 |
| --- | --- | --- |
| `apps/web` | URL 입력, 로딩/오류/결과 화면을 렌더링한다. | `@ptop/contracts`만 참조한다. |
| `apps/api` | GitHub API 분석, Supabase 저장/조회, HTTP API를 담당한다. | `@ptop/contracts`를 참조한다. |
| `packages/contracts` | 웹과 API가 공유하는 순수 TypeScript 타입을 제공한다. | React, Nest, Supabase SDK를 의존하지 않는다. |

`packages/contracts`에는 실행 로직을 두지 않는다. Repository URL 파서처럼 순수 로직이 여러 곳에서 실제로 필요해질 때만 추후 `packages/repo-utils`로 분리한다.

## API 초안

이번 단계에서 동작하는 endpoint는 서버 상태 확인용 하나로 제한한다.

```text
GET /api/v1/health
200 { "status": "ok" }
```

`repository-analysis` 모듈은 등록만 하고, 분석 요청 endpoint는 실제 GitHub API와 Supabase 저장 흐름을 구현하는 다음 작업에서 추가한다. 실패나 미구현 상태를 가짜 분석 결과로 바꾸지 않는다.

## 공유 데이터 계약

향후 분석 요청은 다음 입력을 받는다.

```ts
export type RepositoryAnalysisRequest = {
  repositoryUrl: string;
  githubLogin?: string;
};
```

`githubLogin`은 선택값이다. Repository owner를 사용자 본인으로 가정하지 않고, 사용자가 자신의 GitHub ID를 입력하거나 참여자 목록에서 선택할 수 있도록 확장한다.

분석 결과의 최소 계약은 다음 정보를 포함한다.

```ts
export type RepositoryAnalysisResult = {
  id: string;
  repository: {
    url: string;
    owner: string;
    name: string;
    description: string | null;
    defaultBranch: string;
    languages: Record<string, number>;
  };
  contributors: Array<{
    login: string;
    commitCount: number;
    commitActivityPercent: number;
  }>;
  commits: Array<{
    sha: string;
    authorLogin: string | null;
    message: string;
    committedAt: string;
  }>;
  contributionSummary: {
    metric: "commit_count";
    notice: string;
  };
  analyzedAt: string;
};
```

`commitActivityPercent`는 commit 수 합계를 기준으로 계산한 활동 비중이다. 화면과 API 문서에서 이 값이 실제 기여도, 코드 품질, 작업 난이도를 의미하지 않는다는 안내를 함께 제공한다.

## Supabase 저장 초안

Issue #10의 한 테이블 요구사항을 따라 `analysis_results`를 사용한다. 초기에는 조회와 정렬에 필요한 값만 일반 컬럼으로 두고, GitHub 원본 응답과 가변 구조 데이터는 JSONB로 저장한다.

| 필드 | 형태 | 출처 | 목적 |
| --- | --- | --- | --- |
| `id` | UUID | DB 생성 | 분석 결과 식별자 |
| `repository_url` | text | GitHub 입력 | 같은 Repository 재분석 식별 |
| `repository_owner` | text | GitHub URL/API | Repository 맥락 표시 |
| `repository_name` | text | GitHub URL/API | Repository 맥락 표시 |
| `github_login` | text nullable | 사용자 입력 | 사용자가 선택한 본인 계정 |
| `status` | text | API | 분석 성공/실패 상태 |
| `repository_metadata` | jsonb | GitHub API | 설명, 기본 브랜치, 언어 등 |
| `contributors` | jsonb | GitHub API | 참여자와 commit 수 |
| `commits` | jsonb | GitHub API | 최근 커밋의 근거 데이터 |
| `contribution_summary` | jsonb | API 계산 | 계산 기준, 안내 문구, 활동 비중 |
| `created_at` | timestamptz | DB 생성 | 분석 생성 시점 |
| `updated_at` | timestamptz | DB 생성 | 갱신 시점 |

사용자의 회고 답변과 포트폴리오 초안은 아직 이 테이블에 저장하지 않는다. 사용자 인증·수정 이력 요구사항이 확정된 뒤 별도 테이블 또는 별도 JSONB 필드로 설계한다.

## 환경 변수 원칙

`apps/api/.env.example`에는 이름만 넣고 실제 값은 넣지 않는다.

```env
PORT=3000
WEB_ORIGIN=http://localhost:5173
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- `SUPABASE_SERVICE_ROLE_KEY`, DB 비밀번호, Supabase 개인 액세스 토큰은 서버 전용 비밀값이다.
- `VITE_` 접두사는 브라우저 번들에 노출되므로 서버 비밀값에 사용하지 않는다.
- 실제 값은 `apps/api/.env.local`에 보관하고 Git으로 추적하지 않는다.

## 검증 기준

- 루트에서 웹과 API의 build/typecheck 명령을 각각 실행할 수 있다.
- `GET /api/v1/health`가 200과 `{ "status": "ok" }`를 반환한다.
- React 앱의 Repository URL 입력과 mock 분석 흐름이 이동 후에도 기존과 동일하게 동작한다.
- `@ptop/contracts` 타입을 웹과 API 양쪽에서 import할 수 있다.
- `.env.example`에는 실제 비밀값이 없고, `.env.local`은 Git에서 제외된다.
