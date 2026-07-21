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
| SourceSelection | run-scoped `appDataRoot`에 snapshot한 자료의 Markdown link/path를 ModelingRecipe arguments와 함께 한 bounded `TextInput.text`에 렌더링 | 명시적인 작업 입력이지 filesystem permission boundary가 아니다. Original `RawMaterial` path를 native input이나 write target으로 직접 넘기지 않는다. |
| ModelingRecipe의 Skill | `skill` UserInput variant의 `name`, `path` | native Skill protocol을 사용하며 AY-PLE 전용 plugin 체계를 만들지 않는다. |
| ModelingRecipe의 prompt template과 ModelingInvocation arguments | 위 SourceSelection reference와 함께 전달하는 bounded `TextInput.text` | Skill에 별도 structured arguments 채널이 없으므로 검증한 값을 text에 렌더링한다. First Assignment vertical은 exact `SkillInput` 하나와 이 `TextInput` 하나를 사용한다. |
| Side effect 없는 ModelingRecipe의 final structured result | 필요한 후속 기능에서만 선택적으로 사용하는 `turn/start.outputSchema` | First Assignment vertical은 사용하지 않는다. `StatePatch` payload를 이 경로에 중복하지 않고 custom MCP input 한 곳을 정본으로 둔다. |
| StatePatch proposal contract | custom MCP `propose_state_patch` input schema | Tool input이 canonical proposal payload다. MCP는 proposal을 confirm·apply하거나 confirmed SemesterModel을 직접 바꾸지 않는다. |
| ModelingInvocation 실행 | 새 `thread/start` 또는 기존 `thread/resume` 뒤 필수 `threadId`를 넣은 `turn/start` | `turn/start` 자체가 ad-hoc thread를 만들지 않는다. 실행 시도마다 하나의 ModelingRun을 만든다. |
| ModelingRun | opaque execution reference, terminal·validation outcome과 필요한 경우 검증된 결과를 연결하는 앱 소유 receipt | raw thread/turn identifier와 protocol stream을 제품 계약으로 노출하지 않는다. StatePatch와 필수 FK나 1:1 lifecycle을 두지 않는다. |
| 진행 중 정정 | 필요할 때 `turn/steer` | 정확한 active turn과 사용자 의도가 확인된 기능에만 사용한다. |
| 중단 | 필요할 때 `turn/interrupt` | 실제 terminal 결과를 확인하기 전 성공으로 표시하지 않는다. |
| 실행 권한·운영 입력 | 원래 server request에 대한 typed response | 학업 Review나 UserConfirmation과 합치지 않는다. |
| StatePatch Review의 answer carrier | exact Plan mode의 built-in `request_user_input`과 같은 native Turn continuation | App이 exact active patch binding을 검증한 답변만 반환한다. 수정 요청은 bounded feedback과 Server-private fresh proposal key를 같은 Turn에 전달하며, native answer 자체는 UserConfirmation이나 apply authority가 아니다. |
| UserConfirmation과 apply | App-owned StatePatch persistence와 decision reconciliation | 수락만 confirmed SemesterModel을 바꾸고 거절은 durable no-apply로 정산한다. 일반 Plan clarification과 unsettled 수정 요청은 학업 상태를 바꾸지 않으며 valid replacement만 이전 patch supersede와 새 pending patch를 한 transaction으로 기록한다. |
| AY 작업 활동 | 선택한 `item`·`turn` observation | 진행 설명이며 그 자체가 EvidenceRef나 SemesterModel 사실은 아니다. |

raw `threadId`, `turnId`, `itemId`, `requestId`와 protocol message는 Codex 통합 내부에 둔다. 제품에는 기능을 복구하거나 결과를 연결하는 데 필요한 correlation과 검증된 의미만 전달한다.

Native `MentionInput`과 `outputSchema`가 존재한다는 사실은 first vertical의 채택 mapping이 아니다. First Assignment는 selected source snapshot의 Markdown link/path를 `TextInput`으로 전달하고, 실제 필요가 확인되기 전에는 별도 resource mention이나 final structured-result channel을 추가하지 않는다.

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
→ terminal 상태, validation outcome과 필요한 경우 validated structured result 연결
→ ModelingRun receipt 정산
```

ModelingInvocation은 영속 receipt가 아니다. 앱이 실행 시도를 등록할 때 ModelingRun을 먼저 만들고, native 호출에서 얻은 correlation과 terminal 결과를 여기에 연결한다. Explicit retry는 prior `interrupted | unknown` Run의 canonical Course·Recipe·arguments·source snapshot을 다시 검증하더라도 새 Run·native Turn·proposal key를 만들고 `retryOfRunId` ancestry로 연결한다. 한 prior Run에는 retry child를 하나만 허용하며 원래 receipt를 덮어쓰거나 자동 retry하지 않는다. Run의 기록 계약은 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)이 소유한다. raw thread/turn identifier는 Codex 통합 내부에서만 해석하며 렌더링한 전체 prompt나 raw protocol stream을 제품 감사 기록으로 복사하지 않는다.

## StatePatch, Review와 UserConfirmation

StatePatch lifecycle은 ModelingRecipe 실행 receipt와 독립적이다. Skill을 실행한 native Turn뿐 아니라 일반 Chat Turn도 `propose_state_patch`를 호출할 수 있으며, 한 ModelingRun에서 StatePatch가 없거나 여러 개 생길 수 있다. StatePatch는 필요한 경우에만 ModelingRun이나 native 실행의 opaque origin provenance를 연결한다.

```text
Skill 또는 일반 Chat Turn
→ propose_state_patch(canonical MCP input)
→ pending StatePatch와 stable patch identity
→ Plan request_user_input으로 같은 native Turn에서 Review answer 전달
→ 수락: settled UserConfirmation → confirmed SemesterModel apply outcome
→ 거절: settled UserConfirmation → no-apply
→ 수정 요청: unsettled feedback + fresh private proposal key → same-Turn replacement StatePatch 제안 → 이전 supersede + 새 pending atomic commit → Review 반복
```

`request_user_input`은 conversation continuation을 운반할 뿐 product apply authority가 아니다. MCP elicitation도 이 confirmation 경로에 사용하지 않는다. 같은 decision retry는 기존 product outcome을 반환하고, wrong binding·상충하거나 늦은 decision·stale base는 두 번째 confirmation이나 apply 없이 fail closed한다. Replacement 전에 terminal 또는 proposal validation failure가 발생하면 이전 patch를 `interrupted`로 끝내고 confirmation·apply를 만들지 않는다. 답변 전에 Browser·Server/runtime continuity를 잃으면 native Turn과 pending patch를 `interrupted`로 정산하고 confirmed SemesterModel을 바꾸지 않는다. Browser는 authoritative settled recovery만 다시 읽고 unanswered native prompt를 복원하지 않으며, 사용자가 prior canonical 입력으로 명시적으로 retry할 때만 새 Run과 Turn을 만든다. 반대로 App이 exact patch binding을 검증해 UserConfirmation과 apply outcome을 정산한 뒤에는 그 product state가 authoritative하다. 이후 native answer나 HTTP response가 유실되면 confirmed revision과 apply를 유지한 `continuation_lost`를 표시하고 같은 patch를 다시 적용하거나 retry CTA를 열지 않는다.

## Thread 사용 경계

| 항목 | MVP 결정 |
| --- | --- |
| 기본 thread | 일반적인 Codex 사용처럼 ad-hoc으로 시작한다. |
| 후속 대화 | 같은 작업을 이어가는 명시적 대화라면 기존 native thread를 계속 사용할 수 있다. |
| 고정 topology | 학기별·과목별·ModelingRun별 thread cardinality를 정하지 않는다. |
| workspace 재사용 | 기존 thread의 sticky `cwd`가 현재 SemesterWorkspace와 같을 때만 재사용한다. 다르면 새 thread를 시작한다. |

Runtime home, native instructions·Skills discovery와 Memory policy는 [Codex Runtime 격리](codex-runtime-isolation.md)가 소유한다.

## 구현과의 관계

Pinned official source와 official Python SDK는 `TextInput`, `SkillInput`, `MentionInput`, `TurnStartParams.outputSchema`, custom MCP tool lifecycle과 Plan mode의 built-in `request_user_input`을 제공한다. 각 capability의 실제 shape는 official source와 runtime pin을 따라 검토하며 위 표는 그중 first vertical이 채택한 조합만 표현한다. 삭제된 legacy generated method inventory를 current source of truth로 사용하지 않는다.

현재 runtime package는 optional `SkillInput`과 bounded `TextInput`을 product Turn으로 받고, Plan mode에 필요한 model·reasoning은 caller 설정이 아니라 first-party advertised default에서 해석한다. Server는 versioned Recipe·selected-source context를 이 Turn에 연결하고 `ModelingRun`·`StatePatch`·`UserConfirmation`·confirmed SemesterModel의 app-owned authority를 유지한다.

현재 지원 결과는 durable Run을 갖는 First Assignment와 Run-free Chat, registered source/revision guard, proposal-only MCP, app-owned 세 갈래 Review transaction, answer 전 continuity loss의 settled recovery·explicit retry, apply 뒤 continuation-loss·no-reapply와 학업 상태를 바꾸지 않는 ephemeral 일반 clarification이다. Browser에는 safe bootstrap과 curated activity·clarification, evidence-linked Review·replacement·recovery 결과만 projection하며 native identity, Server-private proposal key, credential, absolute path와 raw MCP payload를 노출하지 않는다. Package와 Server의 세부 동작은 [runtime README](../../packages/codex-chat-runtime/README.md)와 [Server README](../../apps/server/README.md)가 소유한다.

현재 미지원 결과는 workspace source/store recovery와 final actual-child/live-provider conformance다. Current four text tracer routes는 별도 compatibility path로 유지된다. 횡단 topology와 확인된 gap은 [Codex Chat 구현 지도](codex-chat-implementation-map.md), 작업 순서와 완료 상태는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다. Raw capability의 저수준 근거는 [context delivery 조사](../spikes/codex-app-server-context-delivery/research.md)에 둔다.
