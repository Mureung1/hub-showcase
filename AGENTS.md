# PtoP Agent Guide

## 프로젝트

PtoP(Project to Portfolio)는 GitHub Repository를 분석해 대학생 개발자가 프로젝트 경험을 복기하고, 포트폴리오와 회고로 확장할 수 있는 작업 단서를 정리해주는 서비스다.

현재 MVP는 Repository URL을 입력하면 GitHub 공개 API를 통해 참여자, commit 수 기준 기여도, 최근 commit message 기반 주요 작업을 보여주는 흐름에 집중한다.

## 문제 정의

프로젝트 경험을 쌓는 대학생 개발자는 프로젝트가 끝난 뒤 시간이 지나면 자신이 맡은 역할, 기여도, 핵심 구현 내용, 문제 해결 과정을 정확히 기억하고 정리하기 어렵다.

## 핵심 기능

- Repository 분석 기능
  - GitHub Repository URL을 입력받는다.
  - GitHub API로 Repository 참여자와 commit 정보를 가져온다.
  - 참여자별 commit 수와 기여도 퍼센트를 보여준다.
- 작업 내용 정리 기능
  - Repository owner의 최근 commit message를 보여준다.
  - 사용자가 자신이 주로 어떤 작업을 했는지 복기할 수 있는 단서를 제공한다.

## 기술 스택

- Frontend: React + Vite
- Prototype: HTML + CSS + Vanilla JavaScript
- Backend 계획: NestJS
- API: GitHub REST API
- 문서: Markdown

## 모노레포 구조 계획

현재 프로젝트는 루트에 React/Vite 앱이 있는 구조지만, 실제 서비스화를 고려해 2주차 개발 전후로 모노레포 구조로 전환한다.

목표 구조:

```text
Project
├─ apps/
│  ├─ web/        # React + Vite 프론트엔드
│  └─ api/        # NestJS 백엔드
├─ docs/
├─ prototype/
├─ AGENTS.md
└─ README.md
```

구조 선택 이유:

- PtoP는 FE와 BE가 `Repository 입력 → 분석 요청 → 결과 표시` 흐름으로 강하게 연결되어 있어 한 저장소에서 관리하는 편이 효율적이다.
- `apps/web`과 `apps/api`를 분리하면 배포는 각각 독립적으로 진행할 수 있다.
- 추후 공통 타입이나 유틸이 필요해지면 `packages/shared`를 추가할 수 있다.
- 프로젝트가 커져 FE/BE 팀이나 배포 권한이 분리되는 시점이 오면 별도 레포 분리를 다시 검토한다.

배포 기준:

- `apps/web`: GitHub Pages 또는 Vercel 같은 정적 프론트엔드 배포 대상
- `apps/api`: Render, Railway, Fly.io, Vercel Serverless 등 별도 백엔드 배포 대상
- GitHub Pages는 NestJS 서버를 실행할 수 없으므로 UI 테스트용 React 배포에만 사용한다.

전환 시 주의할 점:

- 루트 React 구조를 모노레포로 옮길 때 기능 변경과 폴더 이동을 같은 커밋에 과하게 섞지 않는다.
- 기존 `prototype/`은 과제 제출용 정적 프로토타입으로 유지한다.
- 배포 설정은 `apps/web`과 `apps/api`의 root directory를 명확히 지정한다.
- Agent는 임의로 `client/`, `server/` 구조를 새로 만들지 말고 `apps/web`, `apps/api` 구조를 우선한다.

## 백엔드로 NestJS를 선택한 이유

처음에는 Express를 기본 백엔드 후보로 두었지만, PtoP는 앞으로 Repository 분석, GitHub API 연동, 사용자별 분석 기록, AI 요약, 포트폴리오 초안 생성처럼 기능이 단계적으로 늘어날 가능성이 크다.

NestJS는 Express보다 초기 구조가 무겁지만, module, controller, service 단위가 명확해서 기능이 늘어날 때 책임을 분리하기 쉽다. 또한 TypeScript 기반 구조를 기본으로 제공하므로 API 타입, DTO, validation, service 계층을 일관되게 관리하기 좋다.

따라서 단순 API 서버만 빠르게 만드는 목적이라면 Express가 적합하지만, PtoP처럼 2주차 이후 기능 확장과 유지보수를 고려하는 프로젝트에는 NestJS를 사용하는 방향으로 진행한다.

## 현재 MVP에서 하지 말 것

- API 실패 시 임의 분석 결과를 만들지 않는다.
- commit 수를 실제 기여도나 실력의 절대 지표처럼 표현하지 않는다.
- 사용자의 역할을 AI가 확정적으로 단정하지 않는다.
- 외부 UI 라이브러리는 별도 합의 없이 추가하지 않는다.
- 기획서에 없는 기능을 임의로 넓히지 않는다.
- 로고와 마스코트가 핵심 정보보다 더 크게 보이도록 배치하지 않는다.
- `.github/` 디렉토리와 GitHub Actions workflow는 사용자의 명시 요청 없이 수정하지 않는다.

## 디자인 원칙

- PtoP의 핵심 행동은 Repository URL 입력과 분석 시작이다.
- 첫 화면에서 사용자가 무엇을 입력해야 하는지 바로 보여야 한다.
- 색상은 흰색, 검정, 민트 중심으로 사용한다.
- 검정 border에 의존하지 않고 여백, 밝은 배경 면, 약한 그림자로 섹션을 구분한다.
- 마스코트는 보조 요소로만 사용하고 핵심 기능을 가리지 않는다.
- 모바일에서도 입력창, 버튼, 결과 카드의 텍스트가 잘리지 않아야 한다.

## 코드 컨벤션

- React 컴포넌트 이름은 PascalCase를 사용한다.
- 변수와 함수 이름은 camelCase를 사용한다.
- 불필요한 추상화보다 현재 기능 흐름을 읽기 쉽게 유지한다.
- API 실패, 빈 입력, 잘못된 URL 같은 상태를 명시적으로 처리한다.
- 주석은 복잡한 의사결정이 있는 곳에만 짧게 남긴다.

## 커밋 컨벤션

- `feat`: 기능 추가
- `fix`: 버그 수정
- `docs`: 문서 작성 또는 수정
- `style`: UI 스타일 수정
- `refactor`: 동작 변경 없는 코드 정리
- `test`: 테스트 케이스 추가
- `chore`: 환경 설정, 의존성, 빌드 설정

## 참고 문서

- 기획서: `docs/plan.md`
- Day4 작업 계획: `docs/day4-plan.md`
- 디자인 시스템: `docs/design-system.md`
- PtoP 디자인 Skill: `docs/ptop-design-skill.md`
- 작업 체크리스트: `docs/checklist.md`
- Repository 분석 학습 노트: `docs/repo-analysis-study.md`
- 테스트 케이스: `docs/test-cases.md`
- 기획 가이드: `docs/planning-tip.md`
- HTML/CSS 프로토타입: `prototype/index.html`
