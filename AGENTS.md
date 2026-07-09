# AGENTS.md

이 파일은 모든 작업 세션의 공통 규칙이다. 상세 내용은 링크된 문서를 읽는다.

## 필수

- 작업 전 `git status --short`와 현재 브랜치를 확인한다.
- 작업 전 @docs/status.md와 요청 관련 문서를 읽는다.
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

## UI 규칙

- 첫 접속은 Profile Setup Wizard다.
- 기본 창은 오늘의 퀘스트와 매니저다.
- 창 상태 변화로 레이아웃 크기가 흔들리지 않게 한다.

## 문서

- 제품 기획: @docs/product-plan.md
- 사용자 흐름과 와이어프레임: @docs/user-flow-wireframes.md
- 디자인 토큰과 스타일: @docs/design-system.md
- MVP 동작 계약: @docs/mvp-functional-spec.md
- Agent 로직: @docs/agent-design.md
- MVP 이후 확장: @docs/future-expansion-plan.md
- 4주 일정: @docs/four-week-roadmap.md
- 현재 상태: @docs/status.md
- 문서 지도: @docs/README.md

문서는 `한 파일 = 한 역할`을 지킨다. 기획, 명세, 현황, 확장 계획을 서로 복사하지 않는다.

