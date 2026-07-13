# AGENTS.md

이 파일은 모든 작업 세션의 공통 규칙이다. 상세 내용은 링크된 문서를 읽는다.

## 필수

- 작업 전 `git status --short`와 현재 브랜치를 확인한다.
- 작업 전 @docs/status.md와 요청 관련 문서를 읽는다.
- 문서 구조를 바꾸는 작업은 `project-document-manager` skill과 @docs/project-knowledge-map.md를 먼저 확인한다.
- 계획 작업은 `project-planning-agent` skill을 우선 사용하고 @docs/planning-agent.md를 근거 문서로 확인한다.
- 검증 작업은 `project-verification-agent` skill을 우선 사용하고 @docs/verification-agent.md를 근거 문서로 확인한다.
- 실제 코드가 문서와 다르면 차이를 먼저 보고한다.
- React + TypeScript + Vite 구조를 유지한다.
- 빌드 및 검증은 사용자에게 맡긴다. 임의로 매번 빌드하지 않는다.
- 구현, 검증, 계획을 구분해서 보고한다.
- 세션 종료 시 @docs/status.md를 실제 결과로 갱신한다.

## 금지

- TypeScript `any` 금지.
- 사용자 요청 없는 패키지 추가 금지.
- 사용자 요청 없는 전면 리팩터링 금지.
- 기존 사용자 변경 되돌리기 금지.
- 미구현 기능을 완료로 기록하지 않는다.
- 허가 없이 commit, push, PR 생성 금지.
- API Key, token, password, Supabase Key를 문서나 코드에 커밋하지 않는다.

## UI 규칙

- 첫 접속은 Profile Setup Wizard다.
- 기본 창은 오늘의 퀘스트와 매니저다.
- 창 상태 변화로 레이아웃 크기가 흔들리지 않게 한다.
- 미구현 확장 기능을 visible UI에 노출하지 않는다.
- 정적 HTML 버전은 시각/상호작용 기준안이다.
- React 버전은 실제 확장 구현 타깃이다.

## 디자인·에셋 규칙

- 디자인 작업 전 @docs/design-system.md를 확인한다.
- 에셋 생성 작업 전 @docs/asset-prompts/README.md를 확인한다.
- 참고 이미지의 역할은 @docs/design-references/README.md를 따른다.
- `public/assets/`는 실제 화면에 적용되는 에셋 위치다.
- `xp-desktop-pet-ui` skill은 Git 문서가 아니라 Codex 개인 환경의 외부 실행 규칙이다.

## 문서

- 문서 허브: @docs/README.md
- 문서 관계 지도: @docs/project-knowledge-map.md
- 최종 로드맵: @docs/master-plan.md
- 4주 일정: @docs/four-week-roadmap.md
- 오늘 계획: @docs/today-plan-2026-07-13.md
- 이번 주 계획: @docs/weekly-plan-2026-07-13.md
- 개발 Task 백로그: @docs/tasks.md
- GitHub Project 운영 가이드: @docs/github-project-guide.md
- 계획 수립 Agent: @docs/planning-agent.md
- 기능 검증 Agent: @docs/verification-agent.md
- 문서 관리 Agent: @docs/document-management-agent.md
- Agent 사용 가이드: @docs/agent-usage-guide.md
- 제품 기획: @docs/product-plan.md
- 사용자 흐름과 와이어프레임: @docs/user-flow-wireframes.md
- MVP 동작 계약: @docs/mvp-functional-spec.md
- Agent 로직: @docs/agent-design.md
- 디자인 토큰과 스타일: @docs/design-system.md
- 에셋 프롬프트: @docs/asset-prompts/README.md
- 디자인 참고 이미지: @docs/design-references/README.md
- MVP 이후 확장: @docs/future-expansion-plan.md
- 현재 상태: @docs/status.md
- 학습 인덱스: @docs/learning/README.md

문서는 `한 파일 = 한 역할`을 지킨다. 기획, 명세, 현황, 확장 계획을 서로 복사하지 않는다.