# 개발 Task 백로그

## Summary

이 문서는 전자 매니저 키우기 프로젝트의 전체 개발 Task 백로그다. `four-week-roadmap.md`가 시간표라면, 이 문서는 GitHub Issues와 GitHub Project로 옮길 수 있는 작업 목록이다.

2주차 핵심 목표는 FE-BE-DB 수직 슬라이스 완성이다. 화면에서 요청을 보내면 Express 서버가 처리해 Supabase 한 테이블에 저장하고, 응답을 받아 React 화면이 갱신되어야 한다.

## 관리 기준

| 항목 | 의미 |
|---|---|
| P0 | MVP 또는 2주차 수직 슬라이스 필수 |
| P1 | 7월 30일 전 품질 향상에 중요 |
| P2 | 발표, 문서, 사용성 개선 |
| P3 | MVP 이후 확장 후보 |

상태는 `Backlog`, `Ready`, `In Progress`, `Review`, `Done`, `Blocked`로 관리한다.

## 2주차 P0: Agent·운영 체계

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-001 | P0 | Done | 계획 수립 Agent 문서 작성 | 요구사항을 Task로 분해하는 입력/출력/금지 규칙이 있다 | planning-agent.md |
| T-002 | P0 | Done | 기능 검증 Agent 문서 작성 | MVP와 수직 슬라이스 검증 기준이 있다 | verification-agent.md |
| T-003 | P0 | Done | 문서 관리 Agent 문서 작성 | 문서 추가/수정/삭제 시 구조와 링크를 점검하는 규칙이 있다 | document-management-agent.md |
| T-004 | P0 | Done | Agent 사용 가이드 작성 | 다른 세션 시작 프롬프트와 Agent 사용 순서가 있다 | agent-usage-guide.md |
| T-005 | P0 | Done | 7월 30일 최종 로드맵 작성 | 2주차 수직 슬라이스 완료 기준과 3~4주차 확장 후보가 있다 | master-plan.md |
| T-006 | P0 | Done | 2주차 요일별 계획 작성 | 7월 17일까지 FE-BE-DB 완료 계획이 있다 | weekly-plan-2026-07-13.md |
| T-007 | P0 | Done | GitHub Project 운영 가이드 작성 | 보드, 필드, 우선순위, Issue 연결 규칙이 있다 | github-project-guide.md |
| T-007A | P0 | Done | 학습 정리 skill 작성 | 학습 문서를 키워드, 참고 코드, 질문 예시 중심으로 유지하는 규칙이 있다 | codex-skills/project-learning-agent/SKILL.md |
| T-007B | P0 | Done | Codex 하네스 Recommended안 구축 | `.codex/agents`, `.agents/skills`, `docs/wiki`, `scripts/verify-harness.ps1`가 있고 검증을 통과했다 | plans/completed/harness-recommended-implementation-2026-07-14.md |
| T-008 | P0 | Ready | GitHub Issue 등록 | P0/P1 Task가 Issue로 등록되고 완료 기준이 포함된다 | tasks.md |
| T-009 | P0 | Ready | GitHub Project에 Issue 등록 | Project에 우선순위, 상태, 완료 기준이 연결된다 | github-project-guide.md |

## 2주차 P0: Frontend mock 흐름

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-101 | P0 | Ready | 정적 HTML 화면을 React 컴포넌트 단위로 분해 | Wizard, Desktop, Window, Quest, Runner, Manager, Journal 단위가 정리된다 | mvp-functional-spec.md |
| T-102 | P0 | Ready | React 재사용 로직 선별 | 기존 상태 전이와 버릴 UI 흔적이 구분된다 | status.md |
| T-103 | P0 | Ready | 미사용 확장 UI 흔적 제거 또는 보관 | visible UI에 Agent Layer, Reward Layer 같은 문구가 남지 않는다 | mvp-functional-spec.md |
| T-104 | P0 | Ready | 깨진 한글 정리 | `ruleBasedAgent.ts` 등 소스에 mojibake가 남지 않는다 | agent-design.md |
| T-105 | P0 | Backlog | 기록 노트 mock 데이터 렌더링 | mock quest log 배열이 기록 노트에 표시된다 | verification-agent.md |
| T-106 | P0 | Backlog | 완료/실패/복구 mock 상태 갱신 | 버튼 클릭 시 mock 기록과 매니저 상태가 갱신된다 | verification-agent.md |

## 2주차 P0: Backend·DB 구현

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-201 | P0 | Ready | `quest_logs` 데이터 속성 확정 | 저장할 필드와 result/type 값이 문서화된다 | master-plan.md |
| T-202 | P0 | Ready | Express 서버 구조 생성 | 서버 폴더, 라우트, 실행 명령이 정리된다 | master-plan.md |
| T-203 | P0 | Ready | Supabase 연결 방식 구현 | 환경 변수 이름과 커밋 금지 항목이 정리된다 | github-project-guide.md |
| T-204 | P0 | Backlog | `POST /api/quest-logs` 구현 | 요청을 받아 Supabase에 기록을 저장한다 | weekly-plan-2026-07-13.md |
| T-205 | P0 | Backlog | `GET /api/quest-logs` 구현 | Supabase에서 최근 기록을 조회한다 | weekly-plan-2026-07-13.md |
| T-206 | P0 | Backlog | API 실패 응답 형식 구현 | 실패 시 프론트가 재시도 상태를 표시할 수 있다 | verification-agent.md |

## 2주차 P0: FE-BE-DB 연결

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-301 | P0 | Backlog | 완료 이벤트 API 저장 연동 | 완료 시 `POST /api/quest-logs`가 호출되고 기록이 저장된다 | verification-agent.md |
| T-302 | P0 | Backlog | 실패 이벤트 API 저장 연동 | 실패 이유와 EXP 0 기록이 저장된다 | verification-agent.md |
| T-303 | P0 | Backlog | 복구 완료 이벤트 API 저장 연동 | 복구 퀘스트 완료 기록이 구분되어 저장된다 | verification-agent.md |
| T-304 | P0 | Backlog | 기록 노트 서버 조회 연결 | 기록 노트가 `GET /api/quest-logs` 응답을 렌더링한다 | mvp-functional-spec.md |
| T-305 | P0 | Backlog | API 실패 UI 연결 | 저장/조회 실패 시 재시도 또는 안내 상태가 보인다 | verification-agent.md |
| T-306 | P0 | Backlog | 수직 슬라이스 수동 검증 | 화면 요청 -> 서버 처리 -> DB 저장 -> 화면 갱신이 확인된다 | verification-agent.md |

## 3~4주차 P1: UI 품질과 기술부채

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-401 | P1 | Backlog | React UI를 정적 HTML 기준으로 재정렬 | React 화면이 XP 데스크톱 정적 버전과 큰 차이가 없다 | design-system.md |
| T-402 | P1 | Backlog | 매니저 창 시각 품질 개선 | 캐릭터, EXP, 상태 아이콘, 하단 대화 패널이 기준과 맞는다 | design-system.md |
| T-403 | P1 | Backlog | QuestRunner.exe 시각 품질 개선 | [RUN], 종료 조건, 보상, 버튼 흐름이 기준과 맞는다 | user-flow-wireframes.md |
| T-404 | P1 | Backlog | 모바일 창 겹침 점검 | 작은 화면에서 텍스트와 버튼이 겹치지 않는다 | design-system.md |
| T-405 | P1 | Backlog | API 로딩/빈 상태 polish | 기록 조회 중, 기록 없음, 실패 상태가 구분된다 | verification-agent.md |

## 3~4주차 P2: 문서·발표·운영

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-501 | P2 | Backlog | Wiki 문서 최신화 | Wiki Home에서 최신 문서 구조로 이동 가능하다 | docs/README.md |
| T-502 | P2 | Backlog | 발표용 스크린샷 정리 | 핵심 화면 3~5장이 준비된다 | status.md |
| T-503 | P2 | Backlog | PR 본문 최신화 | 계획, 백로그, Agent 문서 변경이 반영된다 | status.md |
| T-504 | P2 | Backlog | 학습 문서 보강 | React 상태, API, Supabase, XP CSS 학습 키워드가 `project-learning-agent` 기준으로 정리된다 | learning/README.md |

## 여유 시 P3: MVP 이후 확장 후보

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-601 | P3 | Backlog | 배경/창 테마 보상 설계 | 테마 해금 조건과 적용 데이터 구조가 있다 | future-expansion-plan.md |
| T-602 | P3 | Backlog | 주간 리포트 초안 | 완료/실패/복구 기록을 요약하는 기준이 있다 | future-expansion-plan.md |
| T-603 | P3 | Backlog | 개인 LLM 매니저 설계 | ManagerMemory와 LLMAgentAdapter 경계가 정리된다 | future-expansion-plan.md |
| T-604 | P3 | Backlog | 음성 입력 설계 | 텍스트 fallback이 유지되는 입력 구조가 있다 | future-expansion-plan.md |
| T-605 | P3 | Backlog | 공개 퀘스트 탐색 설계 | 기본 비공개, 신고/차단 전제 조건이 있다 | future-expansion-plan.md |
| T-606 | P3 | Backlog | 현실 픽셀화 TV 설계 | 프레임 저장 금지와 권한 안내가 포함된다 | future-expansion-plan.md |

## GitHub Issue 등록 후보

- `[P0] Agent 사용 가이드 작성`
- `[P0] GitHub Issue 등록`
- `[P0] 정적 HTML 화면을 React 컴포넌트 단위로 분해`
- `[P0] 기록 노트 mock 데이터 렌더링`
- `[P0] quest_logs 데이터 속성 확정`
- `[P0] Express 서버 구조 생성`
- `[P0] Supabase 연결 방식 구현`
- `[P0] POST /api/quest-logs 구현`
- `[P0] GET /api/quest-logs 구현`
- `[P0] 기록 노트 서버 조회 연결`
- `[P0] 수직 슬라이스 수동 검증`

## Roadmap 연결

- 일정은 `four-week-roadmap.md`에서 관리한다.
- 현재 완료/검증/다음 작업은 `status.md`에서 관리한다.
- GitHub Issues/Projects 운영 방식은 `github-project-guide.md`에서 관리한다.
- `docs/notion-dashboard-guide.md`는 오래된 문서이므로 현재 작업 관리 기준으로 사용하지 않는다.
