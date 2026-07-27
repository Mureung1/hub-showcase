# 스킬 계약 (typed contracts, 단일 진실 소스)

콕의 각 기능이 주고받는 입력·출력·제약의 계약 문서다. 코드보다 이 문서가 계약의 진실 소스이며, 계약을 바꾸려면 **여기를 먼저 고치고** 코드·checklist를 같은 변경에서 동기화한다. 리뷰어는 이 계약 위반 여부로 판정한다.

설계 근거는 [etc/agent-design.md](etc/agent-design.md), 구현 순서는 [backlog.md](backlog.md).

## 고정 상수

**task_category (7)**: `cleaning`(청소/정리) | `contact`(연락) | `paperwork`(문서작성) | `errands`(외출/이동) | `self_care`(자기관리) | `work`(학습/업무) | `other`(기타)
**reason_chip (4)**: `overwhelmed`(막막해요) | `bored`(지루해요) | `tired`(지쳤어요) | `neutral`(그냥 그래요)
**tool (8)**: `split_node` | `reorder_graph` | `suggest_break` | `shrink_step` | `swap_task` | `postpone_task` | `encourage` | `end_session` (`mark_avoidance`는 별도 tool이 아니라 AgentLog 기록 자체로 통합됨)
**outcome (3)**: `done` | `not_done` | `pending`

## S1 — Brain Dump 분할

- **경로**: `POST /api/brain-dump`
- **입력**: `{ text: string, turn?: number, clarifications?: string[] }` (`text`가 비어있으면 400). `turn`은 지금까지 되물은 횟수(기본 0), `clarifications`는 그 질문들에 대한 사용자 답변을 순서대로 담은 배열(기본 []). 최초 제출은 `turn:0, clarifications:[]`.
- **출력**: `{ microsteps: MicroStep[] | null, followUpQuestion: string | null }`, `MicroStep = { title: string, estimatedMinutes: int(1..25), category: task_category, scheduledDate: date }`
  - `followUpQuestion`이 값이 있으면 `microsteps`는 `null`이고 아직 Notion에 저장되지 않은 상태다. 클라이언트는 이 질문을 사용자에게 보여주고, 답을 받아 `clarifications`에 추가하고 `turn`을 1 늘려 같은 `text`로 재호출한다.
  - `followUpQuestion`이 `null`이면 `microsteps`가 채워져 있고 이미 Notion에 저장 완료된 상태다(기존과 동일한 저장 시점).
- **제약**: `microsteps.length >= 1`(저장되는 경우). 각 스텝은 바로 실행 가능한 한 문장. 순서 = 실행 순서. `category`는 고정 셋 중 하나(`z.enum` 강제). `scheduledDate`는 서버가 계산해서 채운다 — 입력에 기한이 명확하면(첫 호출부터든 답변으로든) 그 날짜, 불명확하고 `turn < 2`면 모델이 되묻고, `turn >= 2`(질문을 이미 2번 한 뒤)면 더 묻지 않고 오늘 날짜를 기본값으로 강제 확정한다(`postpone_task` 실행 시에도 갱신됨, S2 참고).
- **모델**: Solar (`solar-pro2`) via `generateObject`. 마이크로스텝 분할과 기한 판단(명확한지, 불명확하면 되물을 질문·명확하면 오늘로부터 며칠 뒤인지)을 한 번의 호출로 같이 판단한다.

## S2 — "힘들어" 루프 판단

- **경로**: `POST /api/struggle`
- **입력**:
  ```
  {
    reasonChip: reason_chip,
    currentStep: MicroStep,
    remainingSteps: MicroStep[],
    rejectedTools: tool[],           // 이번 이벤트에서 이미 거절된 tool
    remainingTimeMinutes: number     // 오늘 자정까지 남은 분
  }
  ```
  `recentLogs`는 클라이언트 입력이 아니라(T10부터) 서버가 `/api/struggle` 내부에서 `getRecentLogs({ limit: 15, category: currentStep.category })`로 직접 채운다 — 클라이언트는 Notion에 직접 접근할 수 없어 이 값을 만들 방법이 없었기 때문.
- **출력**: `{ proposedTool: tool | null, reason: string, revisedTitle?: string, final?: bool }`
  - `revisedTitle`: `proposedTool`이 `shrink_step`일 때만, 완료 기준을 줄인 새 스텝 제목.
  - `final`: 더 제안할 수 있는 tool이 없어 강제 종결하는 경우 `true`. 이때 `proposedTool`은 `null`이다 — `rejectedTools`에 든 값을 "새 제안"으로 재사용하지 않기 위해서다. 화면은 `final:true`를 받으면 `proposedTool` 값과 무관하게 `end_session`으로 처리하고, 거절을 더 받지 않는다(C07).
- **제약**:
  - `proposedTool`은 고정 8개 중 하나이거나(스키마 강제), 더 제안할 후보가 없으면 `null`(이때 `final: true`). `rejectedTools`에 든 값은 어떤 경우에도 `proposedTool`로 다시 반환하지 않는다 — 후보가 소진되면 그 값을 재사용하는 대신 `null`로 종결한다.
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
- **제약**: Notion flat DB. Select/Text/Checkbox만 사용, Relation 없음. property 추가/변경은 Notion UI에서 가능해야 한다. `proposed_reason`은 실제 Text(rich_text) 속성이며, Notion이 요구하는 필수 title 속성은 `label`(reason_chip·proposed_tool 조합의 표시용 요약)로 별도 분리한다.

## S4 — outcome 갱신

- **완료 시**: `markOutcomeDone(stepRef)` — 해당 스텝에 걸린 `pending` 로그를 `done`으로. AgentLog는 Relation이 없어 "그 스텝에 걸린 로그"를 DB로 조회할 수 없으므로, 화면이 encourage/shrink_step으로 같은 스텝을 이어갈 때마다 생긴 로그 id를 배열로 들고 있다가 그 스텝이 완료되는 시점에 배열 전체를 `markOutcomeDone`한다(`stepRef`는 실질적으로 "그 스텝에 대해 쌓인 로그 id 목록").
- **다음 방문 시**: `sweepStaleLogs()` — 오늘 이전 날짜의 `pending`을 전부 `not_done`으로. 스케줄러 없이 Brain Dump 시작 시 호출.
- **제약**: 이미 `done`/`not_done`인 로그는 건드리지 않는다(멱등).

## S5 — Agent 평가

- **입력**: 정답 세트 파일(`docs/etc/eval-set.md` 또는 데이터 파일) — "이 상황이면 개입했어야 한다" 시나리오 목록. AgentLog(Notion).
- **출력**: `{ precision: number, recall: number, n: int }` 콘솔 출력.
- **정의**: `precision = accepted / 전체 제안 수` (AgentLog만으로 계산). `recall = 개입한 정답 상황 / 전체 정답 상황` (정답 세트 필요).
- **제약**: AgentLog를 읽기만 한다. 평가 전용 필드를 AgentLog 스키마에 추가하지 않는다.

## S6 — 타이머 종료 시 연장 판단

- **경로**: `POST /api/timer-extend`
- **입력**: `{ currentStep: MicroStep, extendCount: number }` (`extendCount`는 이 스텝에서 이미 연장한 횟수, cold start는 0)
- **출력**: `{ extendMinutes: int(1..25), reason: string }`
- **제약**: `extendMinutes`는 고정 계단이 아니라 모델이 `extendCount`·`estimatedMinutes` 등을 보고 직접 판단(`suggest_break`과 동일 패턴). `reason`은 한 줄, 사용자에게 보이는 판단 근거.
- **비고**: S2("힘들어" 루프)와 트리거가 다르다(타이머 종료 vs 사용자의 명시적 "힘들어" 액션). `agent-design.md`(Feat-4 동결 설계)는 이 스킬의 근거로 삼지 않는다.

## S7 — 스텝 완료 시 일시정지 기록

- **경로**: `POST /api/steps/complete`(기존 경로 확장)
- **입력 추가분**: `pauseCount: number`(이 스텝에서 일시정지한 횟수), `pauseReasons: string[]`(각 일시정지에 적은 이유, 안 적었으면 빈 문자열)
- **제약**: 판단이 필요 없는 순수 기록이라 모델 호출 없음. `pauseReasons`는 `pauseCount`와 길이가 같지 않아도 된다(이유 없이 넘어간 일시정지가 있을 수 있음) — 서버는 빈 문자열이 아닌 것만 이어붙여 Notion에 저장한다.
- **Notion Steps DB 추가 속성**: `PauseCount`(Number), `PauseReasons`(Text, 이유들을 " / "로 이어붙인 문자열)
- **비고**: Agent 판단이 아니라 사용자 행동을 그대로 기록하는 것이라 AgentLog(S3)나 `agent-design.md`와는 무관하다.
