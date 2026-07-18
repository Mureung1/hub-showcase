# AY-PLE 첫 학업 vertical의 Codex runtime sufficiency

## Wayfinder state

- State: active
- Surface: local-wayfinder-map
- Next actor: /wayfinder

## Destination

첫 Assignment vertical의 대표 흐름에서 필요한 observable runtime contract를 확정하고, pinned Codex App Server·official Python SDK와 current integration adapter가 충족하는 범위 및 confirmed residual을 representative trace로 증명한다. First-party 구현은 conformance donor로만 사용한다. 일반 Chat application의 완성도를 선행조건으로 삼지 않고 product-bound Codex companion의 implementation-ready spec을 작성할 수 있는 상태에 도달한다.

## Notes

- 제품 문제와 첫 vertical은 [AY-PLE Product Brief](../../product/ay-ple-product-brief.md), 학업 작업의 native mapping은 [ADR 0007](../../adr/0007-use-native-codex-composition-for-product-actions.md)과 [Codex-native 제품 작업 조합](../../architecture/codex-native-product-composition.md)이 소유한다. 이 map은 그 product journey에서 역산한 runtime sufficiency와 current adapter disposition만 탐색한다.
- 대표 흐름은 `explicit SemesterWorkspace + TXT SourceSelection → ModelingInvocation → ModelingRun → EvidenceRef가 연결된 Assignment StatePatch → Review·UserConfirmation → 다시 열 수 있는 SemesterModel`이다. 제품 DB schema나 완성 UI를 먼저 설계하지 않고 이 흐름이 요구하는 실행 outcome을 관찰한다.
- 조사 순서는 `first vertical need → App Server owner → SDK public seam → first-party donor behavior → current adapter overlap → assumption delta → direct reuse | adapt | narrow port | confirmed residual`이다. First-party host를 별도 product/runtime 후보로 승격하지 않고 포괄 method inventory, broad OSS survey와 일반 Chat feature checklist를 만들지 않는다.
- Current `CodexChatRuntime`·Server·Chat Shell은 검증된 integration tracer이자 frozen adapter candidate다. 자동 survivor도 폐기 대상도 아니며, 첫 vertical contract에 대해 `keep | replace | delete`를 판정할 때까지 일반 Chat capability를 추가하지 않는다.
- Runtime sufficiency는 general Chat completeness와 다르다. Account Readiness, explicit `cwd`, Skill·mention·`outputSchema`, terminal·interrupt·unknown outcome, process settlement 같은 항목도 004에서 first vertical이 요구하는 observable outcome으로 채택된 범위만 조사한다.
- Native `Thread`·`Turn`·`Item`과 transcript는 Codex-owned execution state다. `ModelingRun`, `StatePatch`, `UserConfirmation`과 `SemesterModel`은 AY-PLE product state이며, generic transcript persistence를 학업 상태의 prerequisite나 source of truth로 사용하지 않는다.
- AY-PLE Review·`UserConfirmation`은 `StatePatch`를 확인된 `SemesterModel`로 반영할지 결정한다. Codex approval은 native command·file·network 실행 권한이고 sandbox는 기술 capability 경계다. 어느 한 결정도 다른 결정을 승인하지 않으며 같은 approval UI나 state로 합치지 않는다.
- First-vertical `read-only extraction`은 Review·`UserConfirmation` 전까지 결과를 proposal로 유지하고 사용자 자료와 확인된 `SemesterModel`을 바꾸지 않는 제품 효과다. 이 문구만으로 `Sandbox.read_only`, network 차단, `ApprovalMode.deny_all`이나 client-side reject를 채택하지 않는다.
- [001](tickets/001-foundation-capability-envelope.md)의 prior-art-first 규율은 유지하지만, 일반 rich-client surface 전체를 학업 product layer의 선행조건으로 둔 capability envelope는 이번 pivot의 destination을 더 이상 구속하지 않는다. [002](tickets/002-current-chat-overlap-audit.md)와 [003](tickets/003-account-config-adoption-surface.md)은 current baseline과 bounded adoption evidence로만 재사용한다.
- 기존 ticket·evidence와 외부 review의 durable link를 깨지 않기 위해 `docs/wayfinding/codex-chat-application-foundation/` 경로는 유지한다. Directory slug가 아니라 이 map의 title·Destination이 active effort 이름과 범위를 소유한다.
- [ADR 0006](../../adr/0006-separate-package-app-data-and-semester-workspace-roots.md), [ADR 0009](../../adr/0009-use-a-macos-first-local-web-app-product-path.md), [ADR 0011](../../adr/0011-reuse-official-codex-python-sdk-for-chat-shell.md)과 [ADR 0012](../../adr/0012-adopt-codex-chat-only-and-remove-legacy-runtime-surfaces.md)의 durable input은 006·008에서 유지한다. 특히 official SDK direct reuse, native identity와 supervised lifecycle은 다시 선택하지 않지만 current tracer의 fixed `deny_all + read_only`는 008의 disposition 대상이다.
- Exact pin의 source와 tests가 native semantics의 primary oracle다. 최신 official surface는 대안·upgrade evidence이지 current `0.144.4` capability를 자동 증명하지 않는다. Donor code를 실제 채택할 때만 exact version·license·provenance와 conformance evidence를 보존한다.
- 006 prototype은 throwaway evidence만 만들고 production runtime·제품 DB·3-pane UI를 구현하지 않는다. 첫 missing invariant가 current adapter 가설을 기각하기에 충분하면 더 큰 prototype으로 확장하지 않는다.
- 008이 원하는 native permission profile과 public seam을 먼저 정한 뒤 actual confirmed residual을 승인한 경우에만 022부터 precise decision·prototype ticket을 만들고 009의 blocker로 연결한다. Synthetic default `accept` 관찰만으로 reject patch ticket을 만들지 않으며 residual이 없으면 새 Module·state machine·API를 발명하지 않는다.
- 한 Wayfinder session에는 frontier ticket 하나만 claim하고 resolve한다. Map은 low-resolution index로 유지하고 ticket Answer와 cited asset이 상세 evidence를 소유한다.
- Wayfinder는 architecture decision과 prerequisite fact만 소유한다. Production code, product schema와 implementation ticket은 resulting spec 이후 `/to-tickets` 또는 `/implement`가 소유한다.

## Decisions so far

- [Codex Chat application foundation의 완료 envelope를 확정한다](tickets/001-foundation-capability-envelope.md) — Prior-art-first 규율은 유지하지만 일반 rich-client 전체를 제품 선행조건으로 둔 당시 envelope는 이번 product-bound pivot의 역사 evidence로만 남긴다.
- [현재 Chat implementation과 prior-art overlap을 기준선으로 고정한다](tickets/002-current-chat-overlap-audit.md) — Exact SDK/native 위의 custom supervision·4-route process-global 1/1·tab-memory tracer와 current ownership을 runtime sufficiency 비교 기준선으로 고정했다.
- [Account Readiness와 config lifecycle의 adoption surface를 확인한다](tickets/003-account-config-adoption-surface.md) — Native account lifecycle은 대부분 재사용할 수 있고 post-login convergence와 effective config assertion만 후보 gap이지만, first vertical이 요구하는 범위는 004에서 다시 admission한다.
- [첫 Assignment vertical의 runtime sufficiency envelope를 확정한다](tickets/004-first-assignment-runtime-envelope.md) — Headless semantic execution·authoritative settlement·bounded lifecycle·honest recovery와 proposal-only 제품 효과를 deterministic·exact-child·3회 live로 재현하고 별도 Browser product E2E로 이어간다.
- [First-vertical runtime contract와 existing Codex surface의 overlap을 확인한다](tickets/005-first-vertical-runtime-overlap.md) — Account·`cwd`·Skill·`outputSchema`·native settlement는 official seam에서 흡수하고 TXT path/link·repeatable gate를 probe했으며, default approval response는 제품 blocker가 아닌 실행 권한 disposition evidence로 재분류했다.
- [Current integration adapter로 first-vertical representative trace를 검증한다](tickets/006-current-adapter-representative-trace.md) — Deterministic·exact-child·3회 live trace가 source-linked extraction과 settlement를 충족했다. Historical harness의 default `accept` 관찰은 fixed bridge permission profile과 함께 008이 판정한다.

## Not yet specified

- 008이 current bridge의 fixed permission profile, native Codex 설정·사용자 선택과 current adapter survivor를 disposition한다. 그 선택 뒤 public seam에 actual gap이 남을 때만 022+가 소유하며, 채택된 SDK·local-web surface 자체는 재검토 대상으로 되돌리지 않는다.

## Out of scope

- [First-party surface가 general Chat client 없이 핵심 product flow를 닫는지 검증한다](tickets/007-first-party-surface-feasibility.md) — Official Python SDK와 macOS local-web path는 이미 채택됐으므로 first-party host·`codex exec`·hybrid를 별도 후보로 재검증하지 않고 conformance donor로만 사용한다.
- [Adopted stack의 two-client와 restart continuity를 검증한다](tickets/013-two-client-resume-probe.md) — 두 Browser client는 첫 vertical의 사용자 requirement가 아니므로 product need가 확인될 때 다시 admission한다.
- [Adopted stack의 accepted disconnect와 cold·live convergence를 검증한다](tickets/014-stream-recovery-transcript-contract.md) — generic transcript replay·late attach는 surface 선택과 실제 disconnect requirement 뒤로 미룬다.
- [Pending interaction·interactive approval의 adoption과 policy residual을 결정한다](tickets/015-sandbox-approval-policy.md) — 첫 vertical이 실제로 발생시키는 request family만 기능별로 다시 admission한다.
- [Adopted error·restart semantics와 남은 recovery residual을 결정한다](tickets/017-error-restart-reconciliation.md) — product operation 없이 general error taxonomy를 만들지 않는다.
- [Donor 기반 desktop Chat UI와 recovery·accessibility contract를 검증한다](tickets/020-desktop-chat-ui-contract.md) — 독립 desktop Chat UI 대신 첫 학업 vertical과 product-bound companion이 UI requirement를 소유한다.
- [Adoption evidence와 verification gate의 spec readiness를 승인한다](tickets/021-verification-spec-readiness.md) — broad Chat readiness gate는 새 009 first-vertical readiness gate로 대체한다.
- Multi-conversation catalog, rename·archive·pagination, generic transcript persistence, two-client synchronization, replay cursor·event journal, full approval center와 모든 App Server activity의 1:1 Browser projection
- 두 번째 Agent engine, generic runtime abstraction, multi-provider account UI, cloud sync, remote multi-user service와 mobile·small-screen 지원
- Production 구현, 제품 DB schema 확정, implementation ticket 작성과 GitHub Issue 게시

## Resulting spec

아직 없다. 모든 in-scope ticket이 해결되고 남은 fog가 사라지면 `/to-spec`이 이 절에 ready-for-ticketing spec을 연결한다.
