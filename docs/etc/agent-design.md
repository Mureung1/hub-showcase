# Agent 설계 — D. 나 지금 힘들어

Feat-4(`docs/spec.md`)의 설계 문서. dev-plan.md에서 "Agent가 계속 개입한다"를 이 프로젝트의 핵심 차별화로 못박은 부분이라, 규칙(고정 분기)이 아니라 모델이 상황을 보고 tool을 선택하는 진짜 판단형 루프로 만드는 걸 목표로 한다.

## 지금 상태 (기준점)

`OneFocusView`의 `onStruggle`은 현재 조건 없이 무조건 `RestSuggestion`(고정 문구) 화면으로 간다 (`docs/etc/component-tree.md` 참고). 이 문서는 이 지점을 실제 Agent 판단으로 교체하는 설계다.

## 전체 흐름

```
"나 지금 힘들어" 버튼
  → (1) 이유 선택 (칩, 자유 입력 아님)
  → (2) Agent가 상태 + 최근 기록을 보고 tool 하나를 판단·제안
  → (3) 제안에 reason(왜 이걸 골랐는지) 한 줄 노출
  → (4) 사용자 수락/거절
       - 수락 → tool 실행, 로그 기록
       - 거절 → 같은 이유로 재제안하지 않고 Agent가 다시 판단 (시간 기반 게이트로 무한루프 방지, (4) 참고)
  → (5) 로그(AgentLog) 기록 — 이후 판단의 컨텍스트가 됨
```

## (1) 이유 선택 — 자유 입력 대신 칩

힘든 상황에서 텍스트 입력을 요구하는 것 자체가 마찰이라, 자유 텍스트가 아니라 선택지로 받는다.

- overwhelmed (막막해요)
- bored (지루해요)
- tired (지쳤어요)
- neutral (그냥 그래요)

## (2) Tool 목록

| tool | 하는 일 | 비고 |
|---|---|---|
| `split_node` | 현재 스텝을 여러 서브스텝으로 재분할 | 기존 |
| `reorder_graph` | 남은 스텝 순서 재배치 | 기존 |
| `suggest_break` | 휴식 제안, 몇 분 쉴지까지 모델이 판단 | 기존 수정. 20→40→60분은 고정 계단이 아니라 참고 기준(prior)일 뿐, 반복 횟수 등 상황을 보고 모델이 실제 분 단위 숫자를 직접 정해서 반환한다 |
| `mark_avoidance` | 회피 카운트 증가 | 기존. 아래 AgentLog로 통합됨 |
| `shrink_step` | 스텝을 쪼개는 게 아니라 **완료 기준 자체를 최소로 줄임** (예: "책상 정리" → "물건 1개만 옮기기") | 신규. 백로그 "2분 스타터" 아이디어를 Agent 판단으로 흡수 |
| `swap_task` | 지금 스텝을 잠깐 미루고 오늘 목록 중 더 쉬운/짧은 다른 태스크로 전환 제안 | 신규. 완전 중단과 계속 사이의 중간 옵션 |
| `postpone_task` | 이 스텝의 `scheduledDate`를 다음날로 갱신해 오늘 목록에서 명시적으로 뺌 | 신규. 죄책감 없이 미루게 하는 것도 Agent의 판단. 노션 DB의 날짜 속성만 바꾸는 것이라 별도 삭제·재생성 없음 |
| `encourage` | 구조 변경 없이 격려 메시지만 제공 | 신규. 매번 구조를 바꾸는 게 오히려 불안을 줄 수 있음 |
| `end_session` | 오늘 진행 중단, "오늘은 여기까지" 화면으로 | 신규. 번아웃 신호에서 억지로 계속시키지 않음 |

## (3) 판단 이유 노출

Agent 응답 스키마에 `reason` 필드를 추가해 "왜 이걸 골랐는지"를 한 줄로 같이 보여준다. 구현 비용은 거의 없지만(스키마 필드 하나), "규칙이 아니라 내 상황을 보고 판단했다"는 체감을 만드는 데 효과가 크다.

## (4) 거절 → 재판단 루프

한 번 제안하고 끝나는 게 아니라, 거절 시 Agent가 다시 판단해서 다른 tool을 제안한다. 이게 "한 번 던지는 AI 메시지"와 "개입하는 agent"를 가르는 지점.

무한 루프 방지는 **횟수가 아니라 시간**으로 건다.

```
remainingTimeToday = 오늘 마감(자정) - 현재 시각
remainingWorkload  = 남은 마이크로스텝들의 estimatedMinutes 합
```

재판단(재제안)은 `remainingTimeToday > remainingWorkload`일 때만 허용한다 — 즉 이론적으로 오늘 안에 아직 다 끝낼 여유가 있는 동안은 계속 다른 tool을 제안해볼 수 있고, 시간이 부족해지는 순간부터는 더 이상 거절을 받아주지 않고 마지막 제안으로 확정한다 (또는 `postpone_task`/`end_session`으로 강제 수렴). 재시도 횟수를 세는 로직이 따로 필요 없어서 구현도 단순하다.

## (5) 데이터 모델 — AgentLog

"힘들어" 이벤트마다 로그 한 줄을 Notion DB에 쌓는다. 회피 카운트, reason 칩, 제안 tool, 수락 여부를 각각 따로 안 두고 하나로 통합.

```
AgentLog (Notion DB)
- timestamp
- task_category      ← Brain Dump 분할 스키마에 추가 필요 (아래 참고)
- reason_chip         "overwhelmed" | "bored" | "tired" | "neutral"
- proposed_tool
- proposed_reason
- accepted            true/false
- outcome             이후 이 태스크를 실제로 완료했는지
```

### Brain Dump 스키마 확장 필요

현재 `app/api/brain-dump/route.js`의 `brainDumpSchema`는 `title`, `estimatedMinutes`만 갖는다. `task_category`로 회피 패턴을 태스크 유형 단위로 보려면, 분할 시 Agent가 대분류도 같이 뽑도록 스키마에 `category` 필드를 추가해야 한다.

카테고리는 모델이 자유롭게 만들게 두지 않고 **고정 셋**으로 간다 (자유 생성은 같은 의미의 카테고리가 표현만 다르게 흩어져서 회피 패턴 집계가 무의미해짐). 초안:

- cleaning (청소/정리)
- contact (연락, 전화·메일·메시지)
- paperwork (문서작성)
- errands (외출/이동)
- self_care (자기관리, 위생·식사·운동)
- work (학습/업무)
- other (기타)

zod `z.enum([...])`으로 강제하면 `generateObject`가 이 중 하나로만 분류하게 된다. 실제 써보면서 항목이 안 맞으면 이 목록만 조정하면 되는 구조.

### Cold start — 기록이 없을 때

첫 사용자(AgentLog가 비어있음)나 새 category의 첫 이벤트에는 참고할 기록이 없다. 이때 별도 규칙 분기를 코드로 만들지 않고, 프롬프트에 "기록이 없으면 reason_chip을 1차 근거로 삼아라"는 지침과 함께 기본 성향(prior)만 준다:

- overwhelmed(막막해요) → `shrink_step` 또는 `split_node` 쪽으로
- bored(지루해요) → `swap_task` 쪽으로
- tired(지쳤어요) → `suggest_break` 쪽으로
- neutral(그냥 그래요) → `encourage` 쪽으로

이건 강제 매핑이 아니라 프롬프트 안의 기울기라서, 판단 주체는 여전히 모델이다 (예: tired라도 남은 스텝이 5분짜리 하나면 encourage가 맞을 수 있음). 코드 분기가 없으니 cold start 경로와 일반 경로가 같은 API 하나로 처리된다.

### outcome 기록 시점

`outcome`은 제안 시점엔 알 수 없는 값이라 `pending`으로 생성하고, 두 시점에 갱신한다:

1. **완료 시 즉시**: 해당 마이크로스텝의 타이머가 끝나 CompleteScreen에 도달하면, 그 스텝에 걸린 pending 로그를 `done`으로 업데이트
2. **다음 방문 시 일괄(lazy)**: 앱을 다시 열어 새 Brain Dump를 시작할 때, 어제 이전 날짜의 `pending` 로그를 전부 `not_done`으로 마감

2번을 cron이나 자정 배치 대신 "다음 방문 시"로 두는 이유: 별도 스케줄러 인프라 없이 기존 API route 안에서 처리할 수 있고, 어차피 outcome이 실제로 읽히는 시점은 다음 Agent 호출 때라서 그 전에만 채워져 있으면 충분하다.

## 개인화 반영 방식 — 집계 코드 대신 모델 추론

로그를 따로 집계·스코어링하는 코드를 짜지 않고, Agent 호출 시마다 최근 로그(전체 + 현재 `task_category`와 겹치는 것)를 프롬프트에 그대로 넣고 판단은 모델에게 맡긴다.

> "아래는 이 사용자의 최근 개입 기록이다. 반복적으로 거절한 tool이나 category 패턴이 보이면 이번엔 다른 방식을 시도해라." + 최근 로그 15~20줄

장점: 별도 집계/스코어링 로직이 필요 없어 구현 비용이 낮고, 고정 규칙이 아니라 실제 추론이라 더 agent답다. 로그가 많이 쌓이면(수십~수백 개) 매번 다 보내기 부담스러워지는데, 지금 스코프에선 "최근 N개"로 자르는 정도로 충분하고 요약/압축은 이후 문제로 미룬다.

## 스코프 판단 (3주차 기준)

- 그래프 구조(마이크로스텝 간 의존성을 노드/엣지로 표현)는 이 문서에서 보류. 25분 마이크로스텝 대부분은 순차 실행이라 의존성 표현의 이점이 작고, Notion relation property를 다루는 학습 비용도 있음. 1차는 flat list + `task_category` + AgentLog로 가고, 그래프는 여유 있을 때 확장.
- 우선순위 추천: `reason` 필드 노출, 거절→재판단 루프가 구현 비용 대비 "agent답게 느껴지는" 효과가 가장 큼. `shrink_step`, `swap_task` 등 tool 추가는 그다음.

## AgentLog Notion DB 구조

`AgentLog`는 다른 DB에 물리지 않는 **단독 flat DB**로 간다 (Relation 대신 Select/Text/Checkbox 속성만 사용).

| property | 타입 | 값 |
|---|---|---|
| timestamp | Date | — |
| task_category | Select | 위 고정 셋 7개 |
| reason_chip | Select | overwhelmed / bored / tired / neutral |
| proposed_tool | Select | tool 목록 8개 |
| proposed_reason | Text | Agent가 생성한 한 줄 |
| accepted | Checkbox | — |
| outcome | Select | done / not_done / pending |
| label | Title | Notion 필수 title 속성. 표시용 요약(`reason_chip → proposed_tool`)만 담고 계약 필드로는 안 씀 |

Relation을 안 쓰는 이유: Select/Text 속성은 Notion 화면에서 옵션을 바로 추가·수정할 수 있어서, 카테고리나 tool 목록이 바뀌어도 코드나 다른 DB 스키마를 안 건드리고 Notion UI에서만 고치면 된다. 처음부터 구조를 딱 맞게 짜기보다, 이후 실제로 써보면서 property를 추가/변경하기 쉬운 쪽을 택했다 — 지금 표의 항목들은 확정이 아니라 초안이다.

## E 단계(Feat-5, Agent 평가)와의 연결

AgentLog는 로그이면서 동시에 평가 데이터셋의 원천이다. dev-plan.md E의 Precision/Recall을 이 스키마에 그대로 매핑한다:

- **Precision(불필요한 제안을 줄였는가)** = `accepted / 전체 제안 수`. 정답 세트 없이 AgentLog만으로 계산 가능 — 사용자의 수락이 곧 라벨이라, 실사용 로그가 쌓이는 것 자체가 평가 데이터가 쌓이는 것.
- **Recall(놓친 게 없는가)** = 정답 세트("이 상황이면 개입했어야 한다" 시나리오 목록)가 따로 필요하다. AgentLog에서 자동으로 안 나오는 유일한 부분이므로, E 단계 작업은 사실상 이 정답 세트 만들기 + 계산 스크립트 하나로 좁혀진다.
- 평가 스크립트가 Notion API로 AgentLog를 읽기만 하면 되도록, 스키마에 평가 전용 필드를 미리 넣지 않는다 (proposed_tool·accepted·outcome 세 개면 충분).

## 결정 사항 정리 (260720)

- 거절 재시도는 횟수 상한이 아니라 시간 기반 게이트 (`remainingTimeToday > remainingWorkload`)
- `task_category`는 고정 셋 7개로 시작
- `AgentLog`는 Relation 없는 단독 flat DB로, property는 이후 자유롭게 수정 가능하게 설계
- Cold start는 코드 분기 없이 프롬프트 prior(칩→tool 기울기)로 처리
- `outcome`은 완료 시 즉시 `done`, 다음 방문 시 이전 날짜 `pending`을 일괄 `not_done` 처리 (스케줄러 없음)
- 선제적 개입(버튼 없이 Agent가 먼저 알아채는 것)은 **백로그로 이동** — 반응형 루프가 실제로 돌고 AgentLog가 쌓인 뒤에 같은 구조 위에 얹는 게 순서

## 스코프 동결 (260720)

이 문서 기준으로 D의 설계는 동결한다. 더 추가하지 않는 이유: 남은 기간(3주차 잔여 + 4주차) 안에 반응형 루프 구현 + E 평가까지 가야 하고, 위 목록만으로도 "추론 기반 tool 선택 · 거절 시 재적응 · 로그 기반 개인화"라는 agent의 핵심 증명이 완성된다. 여기서 기능을 더 얹는 것보다 이 루프가 실제로 도는 것이 프로젝트 가치가 크다.
