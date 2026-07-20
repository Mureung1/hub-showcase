# 004 — 첫 Assignment vertical의 runtime sufficiency envelope를 확정한다

## Wayfinder ticket

- Type: grilling
- State: resolved
- Blocked by: [Account Readiness와 config lifecycle의 adoption surface를 확인한다](003-account-config-adoption-surface.md)

## Question

`explicit SemesterWorkspace + TXT SourceSelection → ModelingInvocation → ModelingRun → EvidenceRef가 연결된 Assignment StatePatch → Review·UserConfirmation → 다시 열 수 있는 SemesterModel` 대표 흐름을 제품 구현 전에 안전하게 실행했다고 판정하려면 어떤 observable runtime outcome과 failure scenario가 반드시 닫혀야 하며, 어떤 일반 Chat capability는 실제 product need가 생길 때까지 deferred해야 하는가?

## Resolution evidence

- Product Brief·ADR 0007과 사용자가 승인한 representative journey
- Account readiness, explicit workspace·`cwd`, Skill·mention·`outputSchema`, native acceptance·terminal, interrupt·unknown outcome, process crash·bounded shutdown과 retry 후보의 `required | product-discovery | deferred` 판정
- Runtime·native execution state와 `ModelingRun`·`StatePatch`·`SemesterModel` product state의 owner 및 persistence 경계
- Browser reload·Server restart가 transcript가 아니라 first vertical outcome에 미치는 representative failure scenario
- General multi-conversation, catalog, two-client, full approval center와 replay infrastructure의 명시적 non-goal
- Module·Interface·DB schema·UI mechanism을 정하지 않은 falsifiable runtime sufficiency 문장과 005–006이 검증하고 008이 disposition할 exact handoff

## Answer

### 2026-07-19 후속 범위 정정

[Codex 실행 권한과 AY-PLE 제품 확인 경계 정정](../assets/codex-execution-permission-boundary.md)에 따라 아래 `read-only extraction`은 Review·`UserConfirmation` 전까지 결과를 proposal로 유지하고 사용자 자료와 확인된 `SemesterModel`을 바꾸지 않는 제품 효과로 해석한다. Codex approval·sandbox는 별도 native 실행 권한 경계이며, `Sandbox.read_only`, no-network와 unexpected-request reject를 first-vertical product invariant로 묶었던 이전 해석은 superseded다.

### 채택한 책임 경계

첫 Assignment vertical의 runtime sufficiency는 독립 general Chat application의 완성도가 아니라 product-bound academic action을 안전하고 반복 가능하게 실행하는 observable contract로 판정한다.

Runtime 책임은 explicit workspace와 semantic input으로 native 실행을 시작하고, product-owned `ModelingRun`이 연결할 execution correlation과 authoritative terminal, schema-valid structured result 또는 사실에 맞는 failure·unknown outcome을 반환하는 지점에서 끝난다. `StatePatch` 생성, Review, `UserConfirmation`, `SemesterModel` 반영과 재열기는 AY-PLE product layer가 소유한다. 전체 representative trace는 두 계층의 연결을 검증하지만 Review·제품 저장 실패를 Codex runtime failure로 분류하지 않는다.

### Required runtime envelope

| Surface | Required observable outcome | 이번 결정에서 고정하지 않는 것 |
| --- | --- | --- |
| Account Readiness | 실행 직전에 adopted Codex account가 ready인지 확인하고, ready가 아니면 native turn을 시작하지 않은 채 명시적인 `not ready` 결과를 반환한다. | 자체 account center, 완전한 OAuth·logout·account switching UX, multi-provider abstraction과 모든 account notification의 실시간 projection |
| Workspace | Product가 하나의 explicit `SemesterWorkspace`를 전달하고 native 실행의 `cwd`가 그 workspace와 일치한다. Missing·invalid workspace는 실행 전에 실패하며 `process.cwd()`나 다른 workspace로 fallback하지 않는다. | Chooser·최근 목록·registry와 multi-workspace UX |
| Semantic input | 사용자가 선택한 source 목록, versioned Recipe instructions·검증된 arguments와 structured output contract를 전달해 검증 가능한 결과를 받는다. | Exact `skill`·`mention`·`outputSchema` variant 또는 adaptation mechanism. 005가 official seam을 먼저 조사한다. |
| Acceptance·settlement | Native acceptance 전 실패와 accepted execution을 구분한다. Accepted execution은 authoritative terminal 또는 명시적인 unknown outcome으로 한 번만 정산하며 success·failure를 추정하거나 자동 재시도하지 않는다. | Exact local status taxonomy와 settlement mechanism |
| Progress·interrupt | 사용자가 실행이 preparing·running·stopping·settled 중 어느 고수준 단계인지 알고, accepted execution을 명시적으로 중단할 수 있다. Interrupt acknowledgement를 terminal로 합성하지 않는다. | `turn/steer`, 상세 command·tool·plan activity, token·model·rate-limit toolbar |
| Process lifecycle | 하나의 supported start가 ready·not-ready로 수렴하고 child crash를 사실대로 정산한다. Shutdown은 bounded하게 끝나 process를 reap하며 restart 뒤 새 action을 시작할 수 있다. | Active turn continuation, transcript 자동 복원, packaged Desktop·signing·updater와 background daemon 상시 가용성 |
| Honest recovery | 정산된 `ModelingRun`, pending `StatePatch`, `UserConfirmation`과 `SemesterModel`은 product layer에서 다시 연다. In-flight 결과를 확인하지 못하면 unknown outcome을 드러내고 사용자 retry는 새 `ModelingRun`으로 기록한다. | Live stream 재접속, transcript replay, cursor·event journal과 같은 native thread 자동 resume |
| Product mutation boundary | 첫 vertical의 structured result는 `StatePatch` proposal이며 Review·`UserConfirmation` 전에는 사용자 자료와 확인된 `SemesterModel`을 바꾸지 않는다. | Exact Codex sandbox·network·approval profile과 native request UI. 008이 제품 확인과 분리해 disposition한다. |

Read-only extraction은 영구 제품 제약이 아니라 첫 목표지점의 product-state admission boundary다. 후속 action이 write·network를 실제로 요구하면 native Codex permission과 AY-PLE mutation preview·Review·`UserConfirmation`을 각각 결정하고, 어느 한 승인을 다른 승인으로 재사용하지 않는다.

### Runtime과 product gate의 분리

Runtime sufficiency는 Browser와 분리된 headless server-side integration seam에서 먼저 증명한다. Current 네 `/api/codex-chat/*` route는 tracer evidence이지 first vertical의 target product API가 아니다. Browser-safe `ModelingInvocation` boundary와 3-pane composition은 runtime gate가 통과한 뒤 product vertical spec이 결정한다.

Runtime gate 통과는 전체 제품 완료를 뜻하지 않는다. 이후 Browser와 product adapter, 자료 선택, `StatePatch`, Review, `UserConfirmation`, `SemesterModel` persistence를 연결한 별도 product E2E를 반드시 통과해야 한다.

### Representative failure·recovery scenario

| Scenario | Required result |
| --- | --- |
| Account가 not ready다 | Native execution을 시작하지 않고 actionable not-ready를 반환한다. Exact login UX는 chosen surface가 소유한다. |
| Workspace가 missing·invalid다 | 다른 `cwd`로 fallback하지 않고 acceptance 전에 실패한다. |
| Native acceptance 전에 요청이 실패한다 | 실행된 작업이나 accepted `ModelingRun` outcome으로 표시하지 않는다. Product receipt timing은 product spec이 정한다. |
| Accepted execution이 completed·failed·interrupted로 끝난다 | Native semantics를 보존한 authoritative terminal을 execution correlation과 함께 한 번 반환한다. |
| Accepted execution 중 process·transport를 잃는다 | 확인되지 않은 success·failure를 합성하지 않고 unknown outcome으로 수렴한다. |
| 사용자가 interrupt를 요청한다 | Acknowledgement 뒤 authoritative terminal 또는 unknown outcome까지 기다리며 자동 retry하지 않는다. |
| Browser reload 또는 Server restart가 발생한다 | Settled product state는 product layer에서 다시 열고 in-flight loss는 honest unknown으로 표시한다. Transcript continuity는 요구하지 않는다. |
| 사용자가 retry한다 | 이전 accepted execution을 재사용하거나 덮어쓰지 않고 새 `ModelingRun`으로 기록한다. |
| Runtime을 종료하고 다시 시작한다 | Bounded cleanup 뒤 orphan process 없이 fresh action을 시작할 수 있다. |

### Reproducible verification gate

한 번의 manual green은 sufficiency evidence가 아니다. 동일한 versioned TXT fixture, Recipe input과 output contract를 사용해 다음 세 층을 반복 가능하게 검증한다.

| Evidence layer | Required proof |
| --- | --- |
| Deterministic contract trace | Semantic input mapping, acceptance·terminal, interrupt, crash·unknown, 중복 retry 방지를 fake로 자동 검증한다. |
| Exact pinned actual-child trace | Bundled Python → official SDK → exact App Server의 readiness, native identity, settlement와 bounded shutdown을 provider-free 환경에서 자동 검증한다. |
| Opt-in live-provider representative trace | 명시적으로 provision한 격리 auth와 fresh isolated runtime·workspace roots에서 실제 두 TXT와 Assignment output contract를 사용해 schema-valid source-linked result까지 수동 복구 없이 3회 연속 통과한다. |

하나의 문서화된 command가 준비·실행·검증·cleanup을 반복할 수 있어야 한다. 모델의 정확한 문장은 고정하지 않고 schema validity, 선택 source reference, native acceptance·terminal correlation, process-tree cleanup과 이전 실행 state 비혼입을 검증한다. Credential이 없으면 pass나 단순 skip이 아니라 명시적인 blocked로 보고한다. 3회는 통계적 신뢰성 주장이 아니라 우연한 1회 성공과 state leakage를 잡기 위한 초기 repeatability 기준이며, flaky evidence가 나오면 반복 수를 늘리기 전에 원인을 제거한다.

### Required, product-discovery와 deferred

| 판정 | Capability |
| --- | --- |
| Required before product implementation | 최소 Account Readiness, explicit workspace·semantic input, acceptance·authoritative settlement, high-level progress·interrupt, bounded lifecycle, honest recovery, proposal-only product mutation boundary와 reproducible three-layer gate |
| Product-discovery | Exact `skill`·`mention`·`outputSchema` 또는 adaptation, login UX와 post-login convergence, native state re-read reconciliation, `turn/steer`, 실제 action이 요구하는 Codex sandbox·network·approval profile과 pending request, Browser-safe product API와 3-pane composition |
| Deferred until confirmed need | Generic multi-conversation catalog, rename·archive·pagination, transcript persistence·replay, two-client synchronization, full approval center, detailed activity·status toolbar와 packaged Desktop lifecycle |

### Falsifiable outcome

> 동일한 versioned TXT fixture와 Assignment output contract를 fresh isolated roots에서 한 command로 반복 실행했을 때 deterministic·exact actual-child gate가 자동으로 통과하고, live-provider trace가 수동 복구 없이 3회 연속 schema-valid source-linked result, authoritative settlement와 process cleanup을 증명한다. 실패·중단·crash는 중복 실행이나 추정된 성공 없이 사실에 맞는 terminal 또는 unknown outcome으로 수렴한다.

005는 이 semantic envelope를 exact App Server·SDK·first-party surface와 current adapter에 대조했다. 006은 frozen current adapter와 가장 얇은 official seam으로 representative trace를 검증했고, 008이 current adapter와 별도 native permission 경계의 disposition을 확정한다.

### Domain vocabulary 판정

이번 결정은 기존 `SemesterWorkspace`, `SourceSelection`, `ModelingInvocation`, `ModelingRun`, `StatePatch`, `UserConfirmation`과 `SemesterModel` 경계를 사용했고 새 학업 domain term을 확정하지 않았다. `runtime sufficiency`, acceptance, terminal과 unknown outcome은 application·integration vocabulary이므로 `CONTEXT.md`를 변경하지 않는다.
