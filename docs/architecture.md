# ICU Architecture Guide

## 결론

ICU는 다음 원칙을 사용합니다.

- Modular Monolith: 기능별 모듈을 한 저장소에서 관리
- Vertical Slice: 화면과 사용자 흐름 단위로 frontend 기능 구성
- Lightweight Hexagonal Architecture: LLM, DB, 실행기, 파일을 adapter로 분리
- REST API: React, Core API, Judge 사이의 contract 명시
- 가벼운 DDD: `profile`, `curriculum`, `learning-progress`, `mistake-notes`, `git-lab`, `code-runner` 경계 유지

모든 계층을 풀스펙으로 만들지 않고 외부 의존성 교체와 데이터 손실 방지에 필요한 만큼만 분리합니다.

## 런타임 구조

```text
React App (5173)
  ├─ Core API (8787)
  │    ├─ application / domain
  │    ├─ Gemini provider
  │    └─ repository adapter
  │         ├─ in-memory
  │         ├─ SQLite
  │         └─ Supabase
  ├─ Judge API (8790)
  │    └─ JavaScript/JSX runner
  └─ Preview Runtime (5174)
       └─ isolated React preview
```

Frontend는 provider secret이나 Supabase secret key를 읽지 않습니다.

## Frontend

```text
src/
  app/                       router, AppShell, API URL
  pages/                     route-level intro
  features/
    profile/
    today-learning/
    curriculum/
    learning-workspace/
    learning-progress/
    mistake-notes/
    git-lab/
  components/                shared UI
  styles/                    global reset, typography, tokens
```

### 상태 관리

- Zustand는 화면 상태, 선택 상태, optimistic state를 관리합니다.
- 기본 server mode에서는 API 응답으로 store를 hydrate합니다.
- mock mode에서만 localStorage snapshot을 fallback으로 사용합니다.
- 생성 커리큘럼, 진도, 오답은 각 feature store가 소유하지만 server contract를 공유합니다.

### 주요 화면 연결

| 화면               | Route                 | 서버 연결                                      |
| ------------------ | --------------------- | ---------------------------------------------- |
| Intro              | `/`                   | 없음                                           |
| Profile            | `/profile`            | Core profile API                               |
| Today Hub          | `/today`              | profile, curriculum, progress, notes, attempts |
| Curriculum Goal    | `/today/goal`         | curriculum recommend/generated                 |
| Curriculum History | `/curriculum/history` | curriculum history/generated                   |
| Workspace          | `/workspace`          | curriculum, progress, tutor, Judge             |
| Mistake Notes      | `/mistake-notes`      | mistake notes                                  |
| Add Mistake Note   | `/mistake-notes/new`  | mistake notes                                  |
| Git Lab            | `/git-lab`            | attempts, mistake notes                        |

## Backend

```text
backend/
  http/
    server.mjs               Core API
    judgeServer.mjs          Judge API
    *Routes.mjs
  modules/
    profile/
    curriculum/
    learning-progress/
    mistake-notes/
    git-lab/
    code-runner/
    knowledge/
  shared/
    env.mjs
    http.mjs
    sqliteDatabase.mjs
    supabaseClient.mjs
    repositoryError.mjs
```

일반적인 요청 흐름:

```text
HTTP route
  → application service
  → domain validation
  → repository/provider adapter
```

Route는 request parsing, status, response mapping을 담당하고 저장·검증 규칙은 application/domain에 둡니다.

## Core API

```text
GET    /api/health

GET    /api/profile
PUT    /api/profile
DELETE /api/profile

POST   /api/curriculum/recommend
GET    /api/curriculum/generated
POST   /api/curriculum/generated
DELETE /api/curriculum/generated
DELETE /api/curriculum/generated/:id
GET    /api/curriculum/history

GET    /api/progress/today
POST   /api/progress/missions/:missionId
DELETE /api/progress/missions/:missionId
DELETE /api/progress

GET    /api/mistake-notes
POST   /api/mistake-notes
PATCH  /api/mistake-notes/:noteId
DELETE /api/mistake-notes/:noteId
DELETE /api/mistake-notes

GET    /api/git-lab/attempts
POST   /api/git-lab/attempts
DELETE /api/git-lab/attempts

POST   /api/tutor/ask
```

## Judge API

```text
GET  /api/health
POST /api/code/run
```

코드 실행을 Core API와 별도 프로세스로 분리해 장애와 배포 경계를 나눕니다. 현재 runner는 JavaScript/JSX 학습 피드백용이며 강한 sandbox 격리는 후속 범위입니다.

## Repository Modes

동일한 application contract 아래에서 `ICU_REPOSITORY_MODE`로 adapter를 선택합니다.

| Mode        | 용도               | 영속성                |
| ----------- | ------------------ | --------------------- |
| `in-memory` | 테스트·일회성 실행 | 서버 재시작 시 초기화 |
| `sqlite`    | 로컬·오프라인      | `.icu/icu.sqlite`     |
| `supabase`  | 배포 환경          | Supabase PostgreSQL   |

저장 대상:

- learner profile
- generated curriculum snapshots
- mission progress
- mistake notes
- Git Lab attempts

인증과 사용자별 row 분리는 아직 후속 과제입니다.

## Provider와 지식 데이터

- Curriculum과 Tutor는 서버의 Gemini provider를 사용합니다.
- API key는 `GEMINI_API_KEY`에서만 읽습니다.
- 커리큘럼 catalog는 `shared/curriculum/*.json`을 사용합니다.
- 공식 문서 chunk는 `data/*.jsonl`에서 로드합니다.
- full embedding/vector retrieval은 아직 구현하지 않습니다.

## 배포 경계

```text
Vercel App ───────→ Render Core API ───────→ Supabase
     │
     ├────────────→ Render Judge API
     │
     └─ postMessage ↔ Vercel Preview Runtime
```

- Render 서비스는 `work` 브랜치를 기준으로 구성합니다.
- GitHub Actions 검증 통과 후 Vercel 두 프로젝트와 Render deploy hook을 실행합니다.
- `ICU_ALLOWED_ORIGIN`으로 API 접근 origin을 제한합니다.
- App과 Preview Runtime은 `VITE_ICU_APP_ORIGINS`와 postMessage 검증을 사용합니다.

## 후속 강화

- Supabase Auth와 사용자별 데이터 분리
- Gemini timeout, retry, observability
- Judge 프로세스·파일시스템·컨테이너 격리
- Python 등 추가 언어 runner
- Electron Main Process와 IPC
- full RAG와 Notion adapter

## 선택하지 않는 것

- 지금 Microservices로 세분화하지 않습니다.
- 모든 파일에 DDD entity와 repository interface를 강제하지 않습니다.
- React에서 provider API key나 Supabase secret key를 읽지 않습니다.
- Core API에 코드 실행을 다시 합치지 않습니다.
