# 스킬 계약 (typed contracts, 단일 진실 소스)

콕의 각 기능이 주고받는 입력·출력·제약의 계약 문서다. 코드보다 이 문서가 계약의 진실 소스이며, 계약을 바꾸려면 **여기를 먼저 고치고** 코드·checklist를 같은 변경에서 동기화한다. 리뷰어는 이 계약 위반 여부로 판정한다.

설계 근거는 [etc/agent-design.md](etc/agent-design.md), 구현 순서는 [backlog.md](backlog.md).

## 고정 상수

**task_category (7)**: `청소/정리` | `연락` | `문서작성` | `외출/이동` | `자기관리` | `학습/업무` | `기타`
**reason_chip (4)**: `막막해요` | `지루해요` | `지쳤어요` | `그냥 그래요`
**tool (9)**: `split_node` | `reorder_graph` | `suggest_break` | `mark_avoidance` | `shrink_step` | `swap_task` | `postpone_task` | `encourage` | `end_session`
**outcome (3)**: `done` | `not_done` | `pending`

## S1 — Brain Dump 분할

- **경로**: `POST /api/brain-dump`
- **입력**: `{ text: string }` (비어있으면 400)
- **출력**: `{ microsteps: MicroStep[] }`, `MicroStep = { title: string, estimatedMinutes: int(1..25), category: task_category }`
- **제약**: `microsteps.length >= 1`. 각 스텝은 바로 실행 가능한 한 문장. 순서 = 실행 순서. `category`는 고정 셋 중 하나(`z.enum` 강제).
- **모델**: Solar (`solar-pro2`) via `generateObject`.

## S2 — "힘들어" 루프 판단

- **경로**: `POST /api/struggle`
- **입력**:
  ```
  {
    reasonChip: reason_chip,
    currentStep: MicroStep,
    remainingSteps: MicroStep[],
    recentLogs: AgentLog[],          // 최근 N개 (T10 전까지는 [])
    rejectedTools: tool[],           // 이번 이벤트에서 이미 거절된 tool
    remainingTimeMinutes: number     // 오늘 자정까지 남은 분
  }
  ```
- **출력**: `{ proposedTool: tool, reason: string }`
- **제약**:
  - `proposedTool`은 고정 9개 중 하나(스키마 강제), `rejectedTools`에 든 것은 다시 고르지 않는다.
  - `recentLogs`가 비면 cold start — `reasonChip` prior로 판단(막막→shrink/split, 지루→swap, 지쳤→break, 그냥→encourage). prior는 강제가 아닌 기울기.
  - `reason`은 한 줄, 판단 근거를 사용자에게 보이는 문장.
- **재판단 게이트(T07)**: `remainingTimeMinutes > sum(remainingSteps.estimatedMinutes)`가 거짓이면 재제안 없이 마지막 제안 확정 또는 `postpone_task`/`end_session`으로 수렴.

## S3 — AgentLog 기록·조회

- **기록**: `logStruggle(entry)` — `entry`는 아래 AgentLog에서 `outcome` 제외 전부. 저장 시 `outcome='pending'`.
- **조회**: `getRecentLogs({ limit, category? })` → `AgentLog[]` (최신순, category 주면 해당 category 우선).
- **AgentLog**:
  ```
  { timestamp: Date, task_category, reason_chip, proposed_tool, proposed_reason: string,
    accepted: bool, outcome }
  ```
- **제약**: Notion flat DB. Select/Text/Checkbox만 사용, Relation 없음. property 추가/변경은 Notion UI에서 가능해야 한다.

## S4 — outcome 갱신

- **완료 시**: `markOutcomeDone(stepRef)` — 해당 스텝에 걸린 `pending` 로그를 `done`으로.
- **다음 방문 시**: `sweepStaleLogs()` — 오늘 이전 날짜의 `pending`을 전부 `not_done`으로. 스케줄러 없이 Brain Dump 시작 시 호출.
- **제약**: 이미 `done`/`not_done`인 로그는 건드리지 않는다(멱등).

## S5 — Agent 평가

- **입력**: 정답 세트 파일(`docs/etc/eval-set.md` 또는 데이터 파일) — "이 상황이면 개입했어야 한다" 시나리오 목록. AgentLog(Notion).
- **출력**: `{ precision: number, recall: number, n: int }` 콘솔 출력.
- **정의**: `precision = accepted / 전체 제안 수` (AgentLog만으로 계산). `recall = 개입한 정답 상황 / 전체 정답 상황` (정답 세트 필요).
- **제약**: AgentLog를 읽기만 한다. 평가 전용 필드를 AgentLog 스키마에 추가하지 않는다.
