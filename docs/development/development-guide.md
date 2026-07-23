# PtoP 개발 가이드

## 기술 스택

- Frontend: React + Vite
- Game UI: Phaser + Tiled
- Backend: NestJS
- Monorepo: npm workspaces
- Shared contracts: `packages/contracts`
- API: GitHub REST API
- Prototype: HTML + CSS + Vanilla JavaScript
- 문서: Markdown

## 모노레포 구조

PtoP는 실제 서비스화를 고려해 FE와 BE를 같은 저장소 안에서 분리 관리하는 모노레포 구조를 기준으로 한다.

현재 구조:

```text
Project
├─ apps/
│  ├─ web/        # React + Vite 프론트엔드
│  └─ api/        # NestJS 백엔드
├─ packages/
│  ├─ contracts/  # React와 Nest가 공유하는 분석 결과 타입
│  ├─ ui/         # PtoP 전용 UI 컴포넌트 후보
│  ├─ repo-utils/ # Repository URL, 활동 비중 계산 유틸 후보
│  └─ markdown/   # Markdown 변환 유틸 후보
├─ docs/
├─ prototype/
├─ AGENTS.md
└─ README.md
```

## Frontend 기능 구조

`apps/web`은 화면 종류가 아니라 기능 단위로 나눈다. React는 인증, 모달, API 상태와 접근성을 담당하고 Phaser는 맵 렌더링, 이동, 충돌과 상호작용 감지만 담당한다.

```text
apps/web/src/
├─ app/                         # 최상위 화면 전환과 provider
├─ components/                  # 여러 기능에서 공유하는 작은 UI
├─ features/
│  ├─ auth/
│  ├─ landing/
│  ├─ repository-analysis/
│  ├─ reflection/
│  └─ workspace/
│     ├─ WorkspaceGame.tsx      # React와 Phaser의 연결 지점
│     ├─ workspace.css
│     ├─ components/            # prompt, fallback list 등 React UI
│     ├─ game/
│     │  ├─ createWorkspaceGame.ts
│     │  ├─ WorkspaceScene.ts
│     │  ├─ InputManager.ts
│     │  └─ InteractionManager.ts
│     └─ model/                 # 이벤트와 에셋 경로 타입
├─ lib/                         # 외부 서비스 client
└─ styles/                      # token, reset, 공통 layout
```

### React와 Phaser 경계

- Phaser Scene은 Repository API, Supabase, 인증 상태를 직접 호출하지 않는다.
- Phaser는 `interaction-changed`, `open-new-analysis`처럼 UI 의도를 나타내는 이벤트만 React에 전달한다.
- React는 이벤트를 받아 모달을 열고 기존 분석 기능을 호출한다.
- 모달이 열리면 React가 게임 입력을 멈추고, 닫히면 입력과 focus를 복원한다.
- 배포 base path가 `/hub/`이므로 게임 에셋 경로는 `import.meta.env.BASE_URL`을 기준으로 만든다.

## 파일 책임 분리 기준

- 파일 하나는 한 가지 변경 이유를 갖도록 한다.
- 컴포넌트가 화면 렌더링, API 호출, 저장, 게임 입력을 함께 담당하면 기능별 hook, service 또는 manager로 분리한다.
- Phaser Scene에는 scene lifecycle과 orchestration만 두고 입력·충돌 대상 선택·이벤트 변환은 별도 모듈로 분리한다.
- 전역 `style.css`에 새 기능 스타일을 계속 추가하지 않는다. 작업실 스타일은 `features/workspace/workspace.css`처럼 기능 가까이에 둔다.
- 단순히 파일 길이를 줄이기 위한 wrapper는 만들지 않는다. 독립적으로 테스트하거나 교체할 수 있는 책임만 분리한다.
- 공통 컴포넌트는 실제로 두 곳 이상에서 같은 의미로 사용될 때 `components/`로 이동한다.

## NestJS API 기능 구조

`apps/api`는 역할별 전역 폴더보다 기능별 모듈을 우선한다. 현재 Repository 분석 기능은 하나의 NestJS feature module 안에서 HTTP 진입점, 분석 흐름, 순수 분석 로직, 외부 시스템 연결을 분리한다.

```text
apps/api/src/repository-analysis/
├─ repository-analysis.module.ts
├─ presentation/
│  └─ repository-analysis.controller.ts
├─ application/
│  ├─ repository-analysis.service.ts
│  └─ technical-challenge/
├─ domain/
│  ├─ repository-analysis.analyzer.ts
│  ├─ repository-analysis.models.ts
│  └─ repository-analysis.utils.ts
└─ infrastructure/
   ├─ github/
   ├─ ai/
   └─ persistence/
```

의존성은 `presentation → application → domain/port → infrastructure` 방향을 따른다. Controller가 GitHub API나 Supabase를 직접 호출하지 않도록 유지하며, WebSocket을 사용하지 않는 현재 구조에는 `gateway`를 추가하지 않는다.

## 모노레포를 선택한 이유

- PtoP는 `Repository 입력 → 분석 요청 → 결과 표시` 흐름에서 FE와 BE가 강하게 연결된다.
- 한 저장소에서 관리하면 API 타입, 분석 결과 구조, UI 반영을 함께 추적하기 쉽다.
- `apps/web`과 `apps/api`를 분리하면 배포는 각각 독립적으로 진행할 수 있다.
- 추후 공통 타입이나 유틸이 필요해지면 `packages/*`로 분리할 수 있다.
- FE/BE 팀이나 배포 권한이 분리되는 시점이 오면 별도 레포 분리를 다시 검토한다.

## 배포 기준

- `apps/web`: GitHub Pages 또는 Vercel 같은 정적 프론트엔드 배포 대상
- `apps/api`: Render, Railway, Fly.io, Vercel Serverless 등 별도 백엔드 배포 대상
- GitHub Pages는 NestJS 서버를 실행할 수 없으므로 UI 테스트용 React 배포에만 사용한다.

## NestJS를 선택한 이유

처음에는 Express를 기본 백엔드 후보로 둘 수 있지만, PtoP는 앞으로 Repository 분석, GitHub API 연동, 사용자별 분석 기록, AI 요약, 포트폴리오 초안 생성처럼 기능이 단계적으로 늘어날 가능성이 크다.

NestJS는 Express보다 초기 구조가 무겁지만, module, controller, service 단위가 명확해서 기능이 늘어날 때 책임을 분리하기 쉽다. 또한 TypeScript 기반 구조를 기본으로 제공하므로 API 타입, DTO, validation, service 계층을 일관되게 관리하기 좋다.

따라서 단순 API 서버만 빠르게 만드는 목적이라면 Express가 적합하지만, PtoP처럼 기능 확장과 유지보수를 고려하는 프로젝트에는 NestJS를 사용하는 방향으로 진행한다.

## 코드 컨벤션

- React 컴포넌트 이름은 PascalCase를 사용한다.
- 변수와 함수 이름은 camelCase를 사용한다.
- API route는 기능 중심으로 이름을 정한다.
- API 실패, 빈 입력, 잘못된 URL 같은 상태를 명시적으로 처리한다.
- 주석은 복잡한 의사결정이 있는 곳에만 짧게 남긴다.
- 불필요한 추상화보다 현재 기능 흐름을 읽기 쉽게 유지한다.
- Phaser 객체와 React 상태 사이에는 직렬화 가능한 이벤트 payload만 전달한다.
- game event 이름과 payload는 TypeScript union으로 관리한다.
- 외부 에셋을 추가할 때 `docs/research/game-asset-license.md`를 함께 갱신한다.

## 커밋 컨벤션

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 작성 또는 수정
- `style`: UI 스타일 수정
- `refactor`: 동작 변경 없는 코드 정리
- `test`: 테스트 케이스 추가
- `chore`: 환경 설정, 의존성, 빌드 설정

## 작업 시 주의할 점

- 기능 변경과 폴더 이동을 같은 커밋에 과하게 섞지 않는다.
- 기존 `prototype/`은 과제 제출용 정적 프로토타입으로 유지한다.
- 배포 설정은 `apps/web`과 `apps/api`의 root directory를 명확히 지정한다.
- Agent는 임의로 `client/`, `server/` 구조를 새로 만들지 말고 `apps/web`, `apps/api` 구조를 우선한다.
- `.github/` 디렉토리와 GitHub Actions workflow는 사용자의 명시 요청 없이 수정하지 않는다.
- UI 변경 전 `docs/design/design-system.md`와 `docs/design/game-workspace-design.md`를 확인한다.
- Scene이나 하나의 React 컴포넌트에 분석, 회고, 인증, 게임 로직을 한꺼번에 넣지 않는다.
