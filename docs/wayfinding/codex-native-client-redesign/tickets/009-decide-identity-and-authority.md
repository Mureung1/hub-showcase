# 009 — Native identity authority와 lifetime을 결정한다

## Wayfinder ticket

- Type: grilling
- State: claimed
- Blocked by: [첫 tracer와 module seam을 선택한다](008-choose-first-tracer-and-module-seams.md)

## Question

`CodexAppServerConnection`이 exact opaque wire identity를 보존하고 `CodexConversationRuntime`의 per-thread owner가 T0에 채택된 response·notification의 native `ThreadId`·`TurnId`·item identity를 상관한다는 baseline에서, type branding·authority convergence·lifetime과 terminal 뒤 identity 보존 범위를 어떻게 정할 것인가? `thread/resume`·`thread/read`·replay identity는 해당 method tracer가 채택될 때만 확장하고, upstream이 정의하지 않은 duplicate·lineage 의미를 일반화하지 않는다.

Product/browser ref remapping과 connection generation은 runtime identity를 재정의하지 않으며 [첫 AY-PLE adapter tracer와 runtime readiness gate를 결정한다](018-decide-first-ayple-adapter-tracer.md)가 실제 use case 증거로 결정한다. Answer는 영향받는 inventory row, tracer, semantic owner, lifecycle fact/source-test evidence와 아직 구현 integration 승격이 아닌지를 함께 기록한다.

## Answer

Ticket을 resolve할 때 작성한다.
