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

- 범위는 [docs/backlog.md](docs/backlog.md)의 T01~T20 + [docs/dev-plan.md](docs/dev-plan.md). Phase 2 백로그(2분 스타터·통계·화이트노이즈 등)와 선제적 개입은 **지금 구현하지 않는다**.
- checklist에 없는 기능을 임의 추가하지 않는다. 필요하면 문서(skills/backlog/checklist)를 먼저 갱신하고 구현한다.

## 현재 구현 상태 (작업 시 갱신)

- **완료**: 화면 뼈대(6개 화면 조건부 렌더링, `docs/etc/component-tree.md`), Notion 연동 기반(`app/lib/notion.js`, T01), Brain Dump category 확장 + Notion 저장(T02), One-Focus View 실데이터 연결(T03) — `/api/steps`로 Notion에서 오늘 할 일을 읽어와 순회하고, 완료 시 `/api/steps/complete`로 Done 갱신. AgentLog DB 생성 + 기록/조회 lib(T05). "힘들어" 루프 판단 API + 재판단 시간 게이트(T06·T07) — `POST /api/struggle`. 이유 칩 + 제안/수락/거절 UI(T08). outcome 기록(T09). 개인화(T10) — `/api/struggle`이 서버에서 직접 `getRecentLogs`(같은 category 우선) + 최근 완료 스텝들의 행동 패턴(예상 대비 실제 시간 배율, 미룬 비율)을 프롬프트에 포함, Steps DB에 `StartedAt`·`CompletedAt`·`ActualMinutes`·`PostponeCount` 추가. Timer 새로고침 내구성(T04) — `app/page.js`가 진행 상태(step/currentIndex/microsteps/stepStartedAt)를 localStorage에 저장·복원하고, `FocusTimer`는 자체 시작 시각 대신 이 `stepStartedAt`을 prop으로 받아 남은 시간을 재계산. 타이머 종료 시 완료 확인 + Agent 판단 연장(T15) — 타이머가 0이 되면 바로 완료 처리하지 않고 `TimerConfirm` 확인 화면을 거치고, "아니오" 선택 시 `POST /api/timer-extend`(S6)가 연장 분을 직접 판단해 그만큼 타이머를 재시작, 판단 이유는 `FocusTimer`의 캐릭터 말풍선(`SpeechBubble`)으로 표시. Brain Dump 일정 확인 멀티턴(T14) — 기한이 불명확하면 최대 2턴까지 되묻고, 명확해지면 `daysFromToday`로 `scheduledDate` 확정. 홈 화면 버튼(입력·미리보기·완료 화면, focus/timer류는 제외). 타이머 일시정지 + 재개 사유 기록(T20) — 멈춘 시간만큼 `stepStartedAt`을 재계산, `PauseCount`/`PauseReasons`를 Notion에 기록. 오늘 마감까지 남은 시간 표시 + 연장 버튼(T19) — `OneFocusView`에 표시, 연장한 시간이 T07의 재판단 게이트 계산에도 반영. Zero-Input 온보딩(T18) — `app/components/OnboardingGuide.js` + `app/page.js`가 마운트 시 `/api/notion-health`로 확인해 미설정이면 다른 화면보다 먼저 안내 화면을 보여줌. 노션 템플릿(Steps·AgentLog DB)을 API로 생성하고, 사용자가 직접 "Share to web"·"Allow duplicate as template"를 켜서 `https://twilight-editor-6bf.notion.site/Kok-3acbe7e7125181588f68d69ebb8aa602`로 공개. 마이크로스텝 검토·삭제 화면(T17) — Brain Dump 확정 직후 바로 저장하지 않고 `app/components/MicrostepReview.js`가 전체 목록(카테고리 태그·총 예상 시간·개별 삭제·"전부 다시 쪼개기")을 보여주며, "이대로 시작하기"를 눌러야 `POST /api/steps/save`(S1-save)가 그 시점에 Notion Steps DB에 저장한다. `CompleteScreen`은 마지막 완료 스텝 텍스트 대신 그 배치의 전체 완료 개수(`microsteps.length`)를 보여준다.
- **진행/예정**: T11(Agent 평가)·T13(모델 비교)·T16(음성 입력).
- **아직 mock/미완**: 없음 — Agent 루프(T05~T10) 전체가 실데이터로 동작. T11·T13·T16이 남음.

## 현재 실행 명령

- 개발 서버: `npm run dev`
- 검증: `npm run verify` (lint + build)
- 필요한 환경변수는 [docs/prerequisites.md](docs/prerequisites.md).

## 보고 (필수)

작업 종료 시 [docs/report/report_claude.md](docs/report/report_claude.md)에 `cat >>`로 append(파일 읽지 말 것). 마지막 줄에 `- 확인: [ ]` 포함. 리뷰 반영은 [docs/report/review.md](docs/report/review.md) B절.

## Claude Code 커스텀 에이전트

`.claude/agents/`의 plan-agent(작업 분해·우선순위)·verify-agent(완료조건 점검)는 아직 초안이다. 검증 방식이 안정되기 전엔 실전 판단의 최종 근거로 삼지 않는다.
