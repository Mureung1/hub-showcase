# 014 — 기존 Host 제거와 선별 재사용 계획을 확정한다

## Wayfinder ticket

- Type: task
- State: open
- Blocked by: [기존 evidence와 재설계 기준점을 보존한다](001-preserve-evidence-and-establish-fixed-point.md), [기존 Host consumer와 compatibility constraint를 감사한다](002-audit-host-consumers-and-compatibility.md), [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md), [Native identity authority와 lifetime을 결정한다](009-decide-identity-and-authority.md), [Thread·turn concurrency 정책을 결정한다](010-decide-concurrency-policy.md), [Event delivery와 transcript recovery model을 결정한다](011-decide-delivery-and-recovery-model.md), [Connection loss와 unknown outcome 정책을 결정한다](012-decide-connection-and-unknown-outcome-policy.md), [Source conformance verification matrix를 결정한다](013-decide-source-conformance-verification.md), [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)

## Question

Current integration history와 native Codex app-data를 훼손하지 않으면서 기존 `HeadlessCodexClientHost` Interface·implementation·root export·전용 fake/test oracle과 ignored stale `dist/` output을 어떤 순서로 forward-remove할 것인가? ADR 0008의 replacement decision 자체는 [ADR 0008을 대체할 architecture decision을 기록한다](015-record-superseding-architecture-decision.md)에 남기고, old spec/tickets·package README·implementation map·backlog/index를 code removal/replacement와 함께 정합화할 staged migration plan은 무엇인가?

기존 layout·transport·schema·cleanup asset은 three-root preparation, `CodexAppServerConnection`의 child·JSONL·schema·exact demux·cleanup, `CodexConversationRuntime`의 채택된 native lifecycle·correlation으로 목적지를 명시해 선별 이식한다. Host generation/ref/global event와 전용 oracle policy는 compatibility target으로 보존하지 않고, product mapping은 runtime gate 뒤 `AYPLE adapter`만 소유한다. Method taxonomy는 decisions JSON을 먼저 migration하고 generated inventory를 재생성하며 `client-host` claim과 global adoption을 row별로 재검토한다. Generated inventory는 직접 수정하지 않고, destructive generation gap을 해결한 안전한 command만 사용한다.

## Answer

Ticket을 resolve할 때 작성한다.
