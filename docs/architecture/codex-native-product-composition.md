# Codex-native 제품 작업 조합

작성일: 2026-07-11

상태: 활성

## 목적

이 문서는 AY-PLE의 제품 기능을 Codex App Server에 어떻게 얇게 연결하는지 설명한다. AY-PLE는 별도 Agent workflow engine을 만들지 않고 native Codex 입력과 제어를 조합하며, 앱은 학기 상태와 검토 권한을 소유한다.

## 경계

| AY-PLE 의미 | Codex realization | 경계 |
| --- | --- | --- |
| 활성 SemesterWorkspace | 새 thread의 `thread/start.cwd`; 재사용 thread는 기존 `cwd`가 같은지 검증 | `turn/start.cwd`는 해당 turn 이후에도 유지된다. MVP는 workspace가 다르면 새 thread를 시작하며, cross-workspace override는 명시적인 후속 UX 없이는 사용하지 않는다. |
| SourceSelection | `mention` UserInput variant의 `name`, `path` 목록 | 명시적인 작업 입력이지 filesystem permission boundary가 아니다. |
| ModelingRecipe의 Skill | `skill` UserInput variant의 `name`, `path` | native Skill protocol을 사용하며 AY-PLE 전용 plugin 체계를 만들지 않는다. |
| prompt template과 arguments | `text` UserInput variant의 `text`, `text_elements` | Skill에 별도 structured arguments 채널이 없으므로 검증한 값을 text에 렌더링한다. |
| 구조화 결과 계약 | `turn/start.outputSchema` | Codex 최종 응답을 앱이 검증 가능한 형태로 제한한다. |
| 작업 실행 | 새 `thread/start` 또는 기존 `thread/resume` 뒤 필수 `threadId`를 넣은 `turn/start` | `turn/start` 자체가 ad-hoc thread를 만들지 않는다. 실행 뒤 최소 ModelingRun receipt로 제품 입력과 결과를 연결한다. |
| 진행 중 정정 | 필요할 때 `turn/steer` | 정확한 active turn과 사용자 의도가 확인된 기능에만 사용한다. |
| 중단 | 필요할 때 `turn/interrupt` | 실제 terminal 결과를 확인하기 전 성공으로 표시하지 않는다. |
| 실행 권한·운영 입력 | 원래 server request에 대한 typed response | 학업 Review나 UserConfirmation과 합치지 않는다. |
| AY 작업 활동 | 선택한 `item`·`turn` observation | 진행 설명이며 그 자체가 EvidenceRef나 SemesterModel 사실은 아니다. |

raw `threadId`, `turnId`, `itemId`, `requestId`와 protocol message는 Codex 통합 내부에 둔다. 제품에는 기능을 복구하거나 결과를 연결하는 데 필요한 correlation과 검증된 의미만 전달한다.

## ModelingRecipe와 실행

하나의 ModelingRecipe는 다음 네 요소를 묶는다.

| 요소 | 역할 |
| --- | --- |
| Skill | Codex가 따라야 할 작업 지침과 도구 사용 방식 |
| prompt template | 학생이 선택한 작업을 구체적인 요청으로 표현하는 틀 |
| argument contract | 과목, 기간, 처리 옵션처럼 template에 넣을 값과 검증 규칙 |
| output schema | StatePatch 후보로 변환할 구조화 결과 계약 |

실행 시 앱은 새 thread를 시작하거나 기존 thread를 선택한 뒤, recipe에 arguments, SourceSelection mention과 현재 작업에 필요한 최소 앱 상태 참조를 결합한다.

```text
thread/start 또는 thread/resume
→ selected threadId

ModelingRecipe
+ validated arguments
+ SourceSelection mentions
+ verified SemesterWorkspace cwd
+ selected threadId
→ turn/start(threadId)
→ ModelingRun receipt 생성
→ validated structured result 연결
→ StatePatch 후보
```

ModelingRun receipt는 최소한 recipe와 version, 검증된 arguments, source 참조, 시작·종료 상태, opaque execution reference와 결과 참조를 연결한다. raw thread/turn identifier는 Codex 통합 내부에서만 해석한다. 렌더링한 전체 prompt, raw protocol stream 또는 Codex Memory를 제품 감사 기록으로 복사하지 않는다.

## Thread와 Memory

| 항목 | MVP 결정 |
| --- | --- |
| 기본 thread | 일반적인 Codex 사용처럼 ad-hoc으로 시작한다. |
| 후속 대화 | 같은 작업을 이어가는 명시적 대화라면 기존 native thread를 계속 사용할 수 있다. |
| 고정 topology | 학기별·과목별·ModelingRun별 thread cardinality를 정하지 않는다. |
| workspace 재사용 | 기존 thread의 sticky `cwd`가 현재 SemesterWorkspace와 같을 때만 재사용한다. 다르면 새 thread를 시작한다. |
| AGENTS.md | Codex의 native 로딩 규칙을 그대로 사용한다. |
| Skills | Codex native Skill discovery와 invocation을 사용한다. |
| built-in Memories | app-managed `CODEX_HOME`과 `CODEX_SQLITE_HOME` pair에서 feature와 생성·사용을 명시적으로 켜고 eligibility smoke를 통과한 뒤 사용한다. 비권위적이며 모든 작업의 memory 생성을 보장하지 않는다. |
| 학기 rollover | Memory 초기화·보관·분류 UX는 MVP 이후 결정한다. |

SemesterModel, RawMaterial, StatePatch와 UserConfirmation은 Memory가 없어져도 다시 열고 검증할 수 있어야 한다.

## 현재 구현과 Gap

생성된 pinned Codex protocol은 `UserInput`의 `text`, `skill`, `mention`과 `TurnStartParams.outputSchema`를 제공한다. 각 variant의 실제 필수 필드는 generated type을 따르며 위 표의 표기는 축약 설명이다. 현재 `CodexRawClient`의 공개 raw wrapper는 text input과 `cwd`만 받으므로 아래는 아직 제품 구현이 아니다.

| 우선순위 | Gap | 완료 기준 |
| --- | --- | --- |
| P0 | raw wrapper 입력 조합 | `skill`, `mention`, text와 `outputSchema`를 generated type 경계 안에서 전달한다. |
| P0 | ModelingRecipe rendering | arguments와 source 참조를 검증하고 결정적으로 turn input으로 만든다. |
| P0 | ModelingRun receipt | recipe/version·arguments·source·opaque execution reference·상태·결과 참조를 최소 필드로 연결한다. |
| P0 | StatePatch 변환 | 구조화 결과를 EvidenceRef가 포함된 StatePatch 후보로 검증한다. |
| P1 | 진행 중 기능별 제어 | 실제 UX case가 요구할 때 steer, interrupt와 server request response를 각각 검증한다. |
| P2 | session lifecycle 정책 | 실제 continuity·recovery 문제가 확인될 때 retention, resume과 rollover를 결정한다. |

구현된 Runtime Harness의 정확한 범위와 package 책임은 [Runtime Harness 구현 지도](runtime-harness-implementation-map.md)가 소유한다. 이 문서는 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)의 제품 연결 결정을 설명하며, raw capability의 저수준 근거는 [context delivery 조사](../spikes/codex-app-server-context-delivery/research.md)에 둔다.
