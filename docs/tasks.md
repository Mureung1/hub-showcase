# 개발 Task 백로그

## Summary

이 문서는 전자 매니저 키우기 프로젝트의 전체 개발 Task 백로그다. `four-week-roadmap.md`가 시간표라면, 이 문서는 GitHub Issues와 GitHub Project로 옮길 수 있는 작업 목록이다.

2주차 핵심 목표는 FE-BE-DB 수직 슬라이스 완성이다. 화면에서 요청을 보내면 Hono 서버가 처리해 Supabase 한 테이블에 저장하고, 응답을 받아 React 화면이 갱신되어야 한다.

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
| T-008 | P0 | Done | GitHub Issue 등록 | P0/P1 Task가 Issue로 등록되고 완료 기준이 포함된다 | tasks.md |
| T-009 | P0 | Done | GitHub Project에 Issue 등록 | Project에 우선순위, 상태, 완료 기준이 연결된다 | github-project-guide.md |

## 2주차 P0: Frontend mock 흐름

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-101 | P0 | In Progress | 정적 HTML 화면을 React 컴포넌트 단위로 분해 | Wizard, Desktop, Window, Quest, Runner, Manager, Journal 단위가 파일로 분리된다 | mvp-functional-spec.md |
| T-102 | P0 | Done | React 재사용 로직 선별 | 기존 상태 전이와 버릴 UI 흔적이 구분된다 | status.md |
| T-103 | P0 | Done | 미사용 확장 UI 흔적 제거 또는 보관 | visible UI에 Agent Layer, Reward Layer 같은 문구가 남지 않는다 | mvp-functional-spec.md |
| T-104 | P0 | Done | 깨진 한글 정리 | `ruleBasedAgent.ts` 등 소스에 mojibake가 남지 않는다 | agent-design.md |
| T-105 | P0 | Done | 기록 노트 mock 데이터 렌더링 | mock quest log 배열이 기록 노트에 표시된다 | verification-agent.md |
| T-106 | P0 | Done | 완료/실패/복구 mock 상태 갱신 | 버튼 클릭 시 mock 기록과 매니저 상태가 갱신된다 | verification-agent.md |

## 2주차 P0: Backend·DB 구현

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-201 | P0 | Done | `quest_logs` 데이터 속성 확정 | Quest Event, manager context, 확장 metadata 필드가 문서화된다 | master-plan.md |
| T-202 | P0 | Done | Hono 서버 구조 생성 | 서버 폴더, 라우트, 실행 명령이 정리된다 | master-plan.md |
| T-203 | P0 | Done | Supabase 연결 방식 구현 | 환경 변수 이름, server-side store 선택, `/api/health` storage mode 확인 기준이 정리된다 | github-project-guide.md |
| T-204 | P0 | Done | `POST /api/quest-events` 구현 | 요청을 받아 server-side mock store 또는 Supabase에 이벤트를 저장한다 | weekly-plan-2026-07-13.md |
| T-205 | P0 | Done | `GET /api/quest-events` 구현 | 최근 Quest Event를 조회한다 | weekly-plan-2026-07-13.md |
| T-206 | P0 | Done | API 실패 응답 형식 구현 | 실패 시 프론트가 재시도 상태를 표시할 수 있다 | verification-agent.md |

## 2주차 P0: FE-BE-DB 연결

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-301 | P0 | Done | 완료 이벤트 API 저장 연동 | 완료 시 `POST /api/quest-events`가 호출되고 기록이 저장된다 | verification-agent.md |
| T-302 | P0 | Done | 실패 이벤트 API 저장 연동 | 실패 이유와 EXP 0 이벤트가 저장된다 | verification-agent.md |
| T-303 | P0 | Done | 복구 완료 이벤트 API 저장 연동 | 복구 퀘스트 완료 이벤트가 구분되어 저장된다 | verification-agent.md |
| T-304 | P0 | Done | 기록 노트 서버 조회 연결 | 기록 노트가 `GET /api/quest-events` 응답을 렌더링한다 | mvp-functional-spec.md |
| T-305 | P0 | Done | API 실패 UI 연결 | 저장/조회 실패 시 재시도 또는 안내 상태가 보인다 | verification-agent.md |
| T-306 | P0 | Done | 수직 슬라이스 서버 mock 검증 | 화면 요청 -> Hono 서버 처리 -> memory store 저장 -> 화면 갱신이 확인됐다 | verification-agent.md |
| T-307 | P0 | Done | Supabase 실제 DB 검증 | `/api/health`가 `storageMode: "supabase"`인 상태에서 HTTP smoke test와 브라우저 UI 수동 확인으로 Hono -> Supabase 저장/조회, Network `POST`/`GET`, 기록 노트 표시가 확인됐다 | verification-agent.md |

## 3~4주차 P1: UI 품질과 기술부채

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-401 | P1 | Backlog | React UI를 정적 HTML 기준으로 재정렬 | React 화면이 XP 데스크톱 정적 버전과 큰 차이가 없다 | design-system.md |
| T-402 | P1 | Backlog | 매니저 창 시각 품질 개선 | 캐릭터, EXP, 상태 아이콘, 하단 대화 패널이 기준과 맞는다 | design-system.md |
| T-403 | P1 | Backlog | QuestRunner.exe 시각 품질 개선 | [RUN], 종료 조건, 보상, 버튼 흐름이 기준과 맞는다 | user-flow-wireframes.md |
| T-404 | P1 | Backlog | 모바일 창 겹침 점검 | 작은 화면에서 텍스트와 버튼이 겹치지 않는다 | design-system.md |
| T-405 | P1 | Backlog | API 로딩/빈 상태 polish | 기록 조회 중, 기록 없음, 실패 상태가 구분된다 | verification-agent.md |

## 3~4주차 P1: 승격 확장 기능

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-701 | P1 | Done | 확장 기능 asset/data manifest 설계 | sprite, icon, theme, reward, sound, projection, interaction object manifest가 코드와 문서에 정의됐고, runtime/candidate/review naming 기준이 정리됐다 | dynamic-asset-requirements.md |
| T-702 | P1 | Review | 캐릭터 애니메이션 적용 | 루미 상태별 Canvas sprite animation과 hover/reaction 상태가 적용됐고, 브라우저 시각 확인이 남았다 | design-system.md |
| T-703 | P1 | Backlog | 외적 성장 보상 구현 | 레벨 또는 보상 해금에 따라 루미 accessory/growth variant가 바뀐다 | future-expansion-plan.md |
| T-704 | P1 | Backlog | 데스크톱 배경 테마 구현 | 해금된 wallpaper theme를 선택하고 XP desktop에 적용할 수 있다 | future-expansion-plan.md |
| T-705 | P1 | Backlog | 창 테마 구현 | 제목 표시줄, 창 프레임, taskbar skin이 theme token으로 바뀐다 | future-expansion-plan.md |
| T-706 | P1 | Backlog | 기억 조각 구현 | 완료/복구 Quest Event가 기록 노트 또는 월드에 memory fragment로 표시된다 | db-schema.md |
| T-707 | P1 | Backlog | 사운드 feedback 구현 | 완료/복구/레벨업 사운드가 muted 기본값과 함께 동작한다 | future-expansion-plan.md |
| T-708 | P1 | Backlog | 하루의 흐름 web theme 구현 | 시간대와 퀘스트 상태가 배경/루미 idle/theme state에 반영된다 | future-expansion-plan.md |
| T-709 | P1 | In Progress | 개인화 AI 매니저 adapter 구현 | ManagerBehaviorIntent 정규화와 behavior adapter가 TDD로 추가됐고, ManagerContext/LLM API 연결과 React animation state 연결이 남았다 | agent-design.md |
| T-710 | P1 | Review | blink focus scene 구현 | 서비스 진입과 서비스 나가기 직전에 눈 깜빡임/blur/fade overlay가 동작하고, 새로고침 시에는 재생되지 않으며 reduced-motion fallback이 있다. 브라우저 시각 확인이 남았다 | dynamic-asset-requirements.md |
| T-711 | P1 | In Progress | 전자 매니저 Persona와 제한 선택지 설계 | `balanced/adventurous/shy` behaviorStyle이 Pet Behavior State Machine weight에 반영되고, 직접/간접 선택 UI 연결이 남았다 | future-expansion-plan.md |
| T-712 | P1 | In Progress | 퀘스트 능력치 growth 설계 | 퀘스트 타입/결과별 stat delta 도메인 규칙이 TDD로 추가됐고, Quest Event metadata 저장/표시 연결이 남았다 | db-schema.md |
| T-713 | P1 | Backlog | cyber-purr 사운드 탐색 및 적용 후보 정리 | 전자/사이버틱한 기본 고롱고롱 사운드 후보와 mute/fallback 기준이 정리된다 | dynamic-asset-requirements.md |
| T-718 | P1 | Backlog | Supabase 확장 테이블 정규화 계획 | `quest_logs.metadata`에서 반복 조회가 필요한 profile, persona, stats, reward, appearance, memory, theme, device preference 데이터를 별도 테이블 후보로 승격하는 계획이 있다 | db-schema.md |
| T-714 | P2 | Review | 사다리 interaction prototype | 사다리 desktop object, vertical resize, Lumi climbing animation 연결이 들어갔고 브라우저 위치/조작감 수동 검수가 남았다 | dynamic-asset-requirements.md |
| T-715 | P2 | Review | 평지 interaction prototype | 평지 desktop object, horizontal resize, Lumi jump animation 연결이 들어갔고 브라우저 위치/조작감 수동 검수가 남았다 | dynamic-asset-requirements.md |
| T-716 | P2 | Review | 창탈출 interaction prototype | window escape edge 클릭 시 desktop overlay 쪽 Lumi walk animation이 나타나며, 실제 창 밖 이동 연출 polish가 남았다 | future-expansion-plan.md |
| T-717 | P2 | Backlog | Stage 회귀 엔드 컨텐츠 설계 | 해금한 Stage 1~4 외형 중 원하는 모습으로 회귀/장착할 수 있는 구조가 정의된다 | future-expansion-plan.md |

## 3~4주차 P2: 승격 실험 기능

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-721 | P2 | Backlog | 현실 픽셀화 TV prototype | 로컬 이미지 또는 권한 허용 웹캠 프레임이 canvas에서 픽셀화되어 TV 안에 표시된다 | future-expansion-plan.md |
| T-722 | P2 | Backlog | 공개 퀘스트 탐색 read-only prototype | `anonymous_public` Quest Event를 공개 탐색 오브젝트로 표시하고 기본 비공개를 유지한다 | future-expansion-plan.md |
| T-723 | P2 | Backlog | 웹캠 손 제스처 탐색 prototype | 손 제스처가 공개 탐색 화면의 보조 입력으로 동작하고 마우스/터치 fallback이 유지된다 | future-expansion-plan.md |
| T-724 | P2 | Review | Single-plane Pepper projection mode 설계 | Pixel TV 우클릭 속성 창에서 projection 연결 변환/원복이 가능하고, 변환된 TV 아이콘 실행 시 hidden route `?projection=pepper`로 연결된다 | dynamic-asset-requirements.md |

## 3~4주차 P2: 문서·발표·운영

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-501 | P2 | Backlog | Wiki 문서 최신화 | Wiki Home에서 최신 문서 구조로 이동 가능하다 | docs/README.md |
| T-502 | P2 | Backlog | 발표용 스크린샷 정리 | 핵심 화면 3~5장이 준비된다 | status.md |
| T-503 | P2 | Backlog | PR 본문 최신화 | 계획, 백로그, Agent 문서 변경이 반영된다 | status.md |
| T-504 | P2 | Review | 학습 문서 보강 | React 상태, API, Supabase, XP CSS 학습 키워드가 `project-learning-agent` 기준으로 정리된다 | learning/README.md |
| T-505 | P2 | Done | showcase 제출 파일 작성 | 최상위 `showcase/showcase.json`, `thumbnail.webp`, `screenshots/home.webp`가 PR에 포함된다 | status.md |
| T-506 | P2 | Done | TDD workflow Agent와 Skill 작성 | 반복 TDD 절차가 `.codex/agents/tdd_workflow.toml`, `.agents/skills/tdd-test-writing/SKILL.md`, 문서화 copy로 정리된다 | tdd-workflow-agent.md |

## 여유 시 P3: MVP 이후 확장 후보

| ID | 우선순위 | 상태 | Task | 완료 기준 | 연결 문서 |
|---|---|---|---|---|---|
| T-601 | P3 | Backlog | 테마 마켓/프리셋 확장 | 여러 테마 조합을 저장하고 관리할 수 있다 | future-expansion-plan.md |
| T-602 | P3 | Backlog | 주간 리포트 초안 | 완료/실패/복구 기록을 요약하는 기준이 있다 | future-expansion-plan.md |
| T-603 | P3 | Backlog | 개인 LLM 매니저 고도화 | 장기 memory, 평가, 비용 제한, 프롬프트 버전 관리가 정리된다 | future-expansion-plan.md |
| T-604 | P3 | Backlog | 음성 입력 설계 | 텍스트 fallback이 유지되는 입력 구조가 있다 | future-expansion-plan.md |
| T-605 | P3 | Backlog | 공개 퀘스트 moderation 고도화 | 신고, 차단, 필터링, 공개 범위 정책이 구현된다 | future-expansion-plan.md |
| T-606 | P3 | Backlog | 픽셀 월드 렌더러 고도화 | CSS/Canvas 한계를 넘을 때 PixiJS renderer를 실험한다 | future-expansion-plan.md |

## GitHub Issue 등록 후보

- `[P0] Agent 사용 가이드 작성`
- `[P0] 정적 HTML 화면을 React 컴포넌트 단위로 분해`
- `[P0] React 컴포넌트 파일 단위 분리 마무리`
- `[P0] GitHub Issue 등록`
- `[P1] 캐릭터 애니메이션과 theme 보상 적용`
- `[P1] 개인화 AI 매니저 adapter 구현`
- `[P2] 현실 픽셀화 TV prototype`
- `[P2] Single-plane Pepper projection mode 설계`
- `[P2] 공개 퀘스트 탐색 read-only prototype`
- `[P2] 웹캠 손 제스처 탐색 prototype`
- `[P1] API 로딩/빈 상태 polish`
- `[P1] 정적 HTML 대비 남은 UI 차이 점검`
- `[P2] showcase 제출 파일 작성`
- `[P2] TDD workflow Agent와 Skill 작성`

## 추천 진행 순서

1. `T-702`, `T-709`, `T-711`, `T-713` 캐릭터 생동감/Persona 연결: Lumi Canvas animation, behavior adapter, Persona style, cyber-purr 사운드 후보를 묶어 "살아 있는 매니저" 느낌을 만든다.
2. `T-703`, `T-717`, `T-712`, `T-718` 성장/보상 구조와 DB 정규화: Stage 1~4 해금, 원하는 외형으로 회귀, Quest Event metadata 기반 능력치 증가를 UI와 기록에 연결하고 반복 조회 데이터의 Supabase 테이블 승격 기준을 확정한다.
3. `T-714`, `T-715`, `T-716` 상호작용 오브젝트 수동 검수: 현재 prototype의 위치, resize 조작감, Lumi animation 연결을 브라우저에서 보고 polish 범위를 정한다.
4. `T-708`, `T-721`, `T-722`, `T-723` 월드/실험 기능: 하루 흐름 Web theme, 현실 픽셀화 TV, 공개 퀘스트 탐색, 웹캠 손 제스처 탐색을 별도 prototype으로 검증한다.
5. `T-724` Projection Mode 후속 검수: 기본 변환/원복 flow는 연결됐으므로 projection 화면 품질과 front/back 자동 회전 v1.5 필요 여부를 판단한다.

## Roadmap 연결

- 일정은 `four-week-roadmap.md`에서 관리한다.
- 현재 완료/검증/다음 작업은 `status.md`에서 관리한다.
- GitHub Issues/Projects 운영 방식은 `github-project-guide.md`에서 관리한다.
- `docs/notion-dashboard-guide.md`는 오래된 문서이므로 현재 작업 관리 기준으로 사용하지 않는다.
