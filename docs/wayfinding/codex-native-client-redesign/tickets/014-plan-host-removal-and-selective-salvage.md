# 014 — 기존 Host 제거와 선별 재사용 계획을 확정한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: tickets/001-preserve-evidence-and-establish-fixed-point.md, tickets/002-audit-host-consumers-and-compatibility.md, tickets/008-choose-first-tracer-and-module-seams.md, tickets/009-decide-identity-and-authority.md, tickets/010-decide-concurrency-policy.md, tickets/011-decide-delivery-and-recovery-model.md, tickets/012-decide-connection-and-unknown-outcome-policy.md, tickets/013-decide-source-conformance-verification.md

## Question

Current integration history와 native Codex app-data를 훼손하지 않으면서 기존 `HeadlessCodexClientHost` Interface·implementation·root export·전용 fake/test oracle과 ignored stale `dist/` output을 어떤 순서로 forward-remove할 것인가? ADR 0008의 replacement decision 자체는 Ticket 015에 남기고, old spec/tickets·package README·implementation map·backlog/index·method decision taxonomy/manifest/generated inventory의 Host claim을 code removal/replacement와 함께 정합화할 staged migration plan은 무엇인가? 기존 implementation ticket `docs/tickets/2026-07-12-headless-codex-client-host/001-product-runtime-layout-preflight.md`와 `002-bidirectional-stdio-transport.md`의 layout·transport·schema·cleanup에서 새 Interface 뒤로 이식할 primitive와 폐기할 policy를 어떻게 구분할 것인가?

## Answer

Ticket을 resolve할 때 작성한다.
