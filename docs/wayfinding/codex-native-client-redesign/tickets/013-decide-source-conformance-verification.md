# 013 — Source conformance verification matrix를 결정한다

## Wayfinder ticket

- Type: research
- State: open
- Blocked by: tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md, tickets/010-decide-concurrency-policy.md, tickets/011-decide-delivery-and-recovery-model.md, tickets/012-decide-connection-and-unknown-outcome-policy.md

## Question

Generated schema validation, deterministic unit test, fake child interleaving, pinned source·test citation, package-owned binary live probe와 end-to-end product tracer 중 어떤 oracle이 각 contract를 증명하고, 일반 PR과 Codex pin upgrade에서 어떤 조합을 필수 gate로 삼아 submodule을 runtime·일상 build dependency로 만들지 않으면서 source conformance를 유지할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
