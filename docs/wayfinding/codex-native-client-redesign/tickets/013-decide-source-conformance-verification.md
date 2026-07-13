# 013 — Source conformance verification matrix를 결정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), [commandExecution approval의 첫 round-trip을 결정한다](017-decide-command-execution-approval-round-trip.md)

## Question

Generated schema, pinned Rust source/tests, deterministic unit test, fake child interleaving과 package-owned binary live probe 중 어떤 oracle이 T0/T0.1의 각 runtime contract를 증명하며, end-to-end product tracer를 runtime proof와 어떻게 분리할 것인가? 일반 PR과 Codex pin upgrade에서 어떤 Source·Standards·Spec 조합을 필수 gate로 삼아 submodule을 runtime·일상 build dependency로 만들지 않으면서 external stdio port의 의미를 검증할 것인가?

Package-owned [`codex-method-decisions.json`](../../../../packages/runtime-codex/codex-method-decisions.json)을 tracer coverage ledger로 확장해 method별 tracer, semantic owner, required·tolerated·unsupported·deferred 상태, integration/adoption, source/test evidence, fake/live oracle와 verification 상태를 어떤 machine-readable schema로 기록할 것인가? 현재 `client-host` taxonomy와 destructive-before-version-check generation gap을 어떻게 교체하고, decisions source에서 generated [method inventory](../../../architecture/codex-app-server-method-inventory.md)를 안전하고 deterministic하게 재생성·drift-check할 것인가? Inventory는 ordering·identity authority의 근거로 사용하지 않는다.

## Answer

Ticket을 resolve할 때 작성한다.
