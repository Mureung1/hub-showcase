# 전자 매니저 키우기 문서 허브

이 폴더는 XP 데스크톱형 전자 생물 매니저 MVP의 기획, 화면 설계, 기능 명세, 디자인, 에셋 생성, 작업 계획을 역할별로 관리한다.

문서 원칙은 `한 파일 = 한 역할`이다. 문서 간 상하 관계와 파생 구조는 [project-knowledge-map.md](project-knowledge-map.md)에 둔다.

## 먼저 볼 문서

| 문서 | 역할 |
|---|---|
| [../README.md](../README.md) | 저장소 첫 화면, 프로젝트 소개, 실행 방법 |
| [../AGENTS.md](../AGENTS.md) | Codex 작업 규칙, 금지사항, 필수 참고 문서 |
| [master-plan.md](master-plan.md) | 7월 30일까지의 최종 로드맵 |
| [project-knowledge-map.md](project-knowledge-map.md) | 문서 간 관계, skill/asset 연결성, 계층 지도 |
| [tasks.md](tasks.md) | GitHub Issue/Project 등록 단위의 개발 Task 백로그 |
| [plans/completed/harness-recommended-implementation-2026-07-14.md](plans/completed/harness-recommended-implementation-2026-07-14.md) | 완료된 Recommended 하네스 구축 계획 |

## 계획·운영 문서

| 문서 | 역할 | Wiki 권장 페이지 |
|---|---|---|
| [master-plan.md](master-plan.md) | 전체 목표, 주차별 계획, 기술 구조, 확장 반영 방식 | 최종 로드맵 |
| [today-plan-2026-07-13.md](today-plan-2026-07-13.md) | 2026-07-13 오늘 할 일과 완료 기준 | 오늘 계획 |
| [weekly-plan-2026-07-13.md](weekly-plan-2026-07-13.md) | 2주차 요일별 계획 | 2주차 계획 |
| [four-week-roadmap.md](four-week-roadmap.md) | 7월 30일까지의 주차별 일정표 | 4주 개발 계획 |
| [tasks.md](tasks.md) | 우선순위가 표시된 전체 개발 Task 백로그 | 개발 Task 백로그 |
| [github-project-guide.md](github-project-guide.md) | GitHub Issues/Projects 보드, 필드, 우선순위 표시 방식 | GitHub Project 운영 가이드 |
| [status.md](status.md) | 완료, 검증, 다음 작업, 차단 요소 | 진행 상황 |
| [architecture-data-flow.md](architecture-data-flow.md) | React 화면, Hono API, Supabase DB, asset manifest의 데이터 흐름 구조도와 코드 스키마 | Architecture Data Flow |
| [api-contracts.md](api-contracts.md) | Hono Quest Event API 요청/응답 계약 | API Contracts |
| [db-schema.md](db-schema.md) | Supabase `quest_logs` 테이블 설계 | DB Schema |
| [environment-setup.md](environment-setup.md) | 로컬 Vite/Hono/Supabase 환경 변수와 실행 명령 | Environment Setup |
| [supabase-setup.md](supabase-setup.md) | Supabase 테이블 생성과 실제 DB 검증 절차 | Supabase Setup |
| [plans/completed/harness-recommended-implementation-2026-07-14.md](plans/completed/harness-recommended-implementation-2026-07-14.md) | Codex 하네스 Recommended안 구축 결과 | Harness Plan |

## Agent 문서

| 문서 | 역할 | Wiki 권장 페이지 |
|---|---|---|
| [planning-agent.md](planning-agent.md) | 요구사항을 작업 단위로 쪼개는 계획 수립 Agent | Planning Agent |
| [verification-agent.md](verification-agent.md) | 구현 결과를 시나리오와 데이터 흐름으로 점검하는 기능 검증 Agent | Verification Agent |
| [document-management-agent.md](document-management-agent.md) | 문서 추가/수정/삭제 시 구조와 링크를 점검하는 문서 관리 Agent | Document Management Agent |
| [tdd-workflow-agent.md](tdd-workflow-agent.md) | 작은 도메인 규칙을 RED/GREEN/REFACTOR로 고정하는 TDD workflow Agent | TDD Workflow Agent |
| [agent-usage-guide.md](agent-usage-guide.md) | 다른 세션에서 Agent 문서를 사용하는 시작 프롬프트와 순서 | Agent 사용 가이드 |
| [agent-design.md](agent-design.md) | AI Agent 역할과 MVP 규칙 기반 동작 | Agent Design |
| [codex-skills/project-planning-agent/SKILL.md](codex-skills/project-planning-agent/SKILL.md) | 계획 수립 Agent를 Codex skill로 변환한 문서화 버전 | Planning Skill |
| [codex-skills/project-verification-agent/SKILL.md](codex-skills/project-verification-agent/SKILL.md) | 기능 검증 Agent를 Codex skill로 변환한 문서화 버전 | Verification Skill |
| [codex-skills/project-document-manager/SKILL.md](codex-skills/project-document-manager/SKILL.md) | 문서 관리 Agent를 Codex skill로 변환한 문서화 버전 | Document Skill |
| [codex-skills/project-learning-agent/SKILL.md](codex-skills/project-learning-agent/SKILL.md) | 학습 키워드와 참고 코드 정리를 위한 Codex skill 문서화 버전 | Learning Skill |
| [codex-skills/asset-quality-verifier/SKILL.md](codex-skills/asset-quality-verifier/SKILL.md) | 생성 에셋과 sprite sheet 흔들림을 검수하기 위한 Codex skill 문서화 버전 | Asset Verification Skill |
| [codex-skills/tdd-test-writing/SKILL.md](codex-skills/tdd-test-writing/SKILL.md) | 반복적인 테스트 우선 spec 작성 절차를 문서화한 Codex skill 버전 | TDD Test Writing Skill |
| [codex-skills/xp-desktop-pet-ui/SKILL.md](codex-skills/xp-desktop-pet-ui/SKILL.md) | XP 데스크톱 전자 매니저 UI 작업을 반복하기 위한 Codex skill 문서화 버전 | Codex Skill |
| [../.codex/agents](../.codex/agents) | 프로젝트 전용 Codex 서브에이전트 역할 설정 | Harness Agents |
| [../.agents/skills](../.agents/skills) | 요청 분석, 계획, 실행, 검증, Wiki 작업용 프로젝트 workflow skills | Harness Skills |

## 제품·화면·디자인 문서

| 문서 | 역할 | Wiki 권장 페이지 |
|---|---|---|
| [product-plan.md](product-plan.md) | 문제 정의, 사용자 시나리오, 핵심 기능, MVP 범위 | 프로젝트 기획서 |
| [user-flow-wireframes.md](user-flow-wireframes.md) | 사용자 흐름, 화면 목록, 와이어프레임 | User Flow Wireframes |
| [mvp-functional-spec.md](mvp-functional-spec.md) | MVP 기능 동작과 완료 조건 | MVP 기능 명세 |
| [design-system.md](design-system.md) | concept.png 기반 XP 디자인 토큰과 컴포넌트 규칙 | Design System |
| [future-expansion-plan.md](future-expansion-plan.md) | MVP 이후 기술·기능 확장 계획 | MVP 이후 확장 계획 |
| [dynamic-asset-requirements.md](dynamic-asset-requirements.md) | 기간 내 승격 확장 기능의 동적 에셋/manifest 요구사항 | Dynamic Asset Requirements |
| [learning/README.md](learning/README.md) | 학습 키워드와 참고 코드 위치 | 학습 인덱스 |
| [wiki/index.md](wiki/index.md) | 원본 자료와 생성 지식을 분리하는 프로젝트 Wiki 색인 | Project Wiki |
| [archive/haetsalharu-plan.md](archive/haetsalharu-plan.md) | 이전 아이디어 백업 | 햇살하루 백업 |

## 에셋 관련 문서

| 문서 | 역할 |
|---|---|
| [design-references/README.md](design-references/README.md) | 디자인 참고 이미지와 후보 에셋의 역할 |
| [asset-prompts/README.md](asset-prompts/README.md) | 에셋 생성 프롬프트 구조와 적용 흐름 |

## 프로토타입 확인

React MVP 실행:

```powershell
cd D:\2026.1\AIAgentChallenge\hub
npm.cmd install
npm.cmd run dev -- --host 127.0.0.1 --port 4175
```

브라우저에서 확인:

```text
http://127.0.0.1:4175/
http://127.0.0.1:4175/api/health
```

정적 미리보기:

```text
http://localhost:5173/prototype-static.html
```

정적 미리보기 파일 위치:

```text
public/prototype-static.html
```

## 운영 링크

- GitHub Issues: https://github.com/YIFNEN/hub/issues
- GitHub Project: https://github.com/users/YIFNEN/projects/1
- Wiki: https://github.com/YIFNEN/hub/wiki

## 관리 기준

- 문서 목록과 링크는 이 파일에 둔다.
- 문서 간 계층과 파생 관계는 `project-knowledge-map.md`에 둔다.
- 일정표는 `four-week-roadmap.md`에 둔다.
- 전체 백로그는 `tasks.md`에 둔다.
- 오늘 계획과 이번 주 계획은 별도 날짜 문서에 둔다.
- 완료/검증/다음 작업/차단 요소는 `status.md`에 둔다.
- 승인된 실행 계획은 `plans/active/`에 두고, 완료 후 `plans/completed/`로 옮긴다.
- 프로젝트 Wiki는 `wiki/`에 두고 원본 자료와 생성 요약을 구분한다.
- 확장 기능은 `future-expansion-plan.md`와 P3 백로그에만 둔다.
- `notion-dashboard-guide.md`는 오래된 문서로, 현재 공식 작업 흐름에는 사용하지 않는다.
