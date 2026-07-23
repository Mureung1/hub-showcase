# 개발 지시서 — Agent 작업 절차

이 문서는 agent(Claude Code 등)에게 개발을 지시할 때 참조하는 **작업 절차서**다. 제품 범위·계약·완료 조건은 이 문서가 아니라 아래 문서들이 진실 소스이며, 이 문서는 "어떤 문서를 언제 어떻게 읽고 갱신할지"만 정의한다.

사용법: 새 세션에서 `docs/instructions.md 절차에 따라 T0X 진행해줘`라고 지시한다.

## 문서 지도

| 문서 | 역할 | 읽는 시점 |
|---|---|---|
| [CLAUDE.md](../CLAUDE.md) | 안전 원칙·제품 경계·현재 구현 상태 | 항상 (자동 로드) |
| [AGENTS.md](../AGENTS.md) | 범용 작업 규칙·Source of Truth 우선순위 | 항상 |
| [dev-plan.md](dev-plan.md) | 전체 로드맵·우선순위·기술 스택·백로그(Phase 2) | 범위·의존 판단이 필요할 때 |
| [etc/agent-design.md](etc/agent-design.md) | Feat-4 Agent 루프 설계(동결) | Agent 관련 Task 착수 전 |
| [skills.md](skills.md) | S1~S5 입력·출력·제약 typed 계약 (단일 진실 소스) | 구현 대상 스킬 착수 전 필수 |
| [backlog.md](backlog.md) | T01~T15 구현 순서·선행조건·상태 | 매 작업 시작·종료 시 |
| [checklist.md](checklist.md) | C01~C15 검증 가능한 완료 조건 | 매 작업 시작·종료 시 |
| [prerequisites.md](prerequisites.md) | 사용자가 준비할 API key·계정·결정 사항 | Task 착수 전 외부 자격증명 필요 여부 확인 |
| [spec.md](spec.md) | Feat 단위 진행 단계(설계→개발→PR→머지) | Feat 상태 갱신 시 |
| [etc/component-tree.md](etc/component-tree.md) | 화면·컴포넌트 구조 | 프론트 Task 착수 전 |
| [etc/commit-rules.md](etc/commit-rules.md) | 커밋 컨벤션·이슈 연동·커밋 분리 규칙 | 커밋 메시지 작성 시 |
| [etc/dev-prompts.md](etc/dev-prompts.md) | Phase별 개발 지시 프롬프트 모음 | 새 세션 시작 시 |
| [report/report_claude.md](report/report_claude.md) | 구현 세션 작업 보고 (append-only) | 작업 종료 시 append |
| [report/report_gpt.md](report/report_gpt.md) | 리뷰 세션 보고 (append-only) | GPT 등 리뷰 세션 종료 시 append |
| [report/review.md](report/review.md) | 보고서 점검·피드백 절차 (`확인: [ ]` 미체크 항목부터) | 리뷰 세션 시작 시, report_gpt.md 피드백 반영 시 |
| [daily-log.md](daily-log.md) | 날짜별 개인 실행 기록 | 참고용 (계약 근거 아님) |

우선순위 충돌 시: CLAUDE.md 안전 원칙 > dev-plan.md > skills.md > checklist.md > backlog.md > 코드·테스트 결과 순서를 따른다.

`docs/` 아래 `verification-plan.md`·`verification-log.md`·`harness-plan.md`·`etc/` 초기 메모는 배경 자료다. 참고는 가능하나 **범위·계약의 근거로 인용하지 않는다** (단, agent-design.md·component-tree.md·skills.md는 계약/설계 근거로 인용 가능).

## 작업 시작 절차

1. **리뷰 피드백 확인** — [report/report_gpt.md](report/report_gpt.md)에 `확인: [ ]` 미체크 항목이 있으면 [report/review.md](report/review.md) B절에 따라 먼저 반영·체크한다.
2. **Task 확정** — [backlog.md](backlog.md)에서 지시받은 Task의 선행조건이 `완료`인지 확인한다. 미충족이면 구현하지 말고 `BLOCKED` 사유와 해제 조건을 보고한다.
3. **완료 조건 로드** — Task의 종료 조건에 해당하는 [checklist.md](checklist.md)의 C 섹션 체크박스를 전부 읽는다. 이것이 acceptance criteria다.
4. **계약 로드** — 해당 Task가 포함하는 S 스킬의 [skills.md](skills.md) 계약(입력·출력·제약)을 읽는다.
5. **범위 확인** — 의존/설계 판단이 필요하면 [dev-plan.md](dev-plan.md)·[etc/agent-design.md](etc/agent-design.md)를 확인한다.
6. **하네스 확인** — `npm run verify`를 한 번 돌려 현재 baseline이 green인지 확인한다. 이미 실패 상태에서 시작하면 자신의 작업으로 인한 실패와 기존 실패를 구분할 수 없다.
7. backlog.md의 해당 Task 상태를 `진행중`으로 바꾸고 구현을 시작한다.

## 작업 중 규칙

- **계약 변경은 문서 먼저**: 스킬 입력·출력·제약을 바꿔야 하면 skills.md를 먼저 수정하고, 같은 변경에서 코드·checklist를 동기화한다.
- **범위 변경은 동시 동기화**: dev-plan.md를 바꾸면 skills/checklist/backlog/CLAUDE/AGENTS를 한 변경으로 갱신한다.
- **완료 기준**: 코드 + 동작 확인(verify) + 문서 + 보고가 전부 있어야 한 항목이 완료다.
- checklist에 없는 기능을 임의로 추가하거나, 있는 항목을 일정 이유로 빼지 않는다. 차단되면 `BLOCKED` 기록으로 대체한다.

## 작업 종료 절차

1. `npm run verify`를 실행해 통과를 확인한다. checklist.md는 이 결과로 실제 통과한 항목만 체크하며, 항목이 여러 계층(프론트+API+Notion 등)을 묶고 있으면 전부 충족했을 때만 체크한다. 문서에 적혀 있다는 이유로 체크하지 않는다.
2. backlog.md 상태를 갱신한다 (`진행중` → `완료` 또는 `BLOCKED`+사유).
3. 하위 체크박스가 전부 통과하기 전에는 상위 Task를 `완료`로 바꾸지 않는다.
4. 실행 명령·구현 상태가 바뀌었으면 CLAUDE.md의 「현재 구현 상태」·「현재 실행 명령」과 spec.md의 Feat 단계를 즉시 갱신한다.
5. [report/report_claude.md](report/report_claude.md)에 작업 보고를 남긴다. 파일을 읽지 말고 `cat >> docs/report/report_claude.md`로 하단에만 추가하며, 형식은 파일 상단 템플릿을 따른다. 새 항목 마지막 줄에는 반드시 `- 확인: [ ]`를 포함한다 — 다른 LLM이 [report/review.md](report/review.md) 절차로 미체크 항목부터 점검한다.

## 새 Task를 추가할 때

dev-plan.md에 없던 작업(디자인 보완처럼 계획에 없던 것)을 새 Task로 넣을 때는 이 순서로 진행한다. 우선순위상 A→B→D→E→C 순서(dev-plan.md)를 벗어나는 Task를 끼워 넣는 거라면, 그게 의도적인지(예: 마침 여유가 생겨서) 먼저 확인한다.

1. **GitHub 이슈 등록** — `task`, `status:*`, `priority:*`, `feat:*`, `area:*`, `type:*` 라벨 조합으로 생성. 선행조건이 없으면 `status:ready`.
2. **backlog.md** — Task 행(선행조건 포함)과 `## Task 상세` 섹션 추가.
3. **checklist.md** — 완료조건(C) 추가. 이때는 아직 미구현이므로 전부 `[ ]`.
4. **skills.md** — 입출력 계약이 필요한 Task면 계약(S) 추가. 순수 UI/설정 작업이면 생략(`—`).
5. **etc/dev-prompts.md** — 복붙용 프롬프트 추가.
6. **총 개수 표기 갱신** — README.md·CLAUDE.md·instructions.md(이 표)·etc/commit-rules.md의 "T01~TXX"/"C01~CXX" 표기를 새 Task 번호까지 갱신. (`etc/work-summary-YYMMDD.md`처럼 특정 날짜 기록인 문서는 과거 스냅샷이므로 갱신하지 않는다.)
7. 브랜치 생성 후 구현 시작(위 "작업 시작 절차"부터).

## 지시 템플릿

```text
docs/instructions.md 절차에 따라 T01(Notion 연동 기반)을 진행해줘.
완료 조건은 checklist.md C01 항목이고,
막히는 부분은 BLOCKED로 기록하고 멈춰서 보고해줘.
```
