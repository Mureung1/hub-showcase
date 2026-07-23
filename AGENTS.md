# PtoP Agent Guide

## 프로젝트

PtoP(Project to Portfolio)는 GitHub Repository의 객관적인 근거와 사용자의 짧은 회고를 결합해 대학생 개발자가 프로젝트 경험을 복기하고, 포트폴리오에 활용할 단서를 찾도록 돕는 서비스다.

현재 MVP는 GitHub 로그인 후 2D 작업실에서 Repository 분석을 시작하고, 분석 중 Poppy 회고를 작성한 뒤 근거와 개인 경험을 합친 결과를 확인하는 흐름에 집중한다.

## 작업 원칙

- 기획서에 없는 기능을 임의로 넓히지 않는다.
- API 실패 시 임의 분석 결과를 만들지 않는다.
- commit 수를 실제 기여도나 실력의 절대 지표처럼 표현하지 않는다.
- 사용자의 역할을 AI가 확정적으로 단정하지 않는다.
- 외부 UI 라이브러리는 별도 합의 없이 추가하지 않는다.
- `.github/` 디렉토리와 GitHub Actions workflow는 사용자의 명시 요청 없이 수정하지 않는다.
- UI 또는 시각적 인터랙션을 작업하기 전 `@docs/design/design-system.md`를 확인하고, 색상·컴포넌트·모션 규칙을 따른다.
- 애니메이션은 상태 변화와 사용자 피드백을 설명하는 범위에서만 사용하고, `prefers-reduced-motion`과 키보드 focus 상태를 함께 지원한다.
- 디자인 시스템과 다른 UI가 필요하면 임의로 덮어쓰지 말고, 먼저 디자인 시스템 문서의 예외 또는 규칙을 갱신한다.
- 게임 UI 작업 전 `@docs/design/game-workspace-design.md`와 `@docs/research/game-asset-license.md`를 확인한다.
- 외부 에셋은 라이선스와 출처를 기록하기 전 Repository에 추가하지 않는다.
- 파일 하나에 화면 렌더링, API 호출, 저장, 게임 입력을 함께 넣지 않는다.
- 새 기능의 스타일을 전역 `style.css`에 누적하지 않고 기능 폴더 가까이에 둔다.

## 기술 기준

- Frontend: React + Vite
- Game UI: Phaser + Tiled
- Backend: NestJS
- Monorepo: npm workspaces (`apps/web`, `apps/api`, `packages/contracts`)
- API: GitHub REST API
- Prototype: HTML + CSS + Vanilla JavaScript
- 문서: Markdown

## 코드 기준

- React 컴포넌트 이름은 PascalCase를 사용한다.
- 변수와 함수 이름은 camelCase를 사용한다.
- API 실패, 빈 입력, 잘못된 URL 상태를 명시적으로 처리한다.
- 불필요한 추상화보다 현재 기능 흐름을 읽기 쉽게 유지한다.
- React는 인증, 모달, API 상태를 담당하고 Phaser는 렌더링, 이동, 충돌, 상호작용 감지만 담당한다.
- Phaser Scene에서 API, Supabase, 인증 client를 직접 호출하지 않는다.

## 참고 문서

- 문서 구조: `docs/document-map.md`
- 기획서: `docs/plans/plan.md`
- 개발 가이드: `docs/development/development-guide.md`
- 프로젝트 기록: `docs/records/agent-record.md`
- Week2 계획: `docs/plans/week2-plan.md`
- 계획 Agent: `docs/agents/week-planning-agent.md`
- 기능 검증 Agent: `docs/agents/feature-verification-agent.md`
- Agent RULES 학습: `docs/agents/agent-rules-study.md`
- 디자인 시스템: `docs/design/design-system.md`
- 디자인 Skill: `docs/design/ptop-design-skill.md`
- 게임형 작업실 설계: `docs/design/game-workspace-design.md`
- 게임 에셋 라이선스: `docs/research/game-asset-license.md`
- 개발 Task: `docs/plans/development-tasks.md`
- Repository 분석 학습 노트: `docs/research/repo-analysis-study.md`
- Nest 모노레포 설계: `docs/superpowers/specs/2026-07-15-nest-monorepo-design.md`
- PtoP 설문 생성 스크립트: `docs/research/ptop-survey-google-form.gs`
- 테스트 케이스: `docs/testing/test-cases.md`
- PR 템플릿: `docs/templates/pr-template.md`
