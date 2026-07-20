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
| StatePatch Review의 answer carrier | exact Plan mode의 built-in `request_user_input`과 같은 native Turn continuation | App이 exact active patch binding을 검증한 답변만 반환한다. Native answer는 UserConfirmation이나 apply authority가 아니다. |
| UserConfirmation과 apply | App-owned StatePatch persistence와 decision reconciliation | Settled product decision에서 허용한 apply만 confirmed SemesterModel을 바꾼다. 일반 Plan clarification과 unsettled 수정 요청은 학업 상태를 바꾸지 않는다. |
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

ModelingInvocation은 영속 receipt가 아니다. 앱이 실행 시도를 등록할 때 ModelingRun을 먼저 만들고, native 호출에서 얻은 correlation과 terminal 결과를 여기에 연결한다. Retry는 같은 Invocation 입력을 다시 사용하더라도 새 Run을 만든다. Run의 기록 계약은 [ADR 0007](../adr/0007-use-native-codex-composition-for-product-actions.md)이 소유한다. raw thread/turn identifier는 Codex 통합 내부에서만 해석하며 렌더링한 전체 prompt나 raw protocol stream을 제품 감사 기록으로 복사하지 않는다.

## StatePatch, Review와 UserConfirmation

StatePatch lifecycle은 ModelingRecipe 실행 receipt와 독립적이다. Skill을 실행한 native Turn뿐 아니라 일반 Chat Turn도 `propose_state_patch`를 호출할 수 있으며, 한 ModelingRun에서 StatePatch가 없거나 여러 개 생길 수 있다. StatePatch는 필요한 경우에만 ModelingRun이나 native 실행의 opaque origin provenance를 연결한다.

```text
Skill 또는 일반 Chat Turn
→ propose_state_patch(canonical MCP input)
→ pending StatePatch와 stable patch identity
→ Plan request_user_input으로 같은 native Turn에서 Review answer 전달
→ 수락: settled UserConfirmation → confirmed SemesterModel apply outcome
→ 거절: settled UserConfirmation → no-apply
→ 수정 요청: unsettled feedback → same-Turn replacement StatePatch 제안 → 이전 patch supersede → Review 반복
```

`request_user_input`은 conversation continuation을 운반할 뿐 product apply authority가 아니다. MCP elicitation도 이 confirmation 경로에 사용하지 않는다. 답변 전에 Browser·Server/runtime continuity를 잃으면 native Turn을 `interrupted`로 끝내고 confirmed SemesterModel을 바꾸지 않는다. 자동 retry하지 않으며, 사용자가 명시적으로 retry할 때 새 action을 시작한다. Pending StatePatch를 receipt로 저장할 수는 있지만 first vertical은 원래 native prompt의 reload·restart hydration이나 며칠 뒤 Review를 보장하지 않는다. 반대로 App이 exact patch binding을 검증해 UserConfirmation과 apply outcome을 정산한 뒤에는 그 product state가 authoritative하며, Codex response가 유실돼도 같은 patch를 다시 적용하지 않는다.

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

현재 exact official Python SDK와 production wheel, private bridge와 Node `CodexProductCapableRuntime`에는 optional `SkillInput`·bounded `TextInput` product Turn, thread-scoped workspace/private MCP, product permission, Plan·MCP activity와 deferred typed `request_user_input` answer/cancel seam이 구현돼 있다. Server는 app-issued selected-source context에 결합한 exact `propose_state_patch`, workspace-local pending `StatePatch`, same-Turn exact Review binding과 accepted/rejected `UserConfirmation` transaction을 소유한다.

First Assignment action coordinator는 exact Recipe·arguments·SourceSelection admission 뒤 appDataRoot의 byte-preserving source snapshot과 workspace scratch를 먼저 준비하고 source/store/revision을 재검증한다. 그 다음 requested Skill path·version과 source digest를 포함한 durable `ModelingRun`·guard를 current v2 product store의 한 transaction에 기록한 뒤, lease를 유지한 채 managed Skill과 private hosted MCP를 native product Turn에 주입한다. Commit 전 staging·검증 fault는 strict rollback하며 Run이나 native start를 만들지 않고, crash-orphaned workspace scratch와 연결된 staging은 next open이 sole store 기준으로 정리한다. Public bootstrap은 Account readiness와 settled-only history를 safe projection하고, action/Chat/Review/interrupt HTTP는 Agent message·Plan delta를 포함한 curated activity만 내보내며 native identity, token, absolute path와 raw MCP payload를 숨긴다. Assignment lifecycle frame은 Run과 settled validation을 필수로 갖고 Chat lifecycle frame은 두 값을 금지한다. Product service lease는 durable settlement·cleanup까지 유지된다. Terminal cleanup이 bounded deadline을 넘기거나 실패하면 guard를 유지하고 Runtime을 닫으며, Account read와 compatibility Chat을 closing Runtime에서 배제해 recovery 전 새 action을 막는다. Deterministic HTTP integration은 product commit이 native answer보다 먼저 끝나는 순서, Run settlement, explicit retry, free-form Chat의 no-Run 경계와 reopen recovery를 검증한다. 이 v2는 ticket 009 전 pre-release current shape이며, pre-006 v2 bytes를 자동 migration·rewrite하지 않는다.

아직 구현되지 않은 경계는 Browser action·Review UI, 수정 요청의 replacement, 더 넓은 continuity loss recovery와 final actual-child/live-provider conformance다. Current four text tracer routes는 별도 compatibility path로 유지된다. [First Assignment Product-bound Codex Companion spec](../specs/2026-07-19-first-assignment-product-bound-companion.md)과 implementation tickets가 exact adaptation contract를 소유한다. Current package 책임과 확인된 gap은 [Codex Chat 구현 지도](codex-chat-implementation-map.md)와 [codex-chat-runtime README](../../packages/codex-chat-runtime/README.md), 작업 순서와 상태는 [개발 백로그](../product/ay-ple-development-backlog.md)가 소유한다. Raw capability의 저수준 근거는 [context delivery 조사](../spikes/codex-app-server-context-delivery/research.md)에 둔다.
