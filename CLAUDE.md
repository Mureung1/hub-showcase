# CLAUDE.md — Claude Code 전용 지침

공통 작업 규칙·기술 스택·Source of Truth 우선순위는 [AGENTS.md](AGENTS.md)에 있다. 이 파일은 그것을 **참조**하고, Claude Code 전용 사항과 현재 상태만 담는다. 내용이 겹치면 AGENTS.md가 진실 소스이며, 중복해서 관리하지 않는다.

## 항상

- 작업 지시를 받으면 [docs/instructions.md](docs/instructions.md) 절차를 따른다.
- 계약 착수 전 [docs/skills.md](docs/skills.md)의 해당 S 섹션을, 완료조건으로 [docs/checklist.md](docs/checklist.md)의 해당 C 섹션을 읽는다.
- Agent 루프(Feat-4) 관련 작업은 [docs/etc/agent-design.md](docs/etc/agent-design.md)(동결된 설계)를 근거로 한다.

## 안전 원칙 (최우선)

- **`upstream`(팀 원본 저장소)으로 절대 push 금지.** push는 `origin`(개인 포크)으로만 한다. 반드시 현재 위치(`team/hub`)에서만 작업하고 그 밖으로 나가지 않는다. ([docs/etc/commit-rules.md](docs/etc/commit-rules.md) 0절)
- 비밀 키(`UPSTAGE_API_KEY`, `NOTION_TOKEN` 등)는 `.env.local`에만. 절대 코드·문서·커밋·로그에 값을 노출하지 않는다.
- 파괴적 작업(파일 삭제, `git reset/checkout/clean`) 전 `git status`로 확인하고, 미커밋 변경이 있으면 먼저 보고한다.
- 외부 자격증명이 없어 진행 불가하면 억지로 우회하지 말고 `BLOCKED`로 멈춰 보고한다.

## 제품 경계

- 범위는 [docs/backlog.md](docs/backlog.md)의 T01~T15 + [docs/dev-plan.md](docs/dev-plan.md). Phase 2 백로그(2분 스타터·통계·화이트노이즈 등)와 선제적 개입은 **지금 구현하지 않는다**.
- checklist에 없는 기능을 임의 추가하지 않는다. 필요하면 문서(skills/backlog/checklist)를 먼저 갱신하고 구현한다.

## 현재 구현 상태 (작업 시 갱신)

- **완료**: 화면 뼈대(6개 화면 조건부 렌더링, `docs/etc/component-tree.md`), Notion 연동 기반(`app/lib/notion.js`, T01), Brain Dump category 확장 + Notion 저장(T02), One-Focus View 실데이터 연결(T03) — `/api/steps`로 Notion에서 오늘 할 일을 읽어와 순회하고, 완료 시 `/api/steps/complete`로 Done 갱신.
- **진행/예정**: Full Screen Timer 지속성(T04)부터. Agent 루프(Feat-4)는 설계 동결, 미구현.
- **아직 mock/미완**: AgentLog 미구현, "힘들어" 버튼은 여전히 고정 `RestSuggestion`로 직행.

## 현재 실행 명령

- 개발 서버: `npm run dev`
- 검증: `npm run verify` (lint + build)
- 필요한 환경변수는 [docs/prerequisites.md](docs/prerequisites.md).

## 보고 (필수)

작업 종료 시 [docs/report/report_claude.md](docs/report/report_claude.md)에 `cat >>`로 append(파일 읽지 말 것). 마지막 줄에 `- 확인: [ ]` 포함. 리뷰 반영은 [docs/report/review.md](docs/report/review.md) B절.

## Claude Code 커스텀 에이전트

`.claude/agents/`의 plan-agent(작업 분해·우선순위)·verify-agent(완료조건 점검)는 아직 초안이다. 검증 방식이 안정되기 전엔 실전 판단의 최종 근거로 삼지 않는다.
