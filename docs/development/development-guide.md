# PtoP 개발 가이드

## 기술 스택

- Frontend: React + Vite
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
