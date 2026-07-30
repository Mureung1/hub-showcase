# ICU

ICU는 `I CODE U`의 약자로, 오늘의 학습 계획부터 코드 실습, 실행 피드백, 진도 관리, 오답 복습까지 한 흐름으로 연결하는 AI 코딩 튜터입니다. 저장소와 기획 문서에서는 `DevChat`이라는 이름도 사용하지만 사용자 화면의 제품명은 `ICU`입니다.

## 현재 구현

- 소개 및 학습 프로필 설정
- Today Learning Hub와 AI 커리큘럼 생성
- 생성 커리큘럼 보관함, 상세 보기, 다시 학습하기
- Monaco Editor 기반 Learning Workspace
- 별도 Judge API를 통한 JavaScript/JSX 실행
- Gemini 기반 커리큘럼 추천과 학습 튜터 질의
- 학습 진도 저장과 오늘의 진행 상태 복원
- Git Branching Lab과 시도 이력 저장
- 오답노트 자동·수동 작성, 상세 보기, 인라인 수정, 복습 상태 관리
- in-memory, SQLite, Supabase 저장소 adapter

Electron 패키징, 사용자 인증·데이터 분리, full RAG, Notion 동기화는 후속 범위입니다.

## 기술 스택

- Frontend: React, TypeScript, Vite, React Router, Zustand, CSS Modules
- Editor: Monaco Editor
- Backend: Node.js, Express
- Persistence: in-memory, SQLite, Supabase
- AI: Gemini API
- Deployment: Vercel(App/Preview Runtime), Render(Core API/Judge)
- Test: Vitest, TypeScript, ESLint, Prettier

## 로컬 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env`로 복사합니다. 실제 secret 값은 `.env`나 배포 서비스의 secret store에만 두고 `VITE_*` 변수에는 넣지 않습니다.

주요 환경 변수:

```env
# Frontend
VITE_CURRICULUM_RECOMMENDATION_MODE=server
VITE_ICU_API_MODE=server
VITE_API_BASE_URL=
VITE_CODE_RUNNER_BASE_URL=
VITE_ICU_PREVIEW_URL=http://127.0.0.1:5174/preview.html

# Core API / Judge
GEMINI_API_KEY=
GEMINI_MODEL=gemini-flash-latest
CURRICULUM_AGENT_PORT=8787
JUDGE_PORT=8790
ICU_ALLOWED_ORIGIN=

# Repository
ICU_REPOSITORY_MODE=in-memory
ICU_SQLITE_PATH=.icu/icu.sqlite
SUPABASE_URL=
SUPABASE_SECRET_KEY=
```

저장소 역할:

- `in-memory`: 테스트와 일회성 로컬 실행
- `sqlite`: 로컬·오프라인 영속 저장
- `supabase`: 배포 환경의 영속 저장

### 3. 전체 개발 환경 실행

```bash
npm run dev:server
```

다음 네 프로세스를 함께 실행합니다.

| 구성            | 주소                                 | 역할                                         |
| --------------- | ------------------------------------ | -------------------------------------------- |
| App             | `http://localhost:5173`              | ICU React 앱                                 |
| Preview Runtime | `http://127.0.0.1:5174/preview.html` | React 미리보기 격리                          |
| Core API        | `http://127.0.0.1:8787`              | 프로필, 커리큘럼, 진도, 오답, Git Lab, Tutor |
| Judge API       | `http://127.0.0.1:8790`              | 코드 실행                                    |

App, Preview Runtime, Core API 종료:

```bash
npm run dev:stop
```

현재 `dev:stop`은 Judge 포트 `8790`을 종료하지 않으므로 Judge는 실행 중인 터미널에서 별도로 종료합니다.

### 4. 검증

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

Supabase 설정을 사용한 읽기·쓰기 smoke test:

```bash
npm run smoke:supabase
```

## 주요 사용자 흐름

```text
/ → /profile → /today
                 ├─ /today/goal
                 ├─ /curriculum/history
                 ├─ /workspace
                 ├─ /mistake-notes
                 └─ /git-lab
```

기본 `server` mode에서는 화면 상태를 Express API로 불러오고 저장합니다. `mock` mode에서만 브라우저 localStorage fallback을 사용합니다.

## 프로젝트 구조

```text
hub/
├─ src/
│  ├─ app/                 # router, shell, app-level state
│  ├─ features/            # curriculum, workspace, progress, notes, profile, Git Lab
│  ├─ components/          # shared UI
│  └─ styles/              # global reset, typography, tokens
├─ backend/
│  ├─ http/                # Core API와 Judge entrypoints
│  ├─ modules/             # application/domain/adapters
│  └─ shared/              # env, CORS, repository, SQLite/Supabase helpers
├─ shared/curriculum/      # frontend/backend 공용 커리큘럼 catalog
├─ docs/                   # 제품, 기능, 아키텍처, 배포 문서
├─ scripts/                # 개발 서버, agent, 검증 스크립트
└─ .github/workflows/      # work 브랜치 검증·배포
```

## 배포

`work` 브랜치에 push하면 GitHub Actions가 타입 검사, lint, 테스트, 빌드를 먼저 수행합니다. 검증 통과 후 ICU App과 Preview Runtime을 Vercel에 배포하고 Render deploy hook으로 Core API와 Judge를 재배포합니다.

Render 서비스는 `render.yaml`에서 `work` 브랜치를 사용하며 자동 배포는 꺼져 있습니다. GitHub Actions deploy hook 또는 Render의 수동 배포를 사용합니다.

## 문서

- [MVP 개발 계획](./docs/plan.md)
- [사용자 흐름](./docs/user-flow.md)
- [아키텍처](./docs/architecture.md)
- [Supabase 저장 방식](./docs/features/supabase-persistence.md)
- [백엔드 안내](./backend/README.md)
- [배포 안내](./docs/deployment/render-vercel.md)
