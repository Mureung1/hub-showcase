# Codex-native 제품 작업 조합

작성일: 2026-07-11

분류: 활성

성숙도: 채택

## 목적

이 문서는 AY-PLE의 제품 기능을 official SDK 기반 Codex App Server 경로에 어떻게 얇게 연결하는지 설명한다. 도메인 용어는 [CONTEXT.md](../../CONTEXT.md), 조합 결정은 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)을 따른다. AY-PLE는 별도 Agent workflow engine을 만들지 않고 native Codex 입력과 제어를 조합하며, 앱은 학기 상태와 검토 권한을 소유한다.

## 경계

| AY-PLE 의미 | Codex realization | 경계 |
| --- | --- | --- |
| 활성 SemesterWorkspace | 새 thread의 `thread/start.cwd`; 재사용 thread는 기존 `cwd`가 같은지 검증 | `turn/start.cwd`는 해당 turn 이후에도 유지된다. MVP는 workspace가 다르면 새 thread를 시작하며, cross-workspace override는 명시적인 후속 UX 없이는 사용하지 않는다. |
| SourceSelection | `mention` UserInput variant의 `name`, `path` 목록 | 명시적인 작업 입력이지 filesystem permission boundary가 아니다. |
| ModelingRecipe의 Skill | `skill` UserInput variant의 `name`, `path` | native Skill protocol을 사용하며 AY-PLE 전용 plugin 체계를 만들지 않는다. |
| ModelingRecipe의 prompt template과 ModelingInvocation arguments | `text` UserInput variant의 `text`, `text_elements` | Skill에 별도 structured arguments 채널이 없으므로 검증한 값을 text에 렌더링한다. |
| ModelingRecipe의 구조화 결과 계약 | `turn/start.outputSchema` | Codex 최종 응답을 앱이 검증 가능한 형태로 제한한다. |
| ModelingInvocation 실행 | 새 `thread/start` 또는 기존 `thread/resume` 뒤 필수 `threadId`를 넣은 `turn/start` | `turn/start` 자체가 ad-hoc thread를 만들지 않는다. 실행 시도마다 하나의 ModelingRun을 만든다. |
| ModelingRun | opaque execution reference와 검증된 결과를 연결하는 앱 소유 receipt | raw thread/turn identifier와 protocol stream을 제품 계약으로 노출하지 않는다. |
| 진행 중 정정 | 필요할 때 `turn/steer` | 정확한 active turn과 사용자 의도가 확인된 기능에만 사용한다. |
| 중단 | 필요할 때 `turn/interrupt` | 실제 terminal 결과를 확인하기 전 성공으로 표시하지 않는다. |
| 실행 권한·운영 입력 | 원래 server request에 대한 typed response | 학업 Review나 UserConfirmation과 합치지 않는다. |
| AY 작업 활동 | 선택한 `item`·`turn` observation | 진행 설명이며 그 자체가 EvidenceRef나 SemesterModel 사실은 아니다. |

raw `threadId`, `turnId`, `itemId`, `requestId`와 protocol message는 Codex 통합 내부에 둔다. 제품에는 기능을 복구하거나 결과를 연결하는 데 필요한 correlation과 검증된 의미만 전달한다.

## ModelingRecipe, ModelingInvocation과 ModelingRun

ModelingRecipe의 정확한 정의는 [CONTEXT.md](../../CONTEXT.md)가 소유한다. 이 문서는 위 경계 표처럼 Recipe의 각 요소가 native Codex input으로 번역되는 방식만 설명한다.

학생에게 보이는 action은 Recipe를 선택하고 입력을 모은다. 앱은 이 값들을 결합해 일회성 ModelingInvocation을 만든 뒤 Codex 통합에 전달한다.

```text
ModelingRecipe version
+ validated arguments
+ SourceSelection
+ active SemesterWorkspace context
→ ModelingInvocation
→ Codex integration이 thread 선택과 native input 번역
→ ModelingRun 생성(실행 시도 등록)
→ turn/start(threadId)
→ terminal 상태와 validated structured result 연결
→ StatePatch 후보
```

ModelingInvocation은 영속 receipt가 아니다. 앱이 실행 시도를 등록할 때 ModelingRun을 먼저 만들고, native 호출에서 얻은 correlation과 terminal 결과를 여기에 연결한다. Retry는 같은 Invocation 입력을 다시 사용하더라도 새 Run을 만든다. Run의 기록 계약은 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)이 소유한다. raw thread/turn identifier는 Codex 통합 내부에서만 해석하며 렌더링한 전체 prompt나 raw protocol stream을 제품 감사 기록으로 복사하지 않는다.

## Thread 사용 경계

| 항목 | MVP 결정 |
| --- | --- |
| 기본 thread | 일반적인 Codex 사용처럼 ad-hoc으로 시작한다. |
| 후속 대화 | 같은 작업을 이어가는 명시적 대화라면 기존 native thread를 계속 사용할 수 있다. |
| 고정 topology | 학기별·과목별·ModelingRun별 thread cardinality를 정하지 않는다. |
| workspace 재사용 | 기존 thread의 sticky `cwd`가 현재 SemesterWorkspace와 같을 때만 재사용한다. 다르면 새 thread를 시작한다. |

Runtime home, native instructions·Skills discovery와 Memory policy는 [Codex Runtime 격리](codex-runtime-isolation.md)가 소유한다.

## 구현과의 관계

Pinned official source와 native protocol은 `UserInput`의 `text`, `skill`, `mention`과 `TurnStartParams.outputSchema` capability를 제공한다. 각 variant의 실제 wire shape는 official source와 runtime pin을 따라 검토하며 위 표의 표기는 제품 mapping을 위한 축약 설명이다. 삭제된 legacy generated method inventory를 current source of truth로 사용하지 않는다.

현재 `CodexChatRuntime`과 Chat Shell은 native thread, text turn, AgentMessage stream, terminal과 interrupt까지 제공하지만 Skill·mention·`outputSchema`를 조합한 `ModelingInvocation` 번역이나 `ModelingRun` 생성은 구현하지 않는다. Current package 책임과 확인된 gap은 [Codex Chat 구현 지도](codex-chat-implementation-map.md)와 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md)가 소유하고 작업 순서와 상태는 [개발 백로그](../product/ay-ple-development-backlog.md)에서 관리한다. Raw capability의 저수준 근거는 [context delivery 조사](../spikes/codex-app-server-context-delivery/research.md)에 둔다.
